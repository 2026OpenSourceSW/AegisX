import { StatusType } from '@/graphql/types';

export interface FlowHistorySummary {
    readonly active: number;
    readonly failed: number;
    readonly finished: number;
    readonly total: number;
    readonly waiting: number;
}

export const summarizeFlowHistory = (flows: readonly { readonly status: StatusType }[]): FlowHistorySummary => {
    let active = 0;
    let failed = 0;
    let finished = 0;
    let waiting = 0;

    for (const flow of flows) {
        switch (flow.status) {
            case StatusType.Created: {
                active += 1;

                break;
            }

            case StatusType.Failed: {
                failed += 1;

                break;
            }

            case StatusType.Finished: {
                finished += 1;

                break;
            }

            case StatusType.Running: {
                active += 1;

                break;
            }

            case StatusType.Waiting: {
                waiting += 1;

                break;
            }
        }
    }

    return {
        active,
        failed,
        finished,
        total: flows.length,
        waiting,
    };
};
