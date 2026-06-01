package shannon

import "time"

type Config struct {
	Enabled      bool
	WorkspaceDir string
	Command      string
	Timeout      time.Duration
}

type ScanRequest struct {
	TargetURL                string `json:"target_url" binding:"required"`
	WorkspacePath            string `json:"workspace_path"`
	OwnedTargetConfirmed     bool   `json:"owned_target_confirmed" binding:"required"`
	NonProductionConfirmed   bool   `json:"non_production_confirmed" binding:"required"`
	ImportReportAsFlowResult bool   `json:"import_report_as_flow_result"`
}

type Finding struct {
	Title      string `json:"title"`
	Severity   string `json:"severity"`
	Evidence   string `json:"evidence"`
	SourcePath string `json:"source_path,omitempty"`
}

type Report struct {
	Markdown string    `json:"markdown"`
	Findings []Finding `json:"findings"`
}

type ScanResult struct {
	Command       []string `json:"command"`
	WorkspacePath string   `json:"workspace_path"`
	ReportPath    string   `json:"report_path,omitempty"`
	Stdout        string   `json:"stdout"`
	Stderr        string   `json:"stderr"`
	Report        Report   `json:"report"`
}
