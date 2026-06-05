import type { ReactNode } from 'react';

import { CheckCircle2, Clock, FileText, Shield, Terminal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import type { FlowCreationMode, NewFlowType } from './new-flow-mode';

interface FlowModeSelectorProps {
    disabled?: boolean;
    mode: FlowCreationMode;
    onModeChange: (mode: FlowCreationMode) => void;
}

interface ModeCardProps {
    cta: string;
    description: string;
    disabled?: boolean;
    highlights: readonly string[];
    icon: ReactNode;
    isSelected: boolean;
    mode: FlowCreationMode;
    onSelect: (mode: FlowCreationMode) => void;
    title: string;
}

const simpleHighlights = ['Guided objective prompt', 'Low-friction launch', 'Report-focused output'];
const expertHighlights = ['Automation or Assistant', 'Provider and context controls', 'Agent execution options'];

export function FlowModeSelector({ disabled, mode, onModeChange }: FlowModeSelectorProps) {
    return (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <ModeCard
                cta="Use Simple Mode"
                description="Guided checks for authorized targets"
                disabled={disabled}
                highlights={simpleHighlights}
                icon={<Shield className="size-6" />}
                isSelected={mode === 'simple'}
                mode="simple"
                onSelect={onModeChange}
                title="Simple Mode"
            />
            <ModeCard
                cta="Open Expert Mode"
                description="Full AegisX controls for advanced runs"
                disabled={disabled}
                highlights={expertHighlights}
                icon={<Terminal className="size-6" />}
                isSelected={mode === 'expert'}
                mode="expert"
                onSelect={onModeChange}
                title="Expert Mode"
            />
        </div>
    );
}

function ModeCard({ cta, description, disabled, highlights, icon, isSelected, mode, onSelect, title }: ModeCardProps) {
    return (
        <button
            aria-pressed={isSelected}
            className={cn(
                'group bg-card hover:border-primary/60 focus-visible:ring-ring flex min-h-56 w-full min-w-0 flex-col rounded-lg border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-60',
                isSelected && 'border-primary bg-primary/5 ring-primary/20 shadow-md ring-1',
            )}
            disabled={disabled}
            onClick={() => onSelect(mode)}
            type="button"
        >
            <div
                className={cn(
                    'bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-lg',
                    isSelected && 'bg-primary/10 text-primary',
                )}
            >
                {icon}
            </div>
            <div className="flex flex-1 flex-col gap-3">
                <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-primary mt-1 text-sm font-medium">{description}</p>
                </div>
                <ul className="text-muted-foreground grid gap-2 text-sm">
                    {highlights.map((highlight) => (
                        <li
                            className="flex items-center gap-2"
                            key={highlight}
                        >
                            <CheckCircle2 className="text-primary size-4 shrink-0" />
                            <span>{highlight}</span>
                        </li>
                    ))}
                </ul>
                <span
                    className={cn(
                        'mt-auto inline-flex h-9 w-full min-w-0 items-center justify-center rounded-lg border px-3 text-sm font-semibold',
                        isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-primary/40 text-primary group-hover:bg-primary/10',
                    )}
                >
                    {cta}
                </span>
            </div>
        </button>
    );
}

const simpleSteps = [
    {
        description: 'Name the owned asset, scope, and expected security outcome.',
        title: 'Authorized target',
    },
    {
        description: 'Frame the run as exposure, web app, admin surface, or broad baseline review.',
        title: 'Scenario',
    },
    {
        description: 'Confirm the prompt, provider, resources, and template context before launch.',
        title: 'Review launch',
    },
    {
        description: 'Track execution in the flow console, then read the generated report.',
        title: 'Progress and report',
    },
];

interface ExpertFlowBriefProps {
    flowType: NewFlowType;
}

export function ExpertFlowBrief({ flowType }: ExpertFlowBriefProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">Expert Mode</Badge>
                    <span className="text-muted-foreground text-xs font-medium capitalize">{flowType}</span>
                </div>
                <CardTitle>Full control surface</CardTitle>
                <CardDescription>Use the existing AegisX run controls without hiding advanced choices.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
                <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                    <Terminal className="text-primary mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">Automation or Assistant</p>
                        <p className="text-muted-foreground">Switch execution style before launching the flow.</p>
                    </div>
                </div>
                <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                    <FileText className="text-primary mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">Templates and resources</p>
                        <p className="text-muted-foreground">Attach library context through the existing picker.</p>
                    </div>
                </div>
                <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                    <Clock className="text-primary mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">Detailed execution path</p>
                        <p className="text-muted-foreground">Continue into flow tabs, logs, dashboard, and reports.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function SimpleFlowBrief() {
    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <Badge variant="blue">Simple Mode</Badge>
                    <span className="text-muted-foreground text-xs font-medium">Step 1 of 4</span>
                </div>
                <CardTitle>Guided security check</CardTitle>
                <CardDescription>
                    Follow the guided setup order without losing provider or context controls.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Progress
                    aria-label="Simple mode progress"
                    value={25}
                />
                <ol className="grid gap-3">
                    {simpleSteps.map((step, index) => (
                        <li
                            className="flex gap-3"
                            key={step.title}
                        >
                            <span
                                className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                                    index === 0
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background text-muted-foreground',
                                )}
                            >
                                {index + 1}
                            </span>
                            <div>
                                <p className="text-sm font-medium">{step.title}</p>
                                <p className="text-muted-foreground text-sm">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
}
