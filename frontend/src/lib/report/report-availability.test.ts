import { describe, expect, it } from 'vitest';

import type { AssistantLogFragmentFragment, FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { MessageLogType, ProviderType, ResultFormat, StatusType } from '@/graphql/types';

import { getFlowReportAvailability } from './report-availability';

const flowFixture: FlowFragmentFragment = {
    createdAt: '2026-01-01T00:00:00Z',
    id: '7',
    provider: { name: 'deepseek', type: ProviderType.Deepseek },
    status: StatusType.Waiting,
    terminals: [],
    title: '비파괴 웹 취약점 점검',
    updatedAt: '2026-01-01T00:00:00Z',
};

const taskFixture: TaskFragmentFragment = {
    createdAt: '2026-01-01T00:00:00Z',
    flowId: '7',
    id: '501',
    input: 'Authorized target only.',
    result: 'Report body',
    status: StatusType.Finished,
    subtasks: null,
    title: 'Automation task',
    updatedAt: '2026-01-01T00:00:00Z',
};

const assistantLogFixture: AssistantLogFragmentFragment = {
    appendPart: false,
    assistantId: '1',
    createdAt: '2026-01-01T00:00:00Z',
    flowId: '7',
    id: '1',
    message: 'Assistant evidence',
    result: '',
    resultFormat: ResultFormat.Markdown,
    thinking: null,
    type: MessageLogType.Answer,
};

describe('getFlowReportAvailability', () => {
    it('allows reports for assistant-only expert flows without automation tasks', () => {
        expect(
            getFlowReportAvailability({
                assistantLogs: [assistantLogFixture],
                flow: flowFixture,
                flowId: '7',
                hasAssistantSession: true,
                tasks: [],
            }),
        ).toEqual({ available: true, disabled: false });
    });

    it('allows reports when automation tasks are available', () => {
        expect(
            getFlowReportAvailability({
                assistantLogs: [],
                flow: flowFixture,
                flowId: '7',
                hasAssistantSession: false,
                tasks: [taskFixture],
            }),
        ).toEqual({ available: true, disabled: false });
    });

    it('hides reports when a flow has no task or assistant evidence', () => {
        expect(
            getFlowReportAvailability({
                assistantLogs: [],
                flow: flowFixture,
                flowId: '7',
                hasAssistantSession: false,
                tasks: [],
            }),
        ).toEqual({ available: false, disabled: true });
    });

    it('allows reports while assistant logs are still loading when an assistant session exists', () => {
        expect(
            getFlowReportAvailability({
                assistantLogs: [],
                flow: flowFixture,
                flowId: '7',
                hasAssistantSession: true,
                tasks: [],
            }),
        ).toEqual({ available: true, disabled: false });
    });
});
