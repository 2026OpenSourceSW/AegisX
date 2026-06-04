import { describe, expect, it } from 'vitest';

import { ProviderType } from '@/graphql/types';

import {
    summarizeKnowledges,
    summarizeProviders,
    summarizeResources,
    summarizeTemplates,
} from './supporting-page-summary';

describe('supporting page summaries', () => {
    it('counts resources by file and folder', () => {
        expect(summarizeResources([{ isDir: true }, { isDir: false }, { isDir: false }])).toEqual({
            files: 2,
            folders: 1,
            total: 3,
        });
    });

    it('counts ready and empty templates', () => {
        expect(summarizeTemplates([{ text: 'Scope checklist' }, { text: '   ' }])).toEqual({
            empty: 1,
            ready: 1,
            total: 2,
        });
    });

    it('counts manual, agent, and flow-linked knowledge documents', () => {
        expect(
            summarizeKnowledges([{ flowId: '101', manual: true }, { flowId: null, manual: false }, { flowId: 202 }]),
        ).toEqual({
            agent: 2,
            linkedFlows: 2,
            manual: 1,
            total: 3,
        });
    });

    it('counts configured providers and DeepSeek entries', () => {
        expect(
            summarizeProviders([
                { type: ProviderType.Deepseek },
                { type: ProviderType.Openai },
                { type: ProviderType.Openai },
            ]),
        ).toEqual({
            deepseek: 1,
            total: 3,
            types: 2,
        });
    });
});
