import { describe, expect, it } from 'vitest';

import { StatusType } from '@/graphql/types';

import { summarizeFlowHistory } from './flow-history-summary';

describe('summarizeFlowHistory', () => {
    it('groups created and running flows as active', () => {
        const summary = summarizeFlowHistory([
            { status: StatusType.Created },
            { status: StatusType.Running },
            { status: StatusType.Waiting },
            { status: StatusType.Finished },
            { status: StatusType.Failed },
        ]);

        expect(summary).toEqual({
            active: 2,
            failed: 1,
            finished: 1,
            total: 5,
            waiting: 1,
        });
    });

    it('returns zero counts for an empty history', () => {
        expect(summarizeFlowHistory([])).toEqual({
            active: 0,
            failed: 0,
            finished: 0,
            total: 0,
            waiting: 0,
        });
    });
});
