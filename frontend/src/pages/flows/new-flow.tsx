import type { ReactNode } from 'react';

import { AlertTriangle, Clock3, Globe2, Info, ListChecks, PanelTop, ShieldCheck, ShieldPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AegisXPageTopbar from '@/components/layouts/aegisx-page-topbar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlowForm, type FlowFormValues } from '@/features/flows/flow-form';
import {
    getNextFlowModeSearchParams,
    type NewFlowType,
    resolveFlowCreationMode,
    resolveNewFlowType,
} from '@/features/flows/new-flow-mode';
import { ExpertFlowBrief } from '@/features/flows/new-flow-mode-panel';
import { cn } from '@/lib/utils';
import { useFlows } from '@/providers/flows-provider';
import { useProviders } from '@/providers/providers-provider';
import { useSystemSettings } from '@/providers/system-settings-provider';

interface ScenarioOption {
    readonly description: string;
    readonly duration: string;
    readonly icon: ReactNode;
    readonly id: string;
    readonly promptIntent: string;
    readonly risk: 'Low' | 'Medium';
    readonly title: string;
}

const defaultScenario: ScenarioOption = {
    description: '외부에서 접근 가능한 포트 및 서비스 노출 여부를 빠르게 확인합니다.',
    duration: '3-5 min',
    icon: <Globe2 className="size-5" />,
    id: 'exposure',
    promptIntent: '외부에서 접근 가능한 포트와 서비스를 확인하고, 중요한 노출 위험만 요약합니다.',
    risk: 'Low',
    title: '외부 노출 점검',
};

const scenarioOptions: readonly ScenarioOption[] = [
    defaultScenario,
    {
        description: '웹 애플리케이션의 일반적인 보안 취약점을 점검합니다.',
        duration: '5-10 min',
        icon: <PanelTop className="size-5" />,
        id: 'web-basic',
        promptIntent: '웹 애플리케이션의 기본 보안 상태를 점검하고, 발견 가능성이 높은 문제를 쉽게 설명합니다.',
        risk: 'Low',
        title: '웹사이트 기본 점검',
    },
    {
        description: '알려진 관리자 경로 및 기본 인증 우회 가능성을 점검합니다.',
        duration: '3 min',
        icon: <AlertTriangle className="size-5" />,
        id: 'admin-surface',
        promptIntent: '무차별 대입 없이 노출된 관리자 화면과 취약한 기본 접근 경로를 확인합니다.',
        risk: 'Medium',
        title: '관리자 페이지 노출 점검',
    },
    {
        description: '네트워크 및 웹 애플리케이션 취약점을 포괄적으로 분석합니다.',
        duration: '10-15 min',
        icon: <ShieldPlus className="size-5" />,
        id: 'baseline',
        promptIntent: '기본 보안 상태를 넓게 검토하고, 바로 조치할 수 있는 핵심 항목 1~2개를 우선 정리합니다.',
        risk: 'Medium',
        title: '종합 보안 점검',
    },
];

interface ExpertModeWorkspaceProps {
    readonly activeFlowType: NewFlowType;
    readonly defaultValues: Partial<FlowFormValues>;
    readonly flowType: NewFlowType;
    readonly isLoading: boolean;
    readonly onFlowTypeChange: (value: string) => void;
    readonly onSubmit: (values: FlowFormValues) => Promise<void>;
}

interface SimpleModeWorkspaceProps {
    readonly defaultValues: Partial<FlowFormValues>;
    readonly isLoading: boolean;
    readonly isOwnershipConfirmed: boolean;
    readonly isSimpleReady: boolean;
    readonly onOwnershipChange: (checked: boolean) => void;
    readonly onScenarioChange: (scenarioId: string) => void;
    readonly onSubmit: (values: FlowFormValues) => Promise<void>;
    readonly onTargetChange: (target: string) => void;
    readonly selectedScenario: ScenarioOption;
    readonly selectedScenarioId: string;
    readonly target: string;
}

function ExpertModeWorkspace({
    activeFlowType,
    defaultValues,
    flowType,
    isLoading,
    onFlowTypeChange,
    onSubmit,
}: ExpertModeWorkspaceProps) {
    const placeholder =
        activeFlowType === 'automation'
            ? 'AegisX가 점검할 내용을 입력하세요...'
            : '무엇을 도와드릴까요?';

    return (
        <main className="bg-background min-h-[calc(100dvh-4rem)] px-4 py-8 md:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-6">
                <section>
                    <h1 className="text-foreground text-3xl leading-10 font-bold">Expert Mode Console</h1>
                    <p className="text-muted-foreground mt-3 text-base leading-7">
                        기존 AegisX 기능과 상세 실행 정보를 그대로 확인할 수 있는 전문가 모드입니다.
                    </p>
                </section>

                <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <Card className="rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)]">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold">전문가 실행 설정</h2>
                                <p className="text-muted-foreground mt-1 text-sm leading-6">
                                    실행 방식, provider, resources, templates, agent 설정을 그대로 제어합니다.
                                </p>
                            </div>
                            <Tabs
                                className="w-full sm:w-auto"
                                onValueChange={onFlowTypeChange}
                                value={flowType}
                            >
                                <TabsList className="grid w-full grid-cols-2 sm:w-64">
                                    <TabsTrigger
                                        disabled={isLoading}
                                        value="automation"
                                    >
                                        Automation
                                    </TabsTrigger>
                                    <TabsTrigger
                                        disabled={isLoading}
                                        value="assistant"
                                    >
                                        Assistant
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <FlowForm
                            defaultValues={defaultValues}
                            isSubmitting={isLoading}
                            onSubmit={onSubmit}
                            placeholder={!isLoading ? placeholder : '새 점검 흐름을 생성하는 중입니다...'}
                            submitLabel="실행 시작"
                            type={activeFlowType}
                        />
                    </Card>

                    <ExpertFlowBrief flowType={activeFlowType} />
                </div>
            </div>
        </main>
    );
}

function NewFlow() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const { selectedProvider } = useProviders();
    const { createFlow, createFlowWithAssistant } = useFlows();
    const { settings } = useSystemSettings();

    const [isLoading, setIsLoading] = useState(false);
    const [flowType, setFlowType] = useState<NewFlowType>('automation');
    const [target, setTarget] = useState('');
    const [isOwnershipConfirmed, setIsOwnershipConfirmed] = useState(false);
    const [selectedScenarioId, setSelectedScenarioId] = useState(defaultScenario.id);

    const mode = resolveFlowCreationMode(searchParams.get('mode'));
    const activeFlowType: NewFlowType = mode === 'simple' ? 'automation' : flowType;
    const selectedScenario = scenarioOptions.find((scenario) => scenario.id === selectedScenarioId) ?? defaultScenario;
    const trimmedTarget = target.trim();
    const isSimpleReady = trimmedTarget.length > 0 && isOwnershipConfirmed;

    useEffect(() => {
        if (mode === 'expert' || mode === 'simple') {
            window.scrollTo({ left: 0, top: 0 });
        }
    }, [mode]);

    const shouldUseAgents = useMemo(() => {
        return settings?.assistantUseAgents ?? false;
    }, [settings?.assistantUseAgents]);

    const simpleMessage = useMemo(() => {
        if (!isSimpleReady) {
            return '';
        }

        return [
            `승인된 보안 점검 대상: ${trimmedTarget}`,
            `점검 시나리오: ${selectedScenario.title}`,
            `점검 목적: ${selectedScenario.promptIntent}`,
            '안전 범위: 사용자가 선언한 대상만 점검하고, 승인 범위 밖으로 이동하거나 확장하지 않습니다.',
            '결과 형식: 발견 내용을 쉬운 말로 설명하고, 근거와 구체적인 조치 방법을 함께 제안합니다.',
        ].join('\n');
    }, [isSimpleReady, selectedScenario, trimmedTarget]);

    const defaultValues = useMemo<Partial<FlowFormValues>>(
        () => ({
            message: mode === 'simple' ? simpleMessage : undefined,
            providerName: selectedProvider?.name ?? '',
            useAgents: shouldUseAgents,
        }),
        [mode, selectedProvider?.name, shouldUseAgents, simpleMessage],
    );

    const handleSubmit = async (values: FlowFormValues) => {
        if (isLoading || (mode === 'simple' && !isSimpleReady)) {
            return;
        }

        setIsLoading(true);

        try {
            const flowId =
                activeFlowType === 'automation' ? await createFlow(values) : await createFlowWithAssistant(values);

            if (flowId) {
                navigate(`/flows/${flowId}?tab=${activeFlowType}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeChange = (nextMode: typeof mode) => {
        setSearchParams(getNextFlowModeSearchParams(searchParams, nextMode), { replace: true });
    };

    const handleFlowTypeChange = (value: string) => {
        const nextFlowType = resolveNewFlowType(value);

        if (nextFlowType) {
            setFlowType(nextFlowType);
        }
    };

    return (
        <>
            <AegisXPageTopbar
                mode={mode}
                onModeChange={handleModeChange}
                subtitle="보안 점검 워크스페이스"
            />
            {mode === 'simple' ? (
                <SimpleModeWorkspace
                    defaultValues={defaultValues}
                    isLoading={isLoading}
                    isOwnershipConfirmed={isOwnershipConfirmed}
                    isSimpleReady={isSimpleReady}
                    onOwnershipChange={setIsOwnershipConfirmed}
                    onScenarioChange={setSelectedScenarioId}
                    onSubmit={handleSubmit}
                    onTargetChange={setTarget}
                    selectedScenario={selectedScenario}
                    selectedScenarioId={selectedScenarioId}
                    target={target}
                />
            ) : (
                <ExpertModeWorkspace
                    activeFlowType={activeFlowType}
                    defaultValues={defaultValues}
                    flowType={flowType}
                    isLoading={isLoading}
                    onFlowTypeChange={handleFlowTypeChange}
                    onSubmit={handleSubmit}
                />
            )}
        </>
    );
}

function ScenarioCard({
    isSelected,
    onSelect,
    scenario,
}: {
    readonly isSelected: boolean;
    readonly onSelect: () => void;
    readonly scenario: ScenarioOption;
}) {
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

function SimpleModeWorkspace({
    defaultValues,
    isLoading,
    isOwnershipConfirmed,
    isSimpleReady,
    onOwnershipChange,
    onScenarioChange,
    onSubmit,
    onTargetChange,
    selectedScenario,
    selectedScenarioId,
    target,
}: SimpleModeWorkspaceProps) {
    return (
        <main className="bg-background min-h-[calc(100dvh-4rem)] px-4 py-8 md:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-8">
                <section className="max-w-3xl">
                    <h1 className="text-foreground text-3xl leading-10 font-bold">쉬운 보안 점검 시작</h1>
                    <p className="text-muted-foreground mt-3 text-base leading-7">
                        점검할 대상을 입력하고 원하는 점검 목적을 선택하세요. 복잡한 설정 없이 기본 보안 상태를 확인할
                        수 있습니다.
                    </p>
                </section>

                <Card className="overflow-hidden rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)] md:p-8">
                    <div className="grid gap-5">
                        <label
                            className="grid gap-2"
                            htmlFor="simple-target"
                        >
                            <span className="text-foreground text-sm font-bold">점검 대상 (도메인 또는 IP)</span>
                            <Input
                                className="bg-background h-12 rounded-lg pl-4 text-base"
                                id="simple-target"
                                onChange={(event) => onTargetChange(event.target.value)}
                                placeholder="example.com 또는 192.168.0.10"
                                value={target}
                            />
                        </label>

                        <div className="text-foreground flex items-start gap-3 text-sm leading-6">
                            <Checkbox
                                checked={isOwnershipConfirmed}
                                className="mt-1"
                                id="simple-ownership-check"
                                onCheckedChange={(checked) => onOwnershipChange(checked === true)}
                            />
                            <label
                                className="cursor-pointer select-none"
                                htmlFor="simple-ownership-check"
                            >
                                본인이 소유하거나 점검 권한이 있는 대상입니다.
                            </label>
                        </div>

                        <div className="bg-muted/60 text-muted-foreground flex items-start gap-3 rounded-lg border p-4 text-sm leading-6">
                            <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                            <span>등록된 대상 외부로는 점검을 수행하지 않습니다.</span>
                        </div>
                    </div>
                </Card>

                <section className="grid gap-4">
                    <h2 className="text-foreground text-2xl leading-8 font-bold">점검 시나리오 선택</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {scenarioOptions.map((scenario) => (
                            <ScenarioCard
                                isSelected={scenario.id === selectedScenarioId}
                                key={scenario.id}
                                onSelect={() => onScenarioChange(scenario.id)}
                                scenario={scenario}
                            />
                        ))}
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <Card className="rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)]">
                        <div className="mb-5 flex items-center gap-3">
                            <ListChecks className="text-primary size-5" />
                            <h2 className="text-xl font-bold">실행 전 확인</h2>
                        </div>
                        <FlowForm
                            defaultValues={defaultValues}
                            isDisabled={!isSimpleReady}
                            isSubmitting={isLoading}
                            onSubmit={onSubmit}
                            placeholder={
                                isSimpleReady
                                    ? '필요하면 점검 요청을 수정하세요...'
                                    : '대상 입력과 권한 확인을 완료하면 실행 요청이 준비됩니다.'
                            }
                            submitLabel="점검 실행"
                            type="automation"
                        />
                    </Card>

                    <SimpleReviewPanel
                        isReady={isSimpleReady}
                        selectedScenario={selectedScenario}
                        target={target}
                    />
                </section>
            </div>
        </main>
    );
}

function SimpleReviewPanel({
    isReady,
    selectedScenario,
    target,
}: {
    readonly isReady: boolean;
    readonly selectedScenario: ScenarioOption;
    readonly target: string;
}) {
    return (
        <Card className="rounded-xl p-6 shadow-[0px_4px_12px_rgba(26,43,75,0.05)]">
            <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="text-primary size-5" />
                <h2 className="text-xl font-bold">점검 요약 정보</h2>
            </div>
            <dl className="grid gap-5 text-sm">
                <div>
                    <dt className="text-muted-foreground font-semibold">대상</dt>
                    <dd className="text-foreground mt-1 text-base font-bold break-words">
                        {target.trim() || '대상을 입력하세요'}
                    </dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-semibold">시나리오</dt>
                    <dd className="text-foreground mt-1 text-base font-bold">{selectedScenario.title}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-semibold">예상 시간</dt>
                    <dd className="text-foreground mt-1 text-base font-bold">{selectedScenario.duration}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-semibold">위험도</dt>
                    <dd className="mt-1">
                        <Badge variant={selectedScenario.risk === 'Low' ? 'secondary' : 'outline'}>
                            {selectedScenario.risk === 'Low' ? '낮음' : '중간'}
                        </Badge>
                    </dd>
                </div>
            </dl>
            <div
                className={cn(
                    'mt-6 rounded-lg border p-4 text-sm leading-6',
                    isReady ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground',
                )}
            >
                Simple Mode에서는 AegisX 기능을 안전한 점검 워크플로우로 감싸서 제공합니다. 상세 실행 로그는 Expert
                Mode에서 확인할 수 있습니다.
            </div>
        </Card>
    );
}

export default NewFlow;
