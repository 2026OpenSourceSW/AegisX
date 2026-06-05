package shannon

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseMarkdownReport(t *testing.T) {
	t.Parallel()

	report := ParseMarkdownReport(`# Findings

## SQL injection
Severity: High
PoC executed successfully.

## Missing header
Severity: low
`)

	assert.Len(t, report.Findings, 2)
	assert.Equal(t, "SQL injection", report.Findings[0].Title)
	assert.Equal(t, "high", report.Findings[0].Severity)
	assert.Equal(t, "low", report.Findings[1].Severity)
}
