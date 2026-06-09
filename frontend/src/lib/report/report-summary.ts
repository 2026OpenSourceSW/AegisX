import type { TaskFragmentFragment } from '@/graphql/types';

import type { FindingSeverity, ReportFinding } from './report-finding-parser';

import { extractReportFindings } from './report-finding-parser';

export const reportSummaryHeading = '핵심 발견 요약';
export const findingSummaryHeading = '발견 항목 요약';
export const severitySummaryHeading = '위험도별 발견 항목';

const severityOrder: readonly FindingSeverity[] = ['HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

const severityLabels: Record<FindingSeverity, string> = {
    HIGH: '🔴 HIGH',
    INFO: 'ℹ️ INFO',
    LOW: '🟢 LOW',
    MEDIUM: '🟡 MEDIUM',
};

const escapeTableCell = (value: string): string => value.replaceAll('|', '\\|');

const buildFindingRows = (findings: readonly ReportFinding[]): string => {
    return findings
        .map((finding) => {
            return `| ${severityLabels[finding.severity]} | ${escapeTableCell(finding.owasp)} | ${escapeTableCell(finding.title)} |`;
        })
        .join('\n');
};

const buildSeverityRows = (findings: readonly ReportFinding[]): string => {
    return severityOrder
        .map((severity) => {
            const titles = findings.filter((finding) => finding.severity === severity).map((finding) => finding.title);

            if (titles.length === 0) {
                return null;
            }

            return `| ${severityLabels[severity]} | ${titles.length} | ${escapeTableCell(titles.join(', '))} |`;
        })
        .filter((row): row is string => row !== null)
        .join('\n');
};

export const buildFindingSummaryMarkdown = (tasks: readonly TaskFragmentFragment[]): string => {
    const findings = [...extractReportFindings(tasks)].sort((a, b) => {
        const severityDelta = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);

        if (severityDelta !== 0) {
            return severityDelta;
        }

        return 0;
    });

    if (findings.length === 0) {
        return `## ${reportSummaryHeading}\n\n확인된 취약점이 자동으로 추출되지 않았습니다. 아래 점검 결과의 근거와 한계를 확인하세요.`;
    }

    return [
        `## ${reportSummaryHeading}`,
        '',
        `### ${findingSummaryHeading}`,
        '',
        '| 위험도 | OWASP Top 10:2025 유형 | 취약점 |',
        '| --- | --- | --- |',
        buildFindingRows(findings),
        '',
        `### ${severitySummaryHeading}`,
        '',
        '| 위험도 | 개수 | 항목 |',
        '| --- | ---: | --- |',
        buildSeverityRows(findings),
    ].join('\n');
};
