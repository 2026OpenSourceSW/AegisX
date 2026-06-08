import type { AssistantLogFragmentFragment, FlowFragmentFragment } from '@/graphql/types';

import { MessageLogType } from '@/graphql/types';

const finalMessageTypes: ReadonlySet<MessageLogType> = new Set([
    MessageLogType.Answer,
    MessageLogType.Done,
    MessageLogType.Report,
]);

const getLogContent = (log: AssistantLogFragmentFragment): string => {
    return (log.result.trim() || log.message.trim() || log.thinking?.trim() || '').trim();
};

const getInputScope = (logs: readonly AssistantLogFragmentFragment[]): string => {
    const inputLog = logs.find((log) => log.type === MessageLogType.Input && getLogContent(log).length > 0);

    return inputLog ? getLogContent(inputLog) : '';
};

const getFinalAssistantContent = (logs: readonly AssistantLogFragmentFragment[]): string => {
    const finalLogs = logs.filter((log) => finalMessageTypes.has(log.type) && getLogContent(log).length > 0);
    const lastFinalLog = finalLogs.at(-1);

    return lastFinalLog ? getLogContent(lastFinalLog) : '';
};

export const buildAssistantReportMarkdown = (
    logs: readonly AssistantLogFragmentFragment[],
    flow?: FlowFragmentFragment | null,
): string => {
    const title = flow?.title?.trim() || 'AegisX 점검';
    const scope = getInputScope(logs);
    const finalContent = getFinalAssistantContent(logs);

    if (!finalContent) {
        return `# ${title}\n\n## 어시스턴트 점검 보고서\n\n보고서로 정리할 어시스턴트 응답이 아직 없습니다.`;
    }

    return [
        `# ${title}`,
        '',
        '## 어시스턴트 점검 보고서',
        '',
        'Expert Mode 어시스턴트 대화 기록을 기반으로 생성된 보고서입니다.',
        '',
        ...(scope ? ['### 점검 요청', '', scope, ''] : []),
        '### 점검 결과',
        '',
        finalContent,
    ].join('\n');
};
