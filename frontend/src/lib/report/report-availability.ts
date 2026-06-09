import type { AssistantLogFragmentFragment, FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

interface FlowReportAvailability {
    readonly available: boolean;
    readonly disabled: boolean;
}

interface FlowReportAvailabilityInput {
    readonly assistantLogs: readonly AssistantLogFragmentFragment[];
    readonly flow?: FlowFragmentFragment | null;
    readonly flowId?: null | string;
    readonly hasAssistantSession?: boolean;
    readonly tasks: readonly TaskFragmentFragment[];
}

const hasMeaningfulAssistantLog = (log: AssistantLogFragmentFragment): boolean => {
    return Boolean(log.message.trim() || log.result.trim() || log.thinking?.trim());
};

export const getFlowReportAvailability = ({
    assistantLogs,
    flow,
    flowId,
    hasAssistantSession = false,
    tasks,
}: FlowReportAvailabilityInput): FlowReportAvailability => {
    const hasFlowTarget = Boolean(flow && flowId);
    const hasReportEvidence = tasks.length > 0 || hasAssistantSession || assistantLogs.some(hasMeaningfulAssistantLog);
    const available = hasFlowTarget && hasReportEvidence;

    return {
        available,
        disabled: !available,
    };
};
