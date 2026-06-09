import { describe, expect, it } from 'vitest';

import { FlowStateReason, StatusType } from '@/graphql/types';

import { getFlowStatusDisplay } from './flow-status-display';

describe('getFlowStatusDisplay', () => {
    it.each([
        [StatusType.Created, '준비 중'],
        [StatusType.Running, '진행 중'],
        [StatusType.Waiting, '대기 중'],
        [StatusType.Finished, '완료'],
        [StatusType.Failed, '실패'],
    ])('returns localized labels for %s', (status, label) => {
        expect(getFlowStatusDisplay(status).label).toBe(label);
    });

    it('describes assistant-only waiting flows as waiting for additional input', () => {
        expect(
            getFlowStatusDisplay(StatusType.Waiting, {
                hasAssistantLogs: true,
                hasTasks: false,
            }),
        ).toEqual(
            expect.objectContaining({
                label: '어시스턴트 대기',
                tooltip: '어시스턴트 응답 완료, 추가 입력 대기',
            }),
        );
    });

    it('prefers explicit flow state reason over list-page heuristics', () => {
        expect(
            getFlowStatusDisplay(StatusType.Waiting, {
                stateReason: FlowStateReason.AssistantIdleAfterResponse,
            }),
        ).toEqual(
            expect.objectContaining({
                label: '어시스턴트 대기',
                tooltip: '어시스턴트 응답 완료, 추가 입력 대기',
            }),
        );
    });
});
