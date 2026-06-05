import { useEffect, useRef } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlowAgents from '@/features/flows/agents/flow-agents';
import FlowDashboard from '@/features/flows/dashboard/flow-dashboard';
import FlowFiles from '@/features/flows/files/flow-files';
import FlowAssistantMessages from '@/features/flows/messages/flow-assistant-messages';
import FlowAutomationMessages from '@/features/flows/messages/flow-automation-messages';
import FlowScreenshots from '@/features/flows/screenshots/flow-screenshots';
import FlowTasks from '@/features/flows/tasks/flow-tasks';
import FlowTerminal from '@/features/flows/terminal/flow-terminal';
import FlowTools from '@/features/flows/tools/flow-tools';
import FlowVectorStores from '@/features/flows/vector-stores/flow-vector-stores';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface FlowTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

function FlowTabs({ activeTab, onTabChange }: FlowTabsProps) {
    const { isDesktop } = useBreakpoint();

    const previousActiveTabRef = useRef<string>(activeTab);

    useEffect(() => {
        if (activeTab === previousActiveTabRef.current) {
            return;
        }

        previousActiveTabRef.current = activeTab;
    }, [activeTab]);

    return (
        <Tabs
            className="flex size-full flex-col"
            onValueChange={onTabChange}
            value={activeTab}
        >
            <div className="bg-card max-w-full rounded-xl border p-2 shadow-sm">
                <ScrollArea className="w-full pb-3">
                    <TabsList className="bg-muted/80 flex w-fit">
                        {!isDesktop && <TabsTrigger value="automation">자동 점검</TabsTrigger>}
                        {!isDesktop && <TabsTrigger value="assistant">어시스턴트</TabsTrigger>}
                        {!isDesktop && <TabsTrigger value="dashboard">요약</TabsTrigger>}
                        <TabsTrigger value="terminal">터미널</TabsTrigger>
                        <TabsTrigger value="tasks">작업</TabsTrigger>
                        <TabsTrigger value="agents">에이전트</TabsTrigger>
                        <TabsTrigger value="tools">검색</TabsTrigger>
                        <TabsTrigger value="vectorStores">벡터 저장소</TabsTrigger>
                        <TabsTrigger value="files">파일</TabsTrigger>
                        <TabsTrigger value="screenshots">스크린샷</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Mobile Tabs only */}
            {!isDesktop && (
                <TabsContent
                    className="mt-1 flex-1 overflow-auto"
                    value="automation"
                >
                    <FlowAutomationMessages className="pr-4" />
                </TabsContent>
            )}
            {!isDesktop && (
                <TabsContent
                    className="mt-1 flex-1 overflow-auto"
                    value="assistant"
                >
                    <FlowAssistantMessages className="pr-4" />
                </TabsContent>
            )}
            {!isDesktop && (
                <TabsContent
                    className="mt-1 flex-1 overflow-auto pr-4"
                    value="dashboard"
                >
                    <FlowDashboard />
                </TabsContent>
            )}

            {/* Desktop and Mobile Tabs */}
            <TabsContent
                className="mt-1 flex-1 overflow-auto"
                value="terminal"
            >
                <FlowTerminal />
            </TabsContent>

            <TabsContent
                className="mt-1 flex-1 overflow-auto pr-4"
                value="tasks"
            >
                <FlowTasks />
            </TabsContent>

            <TabsContent
                className="mt-1 flex-1 overflow-auto pr-4"
                value="agents"
            >
                <FlowAgents />
            </TabsContent>

            <TabsContent
                className="mt-1 flex-1 overflow-auto pr-4"
                value="tools"
            >
                <FlowTools />
            </TabsContent>

            <TabsContent
                className="mt-1 flex-1 overflow-auto pr-4"
                value="vectorStores"
            >
                <FlowVectorStores />
            </TabsContent>

            <TabsContent
                className="mt-1 flex-1 overflow-auto pr-4"
                value="files"
            >
                <FlowFiles />
            </TabsContent>

            <TabsContent
                className="mt-1 flex-1 overflow-auto pr-4"
                value="screenshots"
            >
                <FlowScreenshots />
            </TabsContent>
        </Tabs>
    );
}

export default FlowTabs;
