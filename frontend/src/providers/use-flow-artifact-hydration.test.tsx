import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StatusType } from '@/graphql/types';

import { useFlowArtifactHydration } from './use-flow-artifact-hydration';

describe('useFlowArtifactHydration', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('refetches and starts polling when a running flow has no tasks yet', () => {
        vi.useFakeTimers();
        const refetch = vi.fn<() => void>();
        const startPolling = vi.fn<(interval: number) => void>();
        const stopPolling = vi.fn<() => void>();

        renderHook(() =>
            useFlowArtifactHydration({
                flowId: '11',
                flowStatus: StatusType.Running,
                isLoading: false,
                refetch,
                startPolling,
                stopPolling,
                taskCount: 0,
            }),
        );

        expect(refetch).toHaveBeenCalledTimes(1);
        expect(startPolling).toHaveBeenCalledWith(2_000);
        expect(stopPolling).not.toHaveBeenCalled();
    });

    it('stops polling once tasks are hydrated', () => {
        const refetch = vi.fn<() => void>();
        const startPolling = vi.fn<(interval: number) => void>();
        const stopPolling = vi.fn<() => void>();

        renderHook(() =>
            useFlowArtifactHydration({
                flowId: '11',
                flowStatus: StatusType.Running,
                isLoading: false,
                refetch,
                startPolling,
                stopPolling,
                taskCount: 1,
            }),
        );

        expect(refetch).not.toHaveBeenCalled();
        expect(startPolling).not.toHaveBeenCalled();
        expect(stopPolling).toHaveBeenCalledTimes(1);
    });
});
