import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowTabs from './flow-tabs';

vi.mock('@/hooks/use-breakpoint', () => ({
    useBreakpoint: () => ({ isDesktop: false }),
}));

vi.mock('@/features/flows/agents/flow-agents', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/dashboard/flow-dashboard', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/files/flow-files', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/messages/flow-assistant-messages', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/messages/flow-automation-messages', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/screenshots/flow-screenshots', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/tasks/flow-tasks', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/terminal/flow-terminal', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/tools/flow-tools', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/vector-stores/flow-vector-stores', () => ({ default: () => <div /> }));

describe('FlowTabs', () => {
    it('uses natural Korean labels for the flow detail navigation tabs', () => {
        render(
            <FlowTabs
                activeTab="dashboard"
                onTabChange={() => undefined}
            />,
        );

        expect(screen.getByRole('tab', { name: '자동 점검' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '어시스턴트' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '요약' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '터미널' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '작업' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '에이전트' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '검색' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '벡터 저장소' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '파일' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '스크린샷' })).toBeInTheDocument();
    });
});
