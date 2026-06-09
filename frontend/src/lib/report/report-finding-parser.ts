import type { TaskFragmentFragment } from '@/graphql/types';

export type FindingSeverity = 'HIGH' | 'INFO' | 'LOW' | 'MEDIUM';

export type ReportFinding = {
    readonly owasp: string;
    readonly severity: FindingSeverity;
    readonly title: string;
};

export const noOwaspCategory = '해당 없음/추가 확인 필요';

const severityPatterns: ReadonlyArray<readonly [FindingSeverity, RegExp]> = [
    ['HIGH', /(?:🔴|\bHIGH\b|\bCRITICAL\b|높음|고위험|치명)/iu],
    ['MEDIUM', /(?:🟡|\bMEDIUM\b|중간|중위험)/iu],
    ['LOW', /(?:🟢|\bLOW\b|낮음|저위험)/iu],
    ['INFO', /(?:ℹ️|ℹ|\bINFO\b|정보|참고)/iu],
] as const;

const markdownTableSeparatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u;
const owaspPattern = /\bA(?:0[1-9]|10):2025(?:\s*[-–—:]\s*[^|,;\n]+)?/iu;
const findingKeywordPattern =
    /(취약|누락|CORS|CSP|HSTS|X-Frame|X-Content-Type|Referrer-Policy|Permissions-Policy|Policy|DNSSEC|Injection|Misconfiguration)/iu;
const remediationSuffixPattern = /\s*(?:[-–—:：|,;]\s*)?(?:보완점|조치|개선|권고|대응|영향|근거)\s*[:：-].*$/iu;

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
        .replace(remediationSuffixPattern, '')
        .replaceAll(/^[|:：,;\-\s]+|[|:：,;\-\s]+$/gu, '')
        .trim();
};

const inferOwaspFromTitle = (title: string): string => {
    if (
        /(CORS|CSP|HSTS|X-Frame|X-Content-Type|Referrer-Policy|Permissions-Policy|DNSSEC|security header|보안 헤더)/iu.test(
            title,
        )
    ) {
        return 'A02:2025 - Security Misconfiguration';
    }

    if (/(access control|authorization|권한|인가|admin|관리자)/iu.test(title)) {
        return 'A01:2025 - Broken Access Control';
    }

    if (/(dependency|supply chain|package|라이브러리|의존성)/iu.test(title)) {
        return 'A03:2025 - Software Supply Chain Failures';
    }

    if (/(TLS|SSL|certificate|crypto|암호|인증서)/iu.test(title)) {
        return 'A04:2025 - Cryptographic Failures';
    }

    if (/(injection|SQLi|SQL injection|XSS|삽입)/iu.test(title)) {
        return 'A05:2025 - Injection';
    }

    if (/(auth|session|login|인증|세션|로그인)/iu.test(title)) {
        return 'A07:2025 - Identification and Authentication Failures';
    }

    if (/(log|monitor|alert|logging|monitoring|로그|모니터링)/iu.test(title)) {
        return 'A09:2025 - Security Logging and Monitoring Failures';
    }

    if (/(SSRF|server-side request|outbound fetch)/iu.test(title)) {
        return 'A10:2025 - Server-Side Request Forgery';
    }

    return noOwaspCategory;
};

const isHeaderCell = (cell: string): boolean =>
    /^(?:위험도|심각도|OWASP|OWASP Top 10:2025 유형|취약점|항목|보완점|조치|개선|권고|대응|근거|영향)$/iu.test(cell);

const headerIndex = (headers: readonly string[], pattern: RegExp): number =>
    headers.findIndex((header) => pattern.test(header));

const parseFindingFromTableCells = (cells: readonly string[], headers?: readonly string[]): null | ReportFinding => {
    if (cells.length < 3 || cells.every(isHeaderCell)) {
        return null;
    }

    const severityIndex = headers
        ? headerIndex(headers, /^(?:위험도|심각도)$/iu)
        : cells.findIndex((cell) => parseSeverity(cell) !== null);
    const owaspIndex = headers ? headerIndex(headers, /^OWASP/iu) : cells.findIndex((cell) => owaspPattern.test(cell));
    const titleIndex = headers
        ? headerIndex(headers, /^(?:취약점|항목)$/iu)
        : cells.findIndex(
              (cell, index) => index !== severityIndex && index !== owaspIndex && findingKeywordPattern.test(cell),
          );

    if (severityIndex === -1 || titleIndex === -1) {
        return null;
    }

    const severity = parseSeverity(cells[severityIndex] ?? '');
    const title = cleanFindingTitle(cells[titleIndex] ?? '');

    if (!severity || title.length === 0) {
        return null;
    }

    const parsedOwasp = owaspIndex === -1 ? noOwaspCategory : parseOwasp(cells[owaspIndex] ?? '');

    return {
        owasp: parsedOwasp === noOwaspCategory ? inferOwaspFromTitle(title) : parsedOwasp,
        severity,
        title,
    };
};

const parseFindingFromLine = (line: string): null | ReportFinding => {
    const severity = parseSeverity(line);

    if (!severity || !findingKeywordPattern.test(line)) {
        return null;
    }

    const title = cleanFindingTitle(line);

    if (title.length === 0 || /^[-|:：\s]+$/u.test(title)) {
        return null;
    }

    const parsedOwasp = parseOwasp(line);

    return {
        owasp: parsedOwasp === noOwaspCategory ? inferOwaspFromTitle(title) : parsedOwasp,
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

const parseFindingsFromText = (text: string): readonly ReportFinding[] => {
    let tableHeaders: readonly string[] | undefined;
    const findings: ReportFinding[] = [];

    text.split('\n').forEach((line) => {
        const cells = splitMarkdownTableRow(line);

        if (cells.length > 0 && cells.some(isHeaderCell)) {
            tableHeaders = cells;

            return;
        }

        const tableFinding = cells.length > 0 ? parseFindingFromTableCells(cells, tableHeaders) : null;
        const finding = tableFinding ?? parseFindingFromLine(line);

        if (finding) {
            findings.push(finding);
        }
    });

    return findings;
};

export const extractReportFindings = (tasks: readonly TaskFragmentFragment[]): readonly ReportFinding[] => {
    const findings = collectReportTextParts(tasks).flatMap(parseFindingsFromText);
    const unique = new Map<string, ReportFinding>();

    findings.forEach((finding) => {
        const key = `${finding.severity}:${finding.owasp}:${finding.title}`.toLowerCase();

        if (!unique.has(key)) {
            unique.set(key, finding);
        }
    });

    return [...unique.values()];
};
