import { describe, expect, it } from 'vitest';

import { buildSimpleModeMessage, owaspTopTen2025Categories } from '@/features/flows/simple-mode-report-guidance';

describe('simple mode report guidance', () => {
    it('adds OWASP Top 10:2025 classification and easy-summary guidance', () => {
        const message = buildSimpleModeMessage({
            promptMarker: '<간편 점검:web-basic>',
            scenarioIntent: '웹 애플리케이션의 기본 보안 상태를 점검합니다.',
            scenarioTitle: '웹사이트 기본 점검',
            target: 'example.com',
        });

        expect(message).not.toContain('<빠른 점검>');
        expect(message.split('\n')[0]).toBe('<간편 점검:web-basic>');
        expect(message).toContain('간편 모드 제한 범위');
        expect(message).toContain('2~3개 이내의 핵심 세부 작업');
        expect(message).toContain('브라우저로 첫 화면 스크린샷을 1회 이상 확보');
        expect(message).toContain('승인된 보안 점검 대상: example.com');
        expect(message).toContain('발견 항목마다 OWASP Top 10:2025 기준으로 분류');
        expect(message).toContain('쉬운 요약');
        expect(message).toContain('발견 항목 요약');
        expect(message).toContain('위험도별 발견 항목');
        expect(message).toContain('주요 발견 사항');
        expect(message).toContain('조치 우선순위');
        expect(message).toContain('위험도 | OWASP Top 10:2025 유형 | 취약점');
        expect(message).toContain('각 취약점의 위험, 영향, 우선 조치');
        expect(message).toContain('확인된 취약점 없음');
        expect(message).toContain('점검 범위와 한계');

        for (const category of owaspTopTen2025Categories) {
            expect(message).toContain(category);
        }
    });

    it('adds quick-scan marker and limits only when requested', () => {
        const message = buildSimpleModeMessage({
            promptMarker: '<빠른 점검>',
            scenarioIntent: '5~10분 안에 외부 노출 여부와 즉시 조치가 필요한 핵심 위험만 빠르게 확인합니다.',
            scenarioTitle: '빠른 점검',
            target: 'example.com',
        });

        expect(message.split('\n')[0]).toBe('<빠른 점검>');
        expect(message).toContain('점검 시나리오: 빠른 점검');
        expect(message).toContain('5~10분');
        expect(message).toContain('긴 정밀 스캔/무차별 대입/권한 범위 밖 탐색은 수행하지 않습니다');
        expect(message).toContain('단일 terminal 명령은 120초 안에 끝나도록 timeout을 함께 사용');
        expect(message).toContain('브라우저로 대상 첫 화면 스크린샷을 1회 확보');
        expect(message).toContain('외부 검색/API 호출이 지연되면 "추가 확인 필요"로 표시');
    });
});
