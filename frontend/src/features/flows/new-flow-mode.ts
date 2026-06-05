export type FlowCreationMode = 'expert' | 'simple';
export type NewFlowType = 'assistant' | 'automation';

export const resolveFlowCreationMode = (mode: null | string): FlowCreationMode => {
    if (mode === 'expert') {
        return 'expert';
    }

    return 'simple';
};

export const resolveNewFlowType = (value: string): NewFlowType | null => {
    if (value === 'automation' || value === 'assistant') {
        return value;
    }

    return null;
};

export const getNextFlowModeSearchParams = (searchParams: URLSearchParams, mode: FlowCreationMode): URLSearchParams => {
    const nextSearchParams = new URLSearchParams(searchParams);

    nextSearchParams.set('mode', mode);

    return nextSearchParams;
};
