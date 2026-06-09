import type { ComponentType } from 'react';

import {
    useFlowQuery,
    useFlowTemplateQuery,
    useKnowledgeDocumentQuery,
    useSettingsProvidersQuery,
} from '@/graphql/types';

import { apolloTitle } from './apollo-title';
import { formatPromptId } from './format-prompt-id';
import { type RouteParams } from './render-title';

export interface RouteTitleHandle {
    title: TitleResolver;
}

/**
 * A `handle.title` value can be one of three forms:
 *   - `string` — fully static, known at build time.
 *   - `(params) => string` — derived synchronously from URL params.
 *   - `ComponentType<{ params }>` — reactive (e.g. subscribes to Apollo
 *     cache for resource-driven titles). Must be produced by `apolloTitle()`
 *     so the marker it attaches lets `DocumentTitle` distinguish a component
 *     from a `(params) => string` resolver at runtime. A hand-rolled component
 *     function will be misdetected as a resolver and called with raw params —
 *     always route reactive titles through `apolloTitle()`.
 */
export type TitleResolver = ((params: RouteParams) => string) | ComponentType<{ params: RouteParams }> | string;

/**
 * Single source of truth for every route's document `<title>`. `app.tsx`
 * imports nothing from Apollo for title purposes — it only spreads handles
 * from this registry onto the matching <Route>.
 */
export const routeTitles = {
    apiTokens: { title: 'API 토큰' },
    dashboard: { title: '대시보드' },
    flow: {
        title: apolloTitle({
            select: (data, { flowId }) =>
                data?.flow?.title && flowId ? `점검 #${flowId} — ${data.flow.title}` : '점검',
            useQuery: useFlowQuery,
            variables: ({ flowId }) => (flowId ? { id: flowId } : null),
        }),
    },
    flowReport: { title: '점검 보고서' },
    flows: { title: '점검 내역' },
    knowledge: {
        title: apolloTitle({
            select: (data, { knowledgeId }) =>
                knowledgeId === 'new' ? '새 지식 문서' : data?.knowledgeDocument?.question || '지식',
            useQuery: useKnowledgeDocumentQuery,
            variables: ({ knowledgeId }) => (!knowledgeId || knowledgeId === 'new' ? null : { id: knowledgeId }),
        }),
    },
    knowledges: { title: '지식' },
    login: { title: '로그인' },
    newFlow: { title: '새 점검' },
    oauth: { title: 'OAuth' },
    prompt: {
        title: (params: RouteParams) => (params.promptId ? formatPromptId(params.promptId) : '프롬프트'),
    },
    prompts: { title: '프롬프트' },

    provider: {
        title: apolloTitle({
            select: (data, { providerId }) => {
                if (providerId === 'new') {
                    return '새 Provider';
                }

                const provider = data?.settingsProviders.userDefined?.find(
                    (candidate) => String(candidate.id) === providerId,
                );

                return provider?.name || 'Provider';
            },
            useQuery: useSettingsProvidersQuery,
            variables: ({ providerId }) => (providerId === 'new' ? null : {}),
        }),
    },

    providers: { title: 'Provider' },

    resources: { title: '자료' },

    template: {
        title: apolloTitle({
            select: (data, { templateId }) =>
                templateId === 'new' ? '새 보고서 템플릿' : data?.flowTemplate?.title || '보고서 템플릿',
            useQuery: useFlowTemplateQuery,
            variables: ({ templateId }) => (!templateId || templateId === 'new' ? null : { templateId }),
        }),
    },

    templates: { title: '보고서 템플릿' },
} as const satisfies Record<string, RouteTitleHandle>;
