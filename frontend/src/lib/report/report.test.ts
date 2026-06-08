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
});
