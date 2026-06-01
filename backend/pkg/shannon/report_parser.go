package shannon

import (
	"regexp"
	"strings"
)

var severityPattern = regexp.MustCompile(`(?i)\b(critical|high|medium|low|info|informational)\b`)

func ParseMarkdownReport(markdown string) Report {
	report := Report{Markdown: markdown}
	lines := strings.Split(markdown, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(trimmed, "#") {
			continue
		}

		title := strings.TrimSpace(strings.TrimLeft(trimmed, "#"))
		if title == "" || strings.EqualFold(title, "findings") {
			continue
		}

		finding := Finding{Title: title, Severity: "unknown"}
		for j := i + 1; j < len(lines) && j <= i+8; j++ {
			next := strings.TrimSpace(lines[j])
			if strings.HasPrefix(next, "#") {
				break
			}
			if match := severityPattern.FindString(next); match != "" {
				finding.Severity = strings.ToLower(match)
			}
			if finding.Evidence == "" && next != "" {
				finding.Evidence = next
			}
		}
		report.Findings = append(report.Findings, finding)
	}

	return report
}
