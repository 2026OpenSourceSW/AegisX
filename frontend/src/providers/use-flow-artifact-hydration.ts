import { useEffect } from 'react';

import { StatusType } from '@/graphql/types';

interface FlowArtifactHydrationInput {
    readonly flowId: null | string | undefined;
    readonly flowStatus: StatusType | undefined;
    readonly isLoading: boolean;
    readonly refetch: () => void;
    readonly startPolling: (pollInterval: number) => void;
    readonly stopPolling: () => void;
    readonly taskCount: number;
}

const ARTIFACT_HYDRATION_POLL_MS = 2_000;

const shouldHydrateArtifacts = (
    flowId: null | string | undefined,
    flowStatus: StatusType | undefined,
    isLoading: boolean,
    taskCount: number,
): boolean => {
    if (!flowId || isLoading || taskCount > 0) {
        return false;
    }

    return flowStatus === StatusType.Created || flowStatus === StatusType.Running;
};

export function useFlowArtifactHydration({
    flowId,
    flowStatus,
    isLoading,
    refetch,
    startPolling,
    stopPolling,
    taskCount,
}: FlowArtifactHydrationInput): void {
    useEffect(() => {
        if (!shouldHydrateArtifacts(flowId, flowStatus, isLoading, taskCount)) {
            stopPolling();

            return;
        }

        refetch();
        startPolling(ARTIFACT_HYDRATION_POLL_MS);

        return () => stopPolling();
    }, [flowId, flowStatus, isLoading, refetch, startPolling, stopPolling, taskCount]);
}
