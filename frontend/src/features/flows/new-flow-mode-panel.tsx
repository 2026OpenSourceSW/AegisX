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

const simpleHighlights = ['목적 기반 안내 프롬프트', '빠른 점검 시작', '보고서 중심 결과'];
const expertHighlights = ['Automation 또는 Assistant', 'Provider와 자료 제어', 'Agent 실행 옵션'];

export function FlowModeSelector({ disabled, mode, onModeChange }: FlowModeSelectorProps) {
    return (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <ModeCard
                cta="Simple Mode 사용"
                description="승인된 대상을 쉽게 점검"
                disabled={disabled}
                highlights={simpleHighlights}
                icon={<Shield className="size-6" />}
                isSelected={mode === 'simple'}
                mode="simple"
                onSelect={onModeChange}
                title="Simple Mode"
            />
            <ModeCard
                cta="Expert Mode 열기"
                description="고급 실행을 위한 전체 제어"
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
        description: '소유한 자산, 점검 범위, 기대하는 보안 결과를 지정합니다.',
        title: '승인된 대상',
    },
    {
        description: '외부 노출, 웹 앱, 관리자 화면, 기본 점검 중 목적을 선택합니다.',
        title: '시나리오',
    },
    {
        description: '실행 전 프롬프트, provider, 자료, 템플릿 맥락을 확인합니다.',
        title: '실행 전 확인',
    },
    {
        description: '실행 흐름을 추적하고 생성된 보고서를 확인합니다.',
        title: '진행 및 보고서',
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
                <CardTitle>전체 실행 제어</CardTitle>
                <CardDescription>고급 선택지를 숨기지 않고 기존 AegisX 실행 기능을 그대로 사용합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
                <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                    <Terminal className="text-primary mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">Automation 또는 Assistant</p>
                        <p className="text-muted-foreground">점검 흐름을 시작하기 전에 실행 방식을 선택합니다.</p>
                    </div>
                </div>
                <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                    <FileText className="text-primary mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">템플릿 및 자료</p>
                        <p className="text-muted-foreground">기존 피커로 라이브러리 맥락과 첨부 자료를 연결합니다.</p>
                    </div>
                </div>
                <div className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
                    <Clock className="text-primary mt-0.5 size-4 shrink-0" />
                    <div>
                        <p className="font-medium">상세 실행 경로</p>
                        <p className="text-muted-foreground">Flow 탭, 로그, 대시보드, 보고서로 이어서 분석합니다.</p>
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
                <CardTitle>안내형 보안 점검</CardTitle>
                <CardDescription>Provider와 자료 제어는 유지하면서 안내 순서에 따라 점검을 준비합니다.</CardDescription>
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
