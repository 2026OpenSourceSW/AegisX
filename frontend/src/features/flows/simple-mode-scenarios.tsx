import type { ReactNode } from 'react';

import { AlertTriangle, Clock3, Globe2, PanelTop, ShieldPlus } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ScenarioOption {
    readonly description: string;
    readonly duration: string;
    readonly icon: ReactNode;
    readonly id: string;
    readonly promptIntent: string;
    readonly risk: 'Low' | 'Medium';
    readonly title: string;
}

export const defaultScenario: ScenarioOption = {
    description: '외부에서 접근 가능한 포트 및 서비스 노출 여부를 빠르게 확인합니다.',
    duration: '점검 후 산정',
    icon: <Globe2 className="size-5" />,
    id: 'exposure',
    promptIntent: '외부에서 접근 가능한 포트와 서비스를 확인하고, 중요한 노출 위험만 요약합니다.',
    risk: 'Low',
    title: '외부 노출 점검',
};

export const scenarioOptions: readonly ScenarioOption[] = [
    defaultScenario,
    {
        description: '웹 애플리케이션의 일반적인 보안 취약점을 점검합니다.',
        duration: '점검 후 산정',
        icon: <PanelTop className="size-5" />,
        id: 'web-basic',
        promptIntent: '웹 애플리케이션의 기본 보안 상태를 점검하고, 발견 가능성이 높은 문제를 쉽게 설명합니다.',
        risk: 'Low',
        title: '웹사이트 기본 점검',
    },
    {
        description: '알려진 관리자 경로 및 기본 인증 우회 가능성을 점검합니다.',
        duration: '점검 후 산정',
        icon: <AlertTriangle className="size-5" />,
        id: 'admin-surface',
        promptIntent: '무차별 대입 없이 노출된 관리자 화면과 취약한 기본 접근 경로를 확인합니다.',
        risk: 'Medium',
        title: '관리자 페이지 노출 점검',
    },
    {
        description: '네트워크 및 웹 애플리케이션 취약점을 포괄적으로 분석합니다.',
        duration: '점검 후 산정',
        icon: <ShieldPlus className="size-5" />,
        id: 'baseline',
        promptIntent: '기본 보안 상태를 넓게 검토하고, 바로 조치할 수 있는 핵심 항목 1~2개를 우선 정리합니다.',
        risk: 'Medium',
        title: '종합 보안 점검',
    },
];

interface ScenarioCardProps {
    readonly isSelected: boolean;
    readonly onSelect: () => void;
    readonly scenario: ScenarioOption;
}

export function ScenarioCard({ isSelected, onSelect, scenario }: ScenarioCardProps) {
    const riskTone = scenario.risk === 'Low' ? 'text-emerald-700' : 'text-orange-700';

    return (
        <button
            aria-pressed={isSelected}
            className={cn(
                'bg-card hover:border-primary/60 focus-visible:ring-ring relative flex min-h-44 min-w-0 flex-col rounded-xl border p-6 text-left shadow-[0px_4px_12px_rgba(26,43,75,0.03)] transition hover:shadow-md focus-visible:ring-2 focus-visible:outline-hidden',
                isSelected && 'border-primary bg-primary/5 ring-primary ring-1',
            )}
            onClick={onSelect}
            type="button"
        >
            <span
                className={cn(
                    'absolute top-6 right-6 grid size-5 place-items-center rounded-full border-2',
                    isSelected ? 'border-primary' : 'border-border',
                )}
            >
                {isSelected && <span className="bg-primary size-2.5 rounded-full" />}
            </span>
            <div className="mb-4 flex min-w-0 items-center gap-3 pr-8">
                <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
                    {scenario.icon}
                </span>
                <h3 className="text-foreground min-w-0 text-xl leading-7 font-bold">{scenario.title}</h3>
            </div>
            <p className="text-muted-foreground min-h-12 text-sm leading-6">{scenario.description}</p>
            <div className="text-muted-foreground mt-auto flex flex-wrap gap-4 pt-5 text-sm font-medium">
                <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-4" />
                    {scenario.duration}
                </span>
                <span className={cn('inline-flex items-center gap-1.5', riskTone)}>
                    <span className="size-2 rounded-full bg-current" />
                    위험도 {scenario.risk === 'Low' ? '낮음' : '중간'}
                </span>
            </div>
        </button>
    );
}
