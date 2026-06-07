import { describe, expect, it } from 'vitest';

import { buildSimpleModeMessage, owaspTopTen2025Categories } from '@/features/flows/simple-mode-report-guidance';

describe('simple mode report guidance', () => {
    it('adds OWASP Top 10:2025 classification and easy-summary guidance', () => {
        const message = buildSimpleModeMessage({
            scenarioIntent: '웹 애플리케이션의 기본 보안 상태를 점검합니다.',
            scenarioTitle: '웹사이트 기본 점검',
            target: 'example.com',
        });

        expect(message).toContain('승인된 보안 점검 대상: example.com');
        expect(message).toContain('발견 항목마다 OWASP Top 10:2025 기준으로 분류');
        expect(message).toContain('쉬운 요약');
        expect(message).toContain('주요 발견 사항');
        expect(message).toContain('조치 우선순위');
        expect(message).toContain('각 취약점의 위험, 영향, 우선 조치');
        expect(message).toContain('확인된 취약점 없음');
        expect(message).toContain('점검 범위와 한계');

        for (const category of owaspTopTen2025Categories) {
            expect(message).toContain(category);
        }
    });
});
