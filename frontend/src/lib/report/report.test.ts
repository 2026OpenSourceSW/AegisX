import { describe, expect, it } from 'vitest';

import type { FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { ProviderType, StatusType } from '@/graphql/types';

import { generateReport } from './report';

const quickScanFlow = {
    createdAt: '2026-01-01T00:00:00Z',
    id: '2',
    provider: { name: 'deepseek', type: ProviderType.Deepseek },
    status: StatusType.Finished,
    terminals: [],
    title: 'localhost:3010 빠른 보안 점검',
    updatedAt: '2026-01-01T00:00:00Z',
} satisfies FlowFragmentFragment;

const quickScanTask = {
    createdAt: '2026-01-01T00:00:00Z',
    flowId: '2',
    id: '2',
    input: `# ⏳ 2. 빠른 보안 점검

점검 권한이 있는 staging 대상만 확인합니다.`,
    result: `# ✅ 2. localhost:3010 빠른 보안 점검 - 외부 노출 및 핵심 위험 확인 (OWASP Top 10:2025)

## ✅ 23. 외부 노출 스냅샷 및 웹 기초 점검 (통합)

- 본문 증거 1. http://localhost:3010 응답 확인
1. 본문 번호 목록은 유지되어야 합니다.

## 1. 확인 절차

정상적인 보고서 섹션 번호는 유지되어야 합니다.`,
    status: StatusType.Finished,
    subtasks: [
        {
            createdAt: '2026-01-01T00:00:00Z',
            description: `# ✅ 23. 외부 노출 스냅샷 및 웹 기초 점검 (통합)

도구 실행 범위를 기록합니다.`,
            id: '23',
            result: `## ✅ 23. 포트 및 HTTP 응답

- 1. 3010/tcp open`,
            status: StatusType.Finished,
            taskId: '2',
            title: '외부 노출 스냅샷 및 웹 기초 점검 (통합)',
            updatedAt: '2026-01-01T00:00:00Z',
        },
    ],
    title: '빠른 보안 점검',
    updatedAt: '2026-01-01T00:00:00Z',
} satisfies TaskFragmentFragment;

const findingSummaryTask = {
    createdAt: '2026-01-01T00:00:00Z',
    flowId: '2',
    id: '7',
    input: '<빠른 점검>\n승인된 보안 점검 대상: localhost:3010',
    result: `## 주요 발견 사항

| 위험도 | OWASP Top 10:2025 유형 | 취약점 |
| --- | --- | --- |
| 🔴 HIGH | A02:2025 - Security Misconfiguration | Wildcard CORS(ACAO: *) |
| HIGH | A02:2025 - Security Misconfiguration | CSP 누락 |
| 🟡 MEDIUM | A02:2025 - Security Misconfiguration | HSTS 누락 |
| 🟢 LOW | 해당 없음/추가 확인 필요 | IPv6 미지원 |
| ℹ️ INFO | 해당 없음/추가 확인 필요 | 정적 SPA(서버 공격표면 없음) |

### 상세 근거

- Access-Control-Allow-Origin: *
- Content-Security-Policy 헤더가 없습니다.`,
    status: StatusType.Finished,
    subtasks: null,
    title: '빠른 점검 결과 정리',
    updatedAt: '2026-01-01T00:00:00Z',
} satisfies TaskFragmentFragment;

const getHeadings = (report: string): string[] => report.split('\n').filter((line) => /^#{1,6}\s+/.test(line));

describe('generateReport', () => {
    it('normalizes report headings for quick scan web view', () => {
        const report = generateReport([quickScanTask], quickScanFlow);
        const headings = getHeadings(report);

        expect(report).toContain('# localhost:3010 빠른 보안 점검');
        expect(report).toContain('## 목차');
        expect(report).toContain('- [빠른 보안 점검](#빠른-보안-점검)');
        expect(report).toMatch(
            /[ ]{2}- \[외부 노출 스냅샷 및 웹 기초 점검 \(통합\)\]\(#외부-노출-스냅샷-및-웹-기초-점검-통합-1\)/u,
        );
        expect(report).toContain('### 빠른 보안 점검');
        expect(report).toContain('#### 빠른 보안 점검');
        expect(report).toContain(
            '#### localhost:3010 빠른 보안 점검 - 외부 노출 및 핵심 위험 확인 (OWASP Top 10:2025)',
        );
        expect(report).toContain('##### 외부 노출 스냅샷 및 웹 기초 점검 (통합)');
        expect(report).toContain('##### 1. 확인 절차');

        expect(headings).not.toEqual(expect.arrayContaining([expect.stringMatching(/^#{1,6}\s+[✅⏳❌⚡📝]/u)]));
        expect(headings).not.toEqual(expect.arrayContaining([expect.stringMatching(/^#{1,6}\s+(2|23)\.\s/u)]));
    });

    it('preserves body content while cleaning only markdown headings', () => {
        const report = generateReport([quickScanTask], quickScanFlow);

        expect(report).toContain('- 본문 증거 1. http://localhost:3010 응답 확인');
        expect(report).toContain('1. 본문 번호 목록은 유지되어야 합니다.');
        expect(report).toContain('정상적인 보고서 섹션 번호는 유지되어야 합니다.');
        expect(report).toContain('- 1. 3010/tcp open');
        expect(report).not.toContain('✅ 2. localhost:3010 빠른 보안 점검');
        expect(report).not.toContain('✅ 23. 외부 노출 스냅샷');
    });

    it('adds finding summary tables before detailed findings', () => {
        const report = generateReport([findingSummaryTask], quickScanFlow);

        expect(report).toContain('## 핵심 발견 요약');
        expect(report).toContain('### 발견 항목 요약');
        expect(report).toContain('| 위험도 | OWASP Top 10:2025 유형 | 취약점 |');
        expect(report).toContain('| 🔴 HIGH | A02:2025 - Security Misconfiguration | Wildcard CORS(ACAO: *) |');
        expect(report).toContain('| 🔴 HIGH | A02:2025 - Security Misconfiguration | CSP 누락 |');
        expect(report).toContain('| 🟡 MEDIUM | A02:2025 - Security Misconfiguration | HSTS 누락 |');
        expect(report).toContain('| 🟢 LOW | 해당 없음/추가 확인 필요 | IPv6 미지원 |');
        expect(report).toContain('| ℹ️ INFO | 해당 없음/추가 확인 필요 | 정적 SPA(서버 공격표면 없음) |');
        expect(report).toContain('### 위험도별 발견 항목');
        expect(report).toContain('| 🔴 HIGH | 2 | Wildcard CORS(ACAO: *), CSP 누락 |');
        expect(report).toContain('| 🟡 MEDIUM | 1 | HSTS 누락 |');
        expect(report).toContain('| 🟢 LOW | 1 | IPv6 미지원 |');
        expect(report).toContain('| ℹ️ INFO | 1 | 정적 SPA(서버 공격표면 없음) |');

        expect(report.indexOf('## 핵심 발견 요약')).toBeLessThan(report.indexOf('#### 주요 발견 사항'));
    });

    it('adds generated summary and body sections to the table of contents', () => {
        const report = generateReport([findingSummaryTask], quickScanFlow);

        expect(report).toContain('- [핵심 발견 요약](#핵심-발견-요약)');
        expect(report).toContain('  - [발견 항목 요약](#발견-항목-요약)');
        expect(report).toContain('  - [위험도별 발견 항목](#위험도별-발견-항목)');
        expect(report).toContain('- [점검 결과](#점검-결과)');
        expect(report).toContain('  - [빠른 점검 결과 정리](#빠른-점검-결과-정리)');
        expect(report).toContain('    - [주요 발견 사항](#주요-발견-사항)');
        expect(report).toContain('    - [상세 근거](#상세-근거)');
    });
});
