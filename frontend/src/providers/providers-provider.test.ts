import { describe, expect, it } from 'vitest';

import { ProviderType } from '@/graphql/types';

import { resolveSelectedProviderName } from './providers-provider';

const anthropicProvider = {
    name: 'anthropic',
    type: ProviderType.Anthropic,
};

const deepSeekProvider = {
    name: 'deepseek',
    type: ProviderType.Deepseek,
};

describe('resolveSelectedProviderName', () => {
    it('keeps the saved provider when it is still available', () => {
        const selectedName = resolveSelectedProviderName([anthropicProvider, deepSeekProvider], 'deepseek');

        expect(selectedName).toBe('deepseek');
    });

    it('falls back to the first available provider when localStorage points at a deleted provider', () => {
        const selectedName = resolveSelectedProviderName([anthropicProvider], 'deepseek');

        expect(selectedName).toBe('anthropic');
    });

    it('clears the saved provider when no providers are available', () => {
        const selectedName = resolveSelectedProviderName([], 'deepseek');

        expect(selectedName).toBeNull();
    });
});
