import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskFragmentFragment } from '@/graphql/types';

import { StatusType } from '@/graphql/types';

import FlowTasks from './flow-tasks';

const flowMock = vi.hoisted(() => ({
    flowData: {
        tasks: [] as TaskFragmentFragment[],
    },
    flowId: '11',
    flowStatus: 'running' as StatusType,
}));

vi.mock('@/providers/flow-provider', () => ({
    useFlow: () => flowMock,
}));

vi.mock('@/hooks/use-auto-scroll', () => ({
    useAutoScroll: () => ({
        containerRef: { current: null },
        endRef: { current: null },
        hasNewMessages: false,
        isScrolledToBottom: true,
        scrollToEnd: vi.fn(),
    }),
}));

describe('FlowTasks', () => {
    beforeEach(() => {
        flowMock.flowData = { tasks: [] };
        flowMock.flowId = '11';
        flowMock.flowStatus = StatusType.Running;
    });

    it('shows a Korean startup state when a running flow has no hydrated tasks yet', () => {
        render(<FlowTasks />);

        expect(screen.getByRole('heading', { name: '작업 준비 중' })).toBeInTheDocument();
        expect(screen.getByText('점검 작업을 생성하고 있습니다. 잠시 후 자동으로 표시됩니다.')).toBeInTheDocument();
    });

    it('shows a Korean failure state when startup failed before task creation', () => {
        flowMock.flowStatus = StatusType.Failed;

        render(<FlowTasks />);

        expect(screen.getByRole('heading', { name: '작업 생성 실패' })).toBeInTheDocument();
        expect(
            screen.getByText('작업이 생성되기 전에 플로우가 실패했습니다. 터미널과 로그를 확인하세요.'),
        ).toBeInTheDocument();
    });
});
