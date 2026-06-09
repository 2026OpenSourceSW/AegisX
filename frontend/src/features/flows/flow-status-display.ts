import { FlowStateReason, StatusType } from '@/graphql/types';

interface FlowStatusDisplay {
    readonly label: string;
    readonly tooltip: string;
    readonly variant: 'default' | 'destructive' | 'outline' | 'secondary';
}

interface FlowStatusDisplayContext {
    readonly hasAssistantLogs?: boolean;
    readonly hasTasks?: boolean;
    readonly stateReason?: FlowStateReason | null;
}

const defaultStatusDisplay: Record<StatusType, FlowStatusDisplay> = {
    [StatusType.Created]: {
        label: '준비 중',
        tooltip: '점검을 준비하고 있습니다',
        variant: 'outline',
    },
    [StatusType.Failed]: {
        label: '실패',
        tooltip: '점검이 실패했습니다',
        variant: 'destructive',
    },
    [StatusType.Finished]: {
        label: '완료',
        tooltip: '점검이 완료되었습니다',
        variant: 'secondary',
    },
    [StatusType.Running]: {
        label: '진행 중',
        tooltip: '점검이 실행 중입니다',
        variant: 'default',
    },
    [StatusType.Waiting]: {
        label: '대기 중',
        tooltip: '다음 입력 또는 작업을 기다리고 있습니다',
        variant: 'outline',
    },
};

export const getFlowStatusDisplay = (status: StatusType, context: FlowStatusDisplayContext = {}): FlowStatusDisplay => {
    if (context.stateReason && context.stateReason !== FlowStateReason.None) {
        switch (context.stateReason) {
            case FlowStateReason.AssistantIdleAfterResponse:
                return {
                    label: '어시스턴트 대기',
                    tooltip: '어시스턴트 응답 완료, 추가 입력 대기',
                    variant: 'outline',
                };
            case FlowStateReason.AssistantRunning:
                return {
                    label: '어시스턴트 진행',
                    tooltip: '어시스턴트가 요청을 처리하고 있습니다',
                    variant: 'default',
                };
            case FlowStateReason.AutomationWaitingForInput:
                return {
                    label: '입력 대기',
                    tooltip: '자동 점검이 다음 입력을 기다리고 있습니다',
                    variant: 'outline',
                };
            case FlowStateReason.NoTasksForAssistantFlow:
                return {
                    label: '어시스턴트 세션',
                    tooltip: '작업 행이 없는 대화형 어시스턴트 세션입니다',
                    variant: 'secondary',
                };
            case FlowStateReason.TaskRunning:
                return {
                    label: '진행 중',
                    tooltip: '자동 점검 작업이 실행 중입니다',
                    variant: 'default',
                };
        }
    }

    if (status === StatusType.Waiting && context.hasAssistantLogs && !context.hasTasks) {
        return {
            label: '어시스턴트 대기',
            tooltip: '어시스턴트 응답 완료, 추가 입력 대기',
            variant: 'outline',
        };
    }

    return defaultStatusDisplay[status];
};
