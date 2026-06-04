import { ProviderType } from '@/graphql/types';

export interface KnowledgeSummary {
    readonly agent: number;
    readonly linkedFlows: number;
    readonly manual: number;
    readonly total: number;
}

export interface ProviderSummary {
    readonly deepseek: number;
    readonly total: number;
    readonly types: number;
}

export interface ResourceSummary {
    readonly files: number;
    readonly folders: number;
    readonly total: number;
}

export interface TemplateSummary {
    readonly empty: number;
    readonly ready: number;
    readonly total: number;
}

export const summarizeResources = (resources: readonly { readonly isDir: boolean }[]): ResourceSummary => {
    let files = 0;
    let folders = 0;

    for (const resource of resources) {
        if (resource.isDir) {
            folders += 1;
        } else {
            files += 1;
        }
    }

    return {
        files,
        folders,
        total: resources.length,
    };
};

export const summarizeTemplates = (templates: readonly { readonly text: string }[]): TemplateSummary => {
    let empty = 0;
    let ready = 0;

    for (const template of templates) {
        if (template.text.trim().length === 0) {
            empty += 1;
        } else {
            ready += 1;
        }
    }

    return {
        empty,
        ready,
        total: templates.length,
    };
};

export const summarizeKnowledges = (
    knowledges: readonly { readonly flowId?: null | number | string; readonly manual?: boolean | null }[],
): KnowledgeSummary => {
    let agent = 0;
    let linkedFlows = 0;
    let manual = 0;

    for (const knowledge of knowledges) {
        if (knowledge.manual) {
            manual += 1;
        } else {
            agent += 1;
        }

        if (knowledge.flowId !== null && knowledge.flowId !== undefined) {
            linkedFlows += 1;
        }
    }

    return {
        agent,
        linkedFlows,
        manual,
        total: knowledges.length,
    };
};

export const summarizeProviders = (providers: readonly { readonly type: ProviderType }[]): ProviderSummary => {
    let deepseek = 0;
    const providerTypes = new Set<ProviderType>();

    for (const provider of providers) {
        providerTypes.add(provider.type);

        if (provider.type === ProviderType.Deepseek) {
            deepseek += 1;
        }
    }

    return {
        deepseek,
        total: providers.length,
        types: providerTypes.size,
    };
};
