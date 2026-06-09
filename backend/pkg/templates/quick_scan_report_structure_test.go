package templates_test

import (
	"testing"

	"pentagi/pkg/templates"
	"pentagi/pkg/templates/validator"

	"github.com/stretchr/testify/require"
)

func TestQuickScanReportPromptStructure(t *testing.T) {
	t.Parallel()

	prompter := templates.NewDefaultPrompter()
	quickData := validator.CreateDummyTemplateData()
	quickData["QuickScanEnabled"] = true

	testCases := []struct {
		name       string
		promptType templates.PromptType
	}{
		{
			name:       "final reporter",
			promptType: templates.PromptTypeReporter,
		},
		{
			name:       "task reporter",
			promptType: templates.PromptTypeTaskReporter,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			rendered, err := prompter.RenderTemplate(tc.promptType, quickData)
			require.NoError(t, err)
			require.Contains(t, rendered, "clean Markdown heading hierarchy")
			require.Contains(t, rendered, "Do not start headings with status emojis")
			require.Contains(t, rendered, "raw task or subtask IDs")
			require.Contains(t, rendered, "OWASP Top 10:2025")
			require.Contains(t, rendered, "발견 항목 요약")
			require.Contains(t, rendered, "위험도별 발견 항목")
			require.Contains(t, rendered, "위험도 | OWASP Top 10:2025 유형 | 취약점")
		})
	}
}
