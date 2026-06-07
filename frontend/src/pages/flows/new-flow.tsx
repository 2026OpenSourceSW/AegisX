import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AegisXPageTopbar from '@/components/layouts/aegisx-page-topbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlowForm, type FlowFormValues } from '@/features/flows/flow-form';
import {
    getNextFlowModeSearchParams,
    type NewFlowType,
    resolveFlowCreationMode,
    resolveNewFlowType,
} from '@/features/flows/new-flow-mode';
import { ExpertFlowBrief } from '@/features/flows/new-flow-mode-panel';
import { buildSimpleModeMessage } from '@/features/flows/simple-mode-report-guidance';
import { defaultScenario, scenarioOptions } from '@/features/flows/simple-mode-scenarios';
import { SimpleModeWorkspace } from '@/features/flows/simple-mode-workspace';
import { useFlows } from '@/providers/flows-provider';
import { useProviders } from '@/providers/providers-provider';
import { useSystemSettings } from '@/providers/system-settings-provider';

interface ExpertModeWorkspaceProps {
    readonly activeFlowType: NewFlowType;
    readonly defaultValues: Partial<FlowFormValues>;
    readonly flowType: NewFlowType;
    readonly isLoading: boolean;
    readonly onFlowTypeChange: (value: string) => void;
    readonly onSubmit: (values: FlowFormValues) => Promise<void>;
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
        activeFlowType === 'automation' ? 'AegisX가 점검할 내용을 입력하세요...' : '무엇을 도와드릴까요?';

    return (
        <main className="bg-background min-h-[calc(100dvh-4rem)] px-4 py-8 md:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-6">
                <section>
                    <h1 className="text-foreground text-3xl leading-10 font-bold">Expert Mode 콘솔</h1>
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
                                    실행 방식, 공급자, 자료, 템플릿, 에이전트 설정을 그대로 제어합니다.
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
                                        자동 점검
                                    </TabsTrigger>
                                    <TabsTrigger
                                        disabled={isLoading}
                                        value="assistant"
                                    >
                                        어시스턴트
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

        return buildSimpleModeMessage({
            promptMarker: selectedScenario.promptMarker,
            scenarioIntent: selectedScenario.promptIntent,
            scenarioTitle: selectedScenario.title,
            target: trimmedTarget,
        });
    }, [
        isSimpleReady,
        selectedScenario.promptIntent,
        selectedScenario.promptMarker,
        selectedScenario.title,
        trimmedTarget,
    ]);

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

export default NewFlow;
