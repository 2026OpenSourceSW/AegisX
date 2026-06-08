import type { TaskFragmentFragment } from '@/graphql/types';

export const reportSummaryHeading = '핵심 발견 요약';
export const findingSummaryHeading = '발견 항목 요약';
export const severitySummaryHeading = '위험도별 발견 항목';

type FindingSeverity = 'HIGH' | 'INFO' | 'LOW' | 'MEDIUM';

type ReportFinding = {
    readonly owasp: string;
    readonly severity: FindingSeverity;
    readonly title: string;
};

const noOwaspCategory = '해당 없음/추가 확인 필요';

const severityOrder: readonly FindingSeverity[] = ['HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

const severityLabels: Record<FindingSeverity, string> = {
    HIGH: '🔴 HIGH',
    INFO: 'ℹ️ INFO',
    LOW: '🟢 LOW',
    MEDIUM: '🟡 MEDIUM',
};

const severityPatterns: ReadonlyArray<readonly [FindingSeverity, RegExp]> = [
    ['HIGH', /(?:🔴|\bHIGH\b|\bCRITICAL\b|높음|고위험|치명)/iu],
    ['MEDIUM', /(?:🟡|\bMEDIUM\b|중간|중위험)/iu],
    ['LOW', /(?:🟢|\bLOW\b|낮음|저위험)/iu],
    ['INFO', /(?:ℹ️|ℹ|\bINFO\b|정보|참고)/iu],
] as const;

const markdownTableSeparatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;
const owaspPattern = /\bA(?:0[1-9]|10):2025(?:\s*[-–—:]\s*[^|,;\n]+)?/iu;

const stripMarkdown = (value: string): string => {
    return value
        .replaceAll(/[`_~]/g, '')
        .replaceAll(/<[^>]+>/g, '')
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/u, '')
        .replaceAll(/[✅❌⚡⏳📝]/gu, '')
        .trim();
};

const normalizeWhitespace = (value: string): string => value.replaceAll(/\s+/gu, ' ').trim();

const normalizeCell = (value: string): string => normalizeWhitespace(stripMarkdown(value));

const splitMarkdownTableRow = (line: string): string[] => {
    const trimmed = line.trim();

    if (!trimmed.includes('|') || markdownTableSeparatorPattern.test(trimmed)) {
        return [];
    }

    return trimmed
        .replace(/^\|/u, '')
        .replace(/\|$/u, '')
        .split('|')
        .map(normalizeCell)
        .filter((cell) => cell.length > 0);
};

const parseSeverity = (value: string): FindingSeverity | null => {
    for (const [severity, pattern] of severityPatterns) {
        if (pattern.test(value)) {
            return severity;
        }
    }

    return null;
};

const parseOwasp = (value: string): string => {
    const match = value.match(owaspPattern);

    return match ? normalizeCell(match[0]) : noOwaspCategory;
};

const cleanFindingTitle = (value: string): string => {
    return normalizeCell(value)
        .replaceAll(/(?:🔴|🟡|🟢|ℹ️|ℹ)/gu, '')
        .replaceAll(/\b(?:CRITICAL|HIGH|MEDIUM|LOW|INFO)\b/giu, '')
        .replace(owaspPattern, '')
        .replace(/^(?:위험도|심각도|취약점|항목|유형)\s*[:：-]?\s*/iu, '')
        .replaceAll(/^[|:：,;\-\s]+|[|:：,;\-\s]+$/gu, '')
        .trim();
};

const parseFindingFromTableCells = (cells: readonly string[]): null | ReportFinding => {
    if (cells.length < 3 || cells.some((cell) => /^(?:위험도|심각도|OWASP|취약점|항목)$/iu.test(cell))) {
        return null;
    }

    const severityIndex = cells.findIndex((cell) => parseSeverity(cell) !== null);
    const owaspIndex = cells.findIndex((cell) => owaspPattern.test(cell));

    if (severityIndex === -1) {
        return null;
    }

    const titleCandidates = cells
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell, index }) => {
            return (
                index !== severityIndex &&
                index !== owaspIndex &&
                cleanFindingTitle(cell).length > 0 &&
                normalizeCell(cell) !== noOwaspCategory
            );
        });
    const titleIndex = titleCandidates.at(-1)?.index ?? -1;

    if (titleIndex === -1) {
        return null;
    }

    const fallbackOwaspIndex = cells.findIndex((cell, index) => {
        return index !== severityIndex && index !== owaspIndex && cleanFindingTitle(cell).length > 0;
    });

    const severity = parseSeverity(cells[severityIndex]);
    const title = cleanFindingTitle(cells[titleIndex]);

    if (!severity || title.length === 0) {
        return null;
    }

    return {
        owasp:
            owaspIndex === -1
                ? normalizeCell(cells[fallbackOwaspIndex] ?? noOwaspCategory) || noOwaspCategory
                : parseOwasp(cells[owaspIndex]),
        severity,
        title,
    };
};

const parseFindingFromLine = (line: string): null | ReportFinding => {
    const tableFinding = parseFindingFromTableCells(splitMarkdownTableRow(line));

    if (tableFinding) {
        return tableFinding;
    }

    const severity = parseSeverity(line);

    if (!severity || !/(취약|누락|CORS|CSP|HSTS|X-Frame|Policy|DNSSEC|Injection|Misconfiguration)/iu.test(line)) {
        return null;
    }

    const title = cleanFindingTitle(line);

    if (title.length === 0 || /^[-|:：\s]+$/u.test(title)) {
        return null;
    }

    return {
        owasp: parseOwasp(line),
        severity,
        title,
    };
};

const collectReportTextParts = (tasks: readonly TaskFragmentFragment[]): string[] => {
    return tasks.flatMap((task) => [
        task.result ?? '',
        ...(task.subtasks ?? []).flatMap((subtask) => [subtask.description ?? '', subtask.result ?? '']),
    ]);
};

export const extractReportFindings = (tasks: readonly TaskFragmentFragment[]): readonly ReportFinding[] => {
    const findings = collectReportTextParts(tasks).flatMap((text) => {
        return text
            .split('\n')
            .map(parseFindingFromLine)
            .filter((finding): finding is ReportFinding => finding !== null);
    });

    const unique = new Map<string, ReportFinding>();

    findings.forEach((finding) => {
        const key = `${finding.severity}:${finding.owasp}:${finding.title}`.toLowerCase();

        if (!unique.has(key)) {
            unique.set(key, finding);
        }
    });

    return [...unique.values()].sort((a, b) => {
        const severityDelta = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);

        if (severityDelta !== 0) {
            return severityDelta;
        }

        return 0;
    });
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
    const findings = extractReportFindings(tasks);

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
