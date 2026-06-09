package tools

import "strings"

const (
	SimpleScanTaskMarkerPrefix = "<간편 점검:"

	defaultSimpleScanBudgetMinutes            = "점검 후 산정"
	defaultSimpleScanMaxSubtasks              = 3
	defaultSimpleScanTerminalToolTimeout      = 240
	defaultSimpleScanHTTPClientTimeout        = 60
	defaultSimpleScanMaxGeneralAgentToolCalls = 12
	defaultSimpleScanMaxLimitedAgentToolCalls = 8
)

func IsSimpleScanTaskInput(input string) bool {
	firstLine, _, _ := strings.Cut(strings.TrimPrefix(input, "\ufeff"), "\n")
	firstLine = strings.TrimSpace(strings.TrimSuffix(firstLine, "\r"))

	return strings.HasPrefix(firstLine, SimpleScanTaskMarkerPrefix) && strings.HasSuffix(firstLine, ">")
}

func IsBoundedScanTaskInput(input string) bool {
	return IsQuickScanTaskInput(input) || IsSimpleScanTaskInput(input)
}

func SimpleScanProfileForTaskInput(input string) QuickScanProfile {
	if !IsSimpleScanTaskInput(input) {
		return QuickScanProfile{}
	}

	return QuickScanProfile{
		Enabled:                  true,
		Marker:                   SimpleScanTaskMarkerPrefix,
		BudgetMinutes:            defaultSimpleScanBudgetMinutes,
		MaxSubtasks:              defaultSimpleScanMaxSubtasks,
		TerminalToolTimeout:      defaultSimpleScanTerminalToolTimeout,
		HTTPClientTimeout:        defaultSimpleScanHTTPClientTimeout,
		MaxGeneralAgentToolCalls: defaultSimpleScanMaxGeneralAgentToolCalls,
		MaxLimitedAgentToolCalls: defaultSimpleScanMaxLimitedAgentToolCalls,
		DisableAgentPlanner:      false,
		DisablePostExploit:       true,
		Rules: []string{
			"간편 모드는 2~3개 이내의 핵심 세부 작업으로 제한합니다.",
			"긴 정밀 스캔, 무차별 대입, 권한 범위 밖 탐색은 수행하지 않습니다.",
			"post-exploitation, persistence, pivoting, tunneling, C2, mass scan, long directory brute force, Metasploit workflows are prohibited.",
			"브라우저로 첫 화면 스크린샷을 확보하고, 실패하면 이유를 보고합니다.",
		},
	}
}
