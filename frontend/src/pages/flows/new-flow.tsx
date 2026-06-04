import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlowForm, type FlowFormValues } from '@/features/flows/flow-form';
import {
    getNextFlowModeSearchParams,
    type NewFlowType,
    resolveFlowCreationMode,
    resolveNewFlowType,
} from '@/features/flows/new-flow-mode';
import { ExpertFlowBrief, FlowModeSelector, SimpleFlowBrief } from '@/features/flows/new-flow-mode-panel';
import { useFlows } from '@/providers/flows-provider';
import { useProviders } from '@/providers/providers-provider';
import { useSystemSettings } from '@/providers/system-settings-provider';

function NewFlow() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const { selectedProvider } = useProviders();
    const { createFlow, createFlowWithAssistant } = useFlows();
    const { settings } = useSystemSettings();

    const [isLoading, setIsLoading] = useState(false);
    const [flowType, setFlowType] = useState<NewFlowType>('automation');

    const mode = resolveFlowCreationMode(searchParams.get('mode'));
    const activeFlowType: NewFlowType = mode === 'simple' ? 'automation' : flowType;

    useEffect(() => {
        if (mode) {
            window.scrollTo({ left: 0, top: 0 });
        }
    }, [mode]);

    const shouldUseAgents = useMemo(() => {
        return settings?.assistantUseAgents ?? false;
    }, [settings?.assistantUseAgents]);

    const handleSubmit = async (values: FlowFormValues) => {
        if (isLoading) {
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

    const placeholder =
        activeFlowType === 'automation'
            ? mode === 'simple'
                ? 'Name the authorized target, scope, and security outcome you want checked...'
                : 'Describe what you would like AegisX to test...'
            : 'What would you like me to help you with?';

    return (
        <>
            <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator
                    className="mr-2 h-4 shrink-0"
                    orientation="vertical"
                />
                <Breadcrumb className="min-w-0 flex-1">
                    <BreadcrumbList className="min-w-0 flex-nowrap">
                        <BreadcrumbItem className="min-w-0">
                            <BreadcrumbPage className="min-w-0 truncate">New flow</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </header>
            <main className="bg-muted/30 min-h-[calc(100dvh-3rem)] p-4 md:p-6">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                    <section className="grid gap-3 text-center md:text-left">
                        <h1 className="text-3xl font-semibold">Create a new flow</h1>
                        <p className="text-muted-foreground max-w-3xl">
                            Start with a guided security check or open the full AegisX expert controls.
                        </p>
                    </section>

                    <FlowModeSelector
                        disabled={isLoading}
                        mode={mode}
                        onModeChange={handleModeChange}
                    />

                    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle>
                                    {mode === 'simple' ? 'Guided launch' : 'Expert flow configuration'}
                                </CardTitle>
                                <CardDescription>
                                    {mode === 'simple'
                                        ? 'Create an automation flow with a focused, authorized objective.'
                                        : 'Choose the execution style, provider, resources, templates, and agent setting.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {mode === 'expert' && (
                                    <Tabs
                                        onValueChange={handleFlowTypeChange}
                                        value={flowType}
                                    >
                                        <TabsList className="grid w-full grid-cols-2">
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
                                )}
                                <FlowForm
                                    defaultValues={{
                                        providerName: selectedProvider?.name ?? '',
                                        useAgents: shouldUseAgents,
                                    }}
                                    isSubmitting={isLoading}
                                    onSubmit={handleSubmit}
                                    placeholder={!isLoading ? placeholder : 'Creating a new flow...'}
                                    type={activeFlowType}
                                />
                            </CardContent>
                        </Card>
                        {mode === 'simple' ? <SimpleFlowBrief /> : <ExpertFlowBrief flowType={activeFlowType} />}
                    </div>
                </div>
            </main>
        </>
    );
}

export default NewFlow;
