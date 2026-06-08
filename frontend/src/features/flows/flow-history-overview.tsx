import { Activity, CheckCircle2, Clock3, GitFork, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { summarizeFlowHistory } from '@/features/flows/flow-history-summary';
import { cn } from '@/lib/utils';
import type { Flow } from '@/providers/flows-provider';

interface FlowHistoryOverviewProps {
    flows: readonly Flow[];
}

export function FlowHistoryOverview({ flows }: FlowHistoryOverviewProps) {
    const summary = summarizeFlowHistory(flows);
    const metrics = [
        {
            icon: <GitFork className="size-4" />,
            label: '전체',
            value: summary.total,
            variant: 'text-primary',
        },
        {
            icon: <Activity className="size-4" />,
            label: '진행 중',
            value: summary.active,
            variant: 'text-blue-600',
        },
        {
            icon: <Clock3 className="size-4" />,
            label: '대기 중',
            value: summary.waiting,
            variant: 'text-yellow-600',
        },
        {
            icon: <CheckCircle2 className="size-4" />,
            label: '완료',
            value: summary.finished,
            variant: 'text-green-600',
        },
        {
            icon: <TriangleAlert className="size-4" />,
            label: '실패',
            value: summary.failed,
            variant: 'text-red-600',
        },
    ];

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
                <Card
                    className="rounded-lg"
                    key={metric.label}
                >
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className={cn('bg-muted rounded-lg p-2', metric.variant)}>{metric.icon}</div>
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-sm font-medium">{metric.label}</p>
                            <p className="text-2xl font-semibold tabular-nums">{metric.value}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </section>
    );
}
