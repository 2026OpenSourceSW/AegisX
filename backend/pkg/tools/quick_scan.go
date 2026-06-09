package tools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"pentagi/pkg/config"
	"pentagi/pkg/database"
)

const (
	QuickScanTaskMarker = "<빠른 점검>"

	defaultQuickScanBudgetMinutes            = "5~10분"
	defaultQuickScanMaxSubtasks              = 1
	defaultQuickScanTerminalToolTimeout      = 120
	defaultQuickScanHTTPClientTimeout        = 30
	defaultQuickScanMaxGeneralAgentToolCalls = 8
	defaultQuickScanMaxLimitedAgentToolCalls = 6
	defaultQuickScanDisablePostExploit       = true
)

type QuickScanProfile struct {
	Enabled                  bool
	Marker                   string
	BudgetMinutes            string
	MaxSubtasks              int
	TerminalToolTimeout      int
	HTTPClientTimeout        int
	MaxGeneralAgentToolCalls int
	MaxLimitedAgentToolCalls int
	DisableAgentPlanner      bool
	DisablePostExploit       bool
	Rules                    []string
}

func IsQuickScanTaskInput(input string) bool {
	firstLine, _, _ := strings.Cut(strings.TrimPrefix(input, "\ufeff"), "\n")
	firstLine = strings.TrimSpace(strings.TrimSuffix(firstLine, "\r"))
	return firstLine == QuickScanTaskMarker
}

func QuickScanProfileForTaskInput(cfg *config.Config, input string) QuickScanProfile {
	if !IsQuickScanTaskInput(input) {
		return SimpleScanProfileForTaskInput(input)
	}

	profile := QuickScanProfile{
		Enabled:                  true,
		Marker:                   QuickScanTaskMarker,
		BudgetMinutes:            defaultQuickScanBudgetMinutes,
		MaxSubtasks:              defaultQuickScanMaxSubtasks,
		TerminalToolTimeout:      defaultQuickScanTerminalToolTimeout,
		HTTPClientTimeout:        defaultQuickScanHTTPClientTimeout,
		MaxGeneralAgentToolCalls: defaultQuickScanMaxGeneralAgentToolCalls,
		MaxLimitedAgentToolCalls: defaultQuickScanMaxLimitedAgentToolCalls,
		DisablePostExploit:       defaultQuickScanDisablePostExploit,
		Rules: []string{
			"5~10분 안에 끝나는 범위로 점검합니다.",
			"긴 정밀 스캔, 무차별 대입, 권한 범위 밖 탐색은 수행하지 않습니다.",
			"post-exploitation, persistence, pivoting, tunneling, C2, mass scan, long directory brute force, Metasploit workflows are prohibited.",
			"확인하지 못한 항목은 추가 정밀 점검 필요로 표시합니다.",
		},
	}
	if cfg == nil {
		return profile
	}

	if cfg.QuickScanMaxSubtasks > 0 {
		profile.MaxSubtasks = cfg.QuickScanMaxSubtasks
	}
	if cfg.QuickScanTerminalToolTimeout > 0 {
		profile.TerminalToolTimeout = cfg.QuickScanTerminalToolTimeout
	}
	if cfg.QuickScanHTTPClientTimeout > 0 {
		profile.HTTPClientTimeout = cfg.QuickScanHTTPClientTimeout
	}
	if cfg.QuickScanMaxGeneralAgentToolCalls > 0 {
		profile.MaxGeneralAgentToolCalls = cfg.QuickScanMaxGeneralAgentToolCalls
	}
	if cfg.QuickScanMaxLimitedAgentToolCalls > 0 {
		profile.MaxLimitedAgentToolCalls = cfg.QuickScanMaxLimitedAgentToolCalls
	}
	profile.DisableAgentPlanner = cfg.QuickScanDisableAgentPlanner

	return profile
}

func ToolConfigForTaskInput(cfg *config.Config, input string) *config.Config {
	if cfg == nil || !IsBoundedScanTaskInput(input) {
		return cfg
	}

	quickScanCfg := *cfg
	quickScanCfg.QuickScanToolConfig = true
	quickScanCfg.TerminalToolTimeout = defaultSimpleScanTerminalToolTimeout
	if IsQuickScanTaskInput(input) {
		quickScanCfg.TerminalToolTimeout = defaultQuickScanTerminalToolTimeout
	}
	if cfg.QuickScanTerminalToolTimeout > 0 {
		quickScanCfg.TerminalToolTimeout = cfg.QuickScanTerminalToolTimeout
	}
	quickScanCfg.HTTPClientTimeout = defaultSimpleScanHTTPClientTimeout
	if IsQuickScanTaskInput(input) {
		quickScanCfg.HTTPClientTimeout = defaultQuickScanHTTPClientTimeout
	}
	if cfg.QuickScanHTTPClientTimeout > 0 {
		quickScanCfg.HTTPClientTimeout = cfg.QuickScanHTTPClientTimeout
	}
	return &quickScanCfg
}

func primaryExecutorToolNames(quickScanEnabled, askUserEnabled bool) []string {
	if quickScanEnabled {
		return []string{FinalyToolName, PentesterToolName, SearchToolName}
	}

	names := []string{
		FinalyToolName,
		AdviceToolName,
		CoderToolName,
		MaintenanceToolName,
		MemoristToolName,
		PentesterToolName,
		SearchToolName,
	}
	if askUserEnabled {
		names = append(names, AskUserToolName)
	}

	return names
}

func primaryExecutorBarrierNames(quickScanEnabled, askUserEnabled bool) []string {
	if quickScanEnabled || !askUserEnabled {
		return []string{FinalyToolName}
	}

	return []string{FinalyToolName, AskUserToolName}
}

func pentesterExecutorToolNames(quickScanEnabled bool) []string {
	if quickScanEnabled {
		return []string{HackResultToolName, SearchToolName, TerminalToolName, FileToolName, BrowserToolName}
	}

	return []string{
		HackResultToolName,
		AdviceToolName,
		CoderToolName,
		MaintenanceToolName,
		MemoristToolName,
		SearchToolName,
		TerminalToolName,
		FileToolName,
	}
}

func searcherExecutorToolNames(quickScanEnabled bool) []string {
	if quickScanEnabled {
		return []string{SearchResultToolName}
	}

	return []string{SearchResultToolName, MemoristToolName}
}

func searcherExecutorMemoryToolNames(quickScanEnabled bool) []string {
	if quickScanEnabled {
		return nil
	}

	return []string{SearchAnswerToolName, StoreAnswerToolName}
}

func searcherExecutorExploitSearchEnabled(quickScanEnabled bool) bool {
	return !quickScanEnabled
}

type quickScanBlockedTerminalCommand struct {
	terms  []string
	reason string
}

var quickScanBlockedTerminalCommands = []quickScanBlockedTerminalCommand{
	{
		terms:  []string{"masscan"},
		reason: "mass scanning",
	},
	{
		terms:  []string{"msfconsole", "msfvenom", "metasploit"},
		reason: "Metasploit",
	},
	{
		terms:  []string{"hydra", "patator", "medusa", "john", "hashcat"},
		reason: "brute force",
	},
	{
		terms:  []string{"ffuf", "feroxbuster", "gobuster", "dirbuster", "dirb", "wfuzz"},
		reason: "directory brute force",
	},
	{
		terms: []string{
			"chisel",
			"ligolo",
			"sshuttle",
			"proxychains",
			"ngrok",
			"cloudflared tunnel",
			"ssh -d",
			"ssh -l",
			"ssh -r",
			"socat tcp-listen",
			"tcp-listen",
			"nc -l",
			"ncat -l",
			"/dev/tcp/",
			"bash -i",
		},
		reason: "tunneling",
	},
	{
		terms:  []string{"authorized_keys", "crontab", "systemctl enable", "chmod +s", "nohup"},
		reason: "persistence",
	},
	{
		terms:  []string{"sliver", "cobalt strike", "cobaltstrike", "havoc"},
		reason: "C2",
	},
}

func quickScanTerminalCommandBlockReason(command string) string {
	normalized := strings.Join(strings.Fields(strings.ToLower(command)), " ")
	for _, blocked := range quickScanBlockedTerminalCommands {
		for _, term := range blocked.terms {
			if strings.Contains(normalized, term) {
				return fmt.Sprintf("%s: %s", blocked.reason, term)
			}
		}
	}

	return ""
}

func (t *terminal) validateQuickScanTerminalAction(action TerminalAction) error {
	if !t.quickScanEnabled {
		return nil
	}
	if action.Detach.Bool() {
		return fmt.Errorf("quick scan terminal policy: quick scan terminal command blocked: detach is disabled for quick scan tasks")
	}
	if reason := quickScanTerminalCommandBlockReason(action.Input); reason != "" {
		return fmt.Errorf("quick scan terminal policy: quick scan terminal command blocked: %s", reason)
	}

	return nil
}

func (t *terminal) validateQuickScanFileAction(action FileAction) error {
	if !t.quickScanEnabled || action.Action != WriteFile {
		return nil
	}

	return fmt.Errorf("quick scan terminal policy: quick scan terminal command blocked: file writes are disabled")
}

func TerminalToolTimeoutForTaskInput(cfg *config.Config, input string) time.Duration {
	if cfg == nil {
		return 0
	}

	toolCfg := ToolConfigForTaskInput(cfg, input)
	return time.Duration(toolCfg.TerminalToolTimeout) * time.Second
}

func (fte *flowToolsExecutor) newTerminalToolForTask(
	taskID, subtaskID *int64,
	container database.Container,
) Tool {
	taskInput := fte.taskInputForTimeout(taskID)
	return newTerminalTool(
		fte.flowID,
		taskID,
		subtaskID,
		container.ID,
		container.LocalID.String,
		fte.docker,
		fte.tlp,
		TerminalToolTimeoutForTaskInput(fte.cfg, taskInput),
		IsBoundedScanTaskInput(taskInput),
	)
}

func (fte *flowToolsExecutor) toolConfigForTask(taskID *int64) *config.Config {
	return ToolConfigForTaskInput(fte.cfg, fte.taskInputForTimeout(taskID))
}

func (fte *flowToolsExecutor) quickScanProfileForTask(taskID *int64) QuickScanProfile {
	return QuickScanProfileForTaskInput(fte.cfg, fte.taskInputForTimeout(taskID))
}

func (fte *flowToolsExecutor) taskInputForTimeout(taskID *int64) string {
	if taskID == nil || fte.db == nil {
		return ""
	}

	task, err := fte.db.GetTask(context.Background(), *taskID)
	if err != nil {
		return ""
	}

	return task.Input
}
