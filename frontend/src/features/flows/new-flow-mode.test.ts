import { describe, expect, it } from 'vitest';

import { getNextFlowModeSearchParams, resolveFlowCreationMode, resolveNewFlowType } from './new-flow-mode';

describe('resolveFlowCreationMode', () => {
    it('returns expert when the URL asks for expert mode', () => {
        expect(resolveFlowCreationMode('expert')).toBe('expert');
    });

    it('falls back to simple mode when the URL mode is missing or unknown', () => {
        expect(resolveFlowCreationMode(null)).toBe('simple');
        expect(resolveFlowCreationMode('legacy')).toBe('simple');
    });
});

describe('resolveNewFlowType', () => {
    it('accepts existing automation and assistant flow types', () => {
        expect(resolveNewFlowType('automation')).toBe('automation');
        expect(resolveNewFlowType('assistant')).toBe('assistant');
    });

    it('rejects unknown flow tab values', () => {
        expect(resolveNewFlowType('simple')).toBeNull();
    });
});

describe('getNextFlowModeSearchParams', () => {
    it('updates only the mode search parameter', () => {
        const searchParams = new URLSearchParams('mode=simple&tab=automation');
        const nextSearchParams = getNextFlowModeSearchParams(searchParams, 'expert');

        expect(nextSearchParams.get('mode')).toBe('expert');
        expect(nextSearchParams.get('tab')).toBe('automation');
    });
});
