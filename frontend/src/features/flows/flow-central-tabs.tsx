import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FlowDashboard from '@/features/flows/dashboard/flow-dashboard';
import FlowAssistantMessages from '@/features/flows/messages/flow-assistant-messages';
import FlowAutomationMessages from '@/features/flows/messages/flow-automation-messages';
import { useFlowTabDetection } from '@/hooks/use-flow-tab-detection';

function FlowCentralTabs() {
    const { handleTabChange, resolvedTab } = useFlowTabDetection();

    return (
        <Tabs
            className="flex size-full flex-col"
            onValueChange={handleTabChange}
            value={resolvedTab}
        >
            <div className="bg-card max-w-full rounded-xl border p-2 shadow-sm">
                <ScrollArea className="w-full pb-3">
                    <TabsList className="bg-muted/80 flex w-fit">
                        <TabsTrigger value="automation">자동 점검</TabsTrigger>
                        <TabsTrigger value="assistant">어시스턴트</TabsTrigger>
                        <TabsTrigger value="dashboard">요약</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            <TabsContent
                className="mt-3 flex-1 overflow-auto pr-4"
                value="automation"
            >
                <FlowAutomationMessages />
            </TabsContent>
            <TabsContent
                className="mt-3 flex-1 overflow-auto pr-4"
                value="assistant"
            >
                <FlowAssistantMessages />
            </TabsContent>
            <TabsContent
                className="mt-3 flex-1 overflow-auto pr-4"
                value="dashboard"
            >
                <FlowDashboard />
            </TabsContent>
        </Tabs>
    );
}

export default FlowCentralTabs;
