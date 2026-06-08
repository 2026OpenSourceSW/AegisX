import { StatusType } from '@/graphql/types';

interface FlowStatusDisplay {
    readonly label: string;
    readonly tooltip: string;
    readonly variant: 'default' | 'destructive' | 'outline' | 'secondary';
}

interface FlowStatusDisplayContext {
    readonly hasAssistantLogs?: boolean;
    readonly hasTasks?: boolean;
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
    if (status === StatusType.Waiting && context.hasAssistantLogs && !context.hasTasks) {
        return {
            label: '어시스턴트 대기',
            tooltip: '어시스턴트 응답 완료, 추가 입력 대기',
            variant: 'outline',
        };
    }

    return defaultStatusDisplay[status];
};
