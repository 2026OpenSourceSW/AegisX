import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EntityMetric {
    readonly icon: ReactNode;
    readonly label: string;
    readonly tone?: string;
    readonly value: ReactNode;
}

interface EntityMetricOverviewProps {
    readonly className?: string;
    readonly metrics: readonly EntityMetric[];
}

export function EntityMetricOverview({ className, metrics }: EntityMetricOverviewProps) {
    return (
        <section className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
            {metrics.map((metric) => (
                <Card
                    className="rounded-lg"
                    key={metric.label}
                >
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className={cn('bg-muted rounded-lg p-2', metric.tone)}>{metric.icon}</div>
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
