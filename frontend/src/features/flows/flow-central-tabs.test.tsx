import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowCentralTabs from './flow-central-tabs';

vi.mock('@/hooks/use-flow-tab-detection', () => ({
    useFlowTabDetection: () => ({
        handleTabChange: () => undefined,
        resolvedTab: 'dashboard',
    }),
}));

vi.mock('@/features/flows/dashboard/flow-dashboard', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/messages/flow-assistant-messages', () => ({ default: () => <div /> }));
vi.mock('@/features/flows/messages/flow-automation-messages', () => ({ default: () => <div /> }));

describe('FlowCentralTabs', () => {
    it('uses Korean labels for the central flow tabs', () => {
        render(<FlowCentralTabs />);

        expect(screen.getByRole('tab', { name: '자동 점검' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '어시스턴트' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '요약' })).toBeInTheDocument();
    });
});
