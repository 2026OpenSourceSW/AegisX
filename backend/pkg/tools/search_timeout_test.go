package tools

import (
	"testing"
	"time"

	"pentagi/pkg/config"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQuickScanDuckDuckGoUsesToolConfigHTTPTimeout(t *testing.T) {
	cfg := quickSearchTimeoutConfig(t, 7)

	assert.Equal(t, 7*time.Second, (&duckduckgo{cfg: cfg}).timeout())
}

func TestQuickScanPerplexityUsesToolConfigHTTPTimeout(t *testing.T) {
	cfg := quickSearchTimeoutConfig(t, 8)

	assert.Equal(t, 8*time.Second, (&perplexity{cfg: cfg}).timeout())
}

func TestQuickScanSearxngFallsBackToToolConfigHTTPTimeout(t *testing.T) {
	cfg := quickSearchTimeoutConfig(t, 9)
	cfg.SearxngTimeout = 45

	assert.Equal(t, 9*time.Second, (&searxng{cfg: cfg}).timeout())
}

func TestQuickScanBrowserUsesToolConfigHTTPTimeout(t *testing.T) {
	cfg := quickSearchTimeoutConfig(t, 11)

	assert.Equal(t, 11*time.Second, browserToolTimeout(cfg))
}

func TestQuickScanSearchTimeoutHonorsExplicitDefaultSizedTimeout(t *testing.T) {
	cfg := quickSearchTimeoutConfig(t, 600)
	cfg.SearxngTimeout = 45

	assert.Equal(t, 600*time.Second, (&duckduckgo{cfg: cfg}).timeout())
	assert.Equal(t, 600*time.Second, (&perplexity{cfg: cfg}).timeout())
	assert.Equal(t, 600*time.Second, (&searxng{cfg: cfg}).timeout())
	assert.Equal(t, 600*time.Second, browserToolTimeout(cfg))
}

func TestSearchToolHTTPTimeoutKeepsNonQuickDefaults(t *testing.T) {
	t.Run("duckduckgo", func(t *testing.T) {
		cfg := &config.Config{HTTPClientTimeout: 600}
		assert.Equal(t, duckduckgoTimeout, (&duckduckgo{cfg: cfg}).timeout())
	})

	t.Run("perplexity", func(t *testing.T) {
		cfg := &config.Config{HTTPClientTimeout: 600}
		assert.Equal(t, perplexityTimeout, (&perplexity{cfg: cfg}).timeout())
	})

	t.Run("searxng provider default", func(t *testing.T) {
		cfg := &config.Config{
			HTTPClientTimeout: 600,
			SearxngTimeout:    45,
		}
		assert.Equal(t, 45*time.Second, (&searxng{cfg: cfg}).timeout())
	})

	t.Run("browser scraper", func(t *testing.T) {
		cfg := &config.Config{HTTPClientTimeout: 600}
		assert.Equal(t, browserScraperTimeout, browserToolTimeout(cfg))
	})
}

func TestSearchToolHTTPTimeoutUsesOperatorOverride(t *testing.T) {
	cfg := &config.Config{HTTPClientTimeout: 12}

	assert.Equal(t, 12*time.Second, (&duckduckgo{cfg: cfg}).timeout())
}

func TestSearchToolHTTPTimeoutAllowsNoTimeoutOverride(t *testing.T) {
	cfg := &config.Config{HTTPClientTimeout: 0}

	assert.Equal(t, time.Duration(0), (&duckduckgo{cfg: cfg}).timeout())
	assert.Equal(t, time.Duration(0), (&perplexity{cfg: cfg}).timeout())
	assert.Equal(t, time.Duration(0), (&searxng{cfg: cfg}).timeout())
	assert.Equal(t, time.Duration(0), browserToolTimeout(cfg))

	tool := NewBrowserTool(1, nil, nil, "", "", "", nil, browserToolTimeout(cfg))
	browserTool, ok := tool.(*browser)
	require.True(t, ok)
	assert.Equal(t, time.Duration(0), browserTool.scraperTimeout())
}

func quickSearchTimeoutConfig(t *testing.T, quickTimeout int) *config.Config {
	t.Helper()

	cfg := ToolConfigForTaskInput(&config.Config{
		HTTPClientTimeout:          600,
		QuickScanHTTPClientTimeout: quickTimeout,
	}, QuickScanTaskMarker+"\nhttps://owned.example.test")

	require.NotNil(t, cfg)
	return cfg
}
