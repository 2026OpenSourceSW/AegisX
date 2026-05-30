import {
    AlertTriangle,
    ChevronDown,
    Copy,
    Download,
    ExternalLink,
    FileSearch,
    GripVertical,
    Loader2,
    NotepadText,
    Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { FlowStatusIcon } from '@/components/icons/flow-status-icon';
import { ProviderIcon } from '@/components/icons/provider-icon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import FlowCentralTabs from '@/features/flows/flow-central-tabs';
import FlowTabs from '@/features/flows/flow-tabs';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useFlowTabDetection } from '@/hooks/use-flow-tab-detection';
import { axios } from '@/lib/axios';
import { Log } from '@/lib/log';
import { copyToClipboard, downloadTextFile, generateFileName, generateReport } from '@/lib/report';
import { formatName } from '@/lib/utils/format';
import { useFavorites } from '@/providers/favorites-provider';
import { useFlow } from '@/providers/flow-provider';

const FlowReportDropdown = () => {
    const { flowData, flowId } = useFlow();
    const flow = flowData?.flow;
    const tasks = flowData?.tasks ?? [];

    // Check if flow is available for report generation
    const isReportDisabled = !flow || !flowId;

    // Report export handlers
    const handleCopyToClipboard = async () => {
        if (isReportDisabled) {
            return;
        }

        const reportContent = generateReport(tasks, flow);
        const success = await copyToClipboard(reportContent);

        if (success) {
            toast.success('Report copied to clipboard');
        } else {
            Log.error('Failed to copy report to clipboard');
            toast.error('Failed to copy report to clipboard');
        }
    };

    const handleDownloadMD = () => {
        if (isReportDisabled || !flow) {
            return;
        }

        try {
            // Generate report content
            const reportContent = generateReport(tasks, flow);

            // Generate file name
            const baseFileName = generateFileName(flow);
            const fileName = `${baseFileName}.md`;

            // Download file
            downloadTextFile(reportContent, fileName, 'text/markdown; charset=UTF-8');
        } catch (error) {
            Log.error('Failed to download markdown report:', error);
        }
    };

    const handleDownloadPDF = () => {
        if (isReportDisabled || !flow || !flowId) {
            return;
        }

        // Open new tab (not popup) with report page and download flag
        const url = `/flows/${flowId}/report?download=true&silent=true`;
        window.open(url, '_blank');
    };

    const handleOpenWebView = () => {
        if (isReportDisabled || !flowId) {
            return;
        }

        // Open new tab with report page for web viewing
        const url = `/flows/${flowId}/report`;
        window.open(url, '_blank');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="shrink-0"
                    disabled={isReportDisabled}
                    variant="ghost"
                >
                    <NotepadText />
                    Report
                    <ChevronDown className="opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleOpenWebView}
                >
                    <ExternalLink className="size-4" />
                    Open web view
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleCopyToClipboard}
                >
                    <Copy className="size-4" />
                    Copy to clipboard
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleDownloadMD}
                >
                    <Download className="size-4" />
                    Download MD
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center gap-2"
                    disabled={isReportDisabled}
                    onClick={handleDownloadPDF}
                >
                    <Download className="size-4" />
                    Download PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface ShannonScanResult {
    report?: {
        findings?: Array<unknown>;
    };
}

const ShannonScanDialog = () => {
    const { flowId } = useFlow();
    const [open, setOpen] = useState(false);
    const [targetUrl, setTargetUrl] = useState('');
    const [workspacePath, setWorkspacePath] = useState('');
    const [ownedTargetConfirmed, setOwnedTargetConfirmed] = useState(false);
    const [nonProductionConfirmed, setNonProductionConfirmed] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    const canRun = !!flowId && !!targetUrl.trim() && ownedTargetConfirmed && nonProductionConfirmed && !isRunning;

    const runScan = async () => {
        if (!canRun || !flowId) {
            return;
        }

        setIsRunning(true);
        try {
            const response = await axios.post<ShannonScanResult>(`/flows/${flowId}/shannon/scan`, {
                import_report_as_flow_result: true,
                non_production_confirmed: nonProductionConfirmed,
                owned_target_confirmed: ownedTargetConfirmed,
                target_url: targetUrl.trim(),
                workspace_path: workspacePath.trim(),
            });
            const findingsCount = response.data.report?.findings?.length ?? 0;

            toast.success('Shannon scan completed', {
                description: `${findingsCount} finding${findingsCount === 1 ? '' : 's'} imported into this flow.`,
            });
            setOpen(false);
        } catch (error) {
            const description = error instanceof Error ? error.message : 'An error occurred while running Shannon';
            toast.error('Failed to run Shannon scan', { description });
            Log.error('Error running Shannon scan:', error);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger asChild>
                <Button
                    className="shrink-0"
                    size="icon"
                    title="Run Shannon white-box scan"
                    variant="ghost"
                >
                    <FileSearch />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Run Shannon white-box scan</DialogTitle>
                    <DialogDescription>
                        Shannon runs as an external Advanced Mode helper and imports its markdown report into this flow.
                    </DialogDescription>
                </DialogHeader>

                <Alert>
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Safety confirmation required</AlertTitle>
                    <AlertDescription>
                        Shannon may execute exploit validation. Run it only against systems you own or have explicit
                        permission to test.
                    </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="shannon-target-url">Target URL</Label>
                        <Input
                            id="shannon-target-url"
                            onChange={(event) => setTargetUrl(event.target.value)}
                            placeholder="https://staging.example.com"
                            value={targetUrl}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="shannon-workspace-path">Workspace path</Label>
                        <Input
                            id="shannon-workspace-path"
                            onChange={(event) => setWorkspacePath(event.target.value)}
                            placeholder="Leave empty to use SHANNON_WORKSPACE_DIR"
                            value={workspacePath}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                        <Label
                            className="text-sm leading-snug"
                            htmlFor="shannon-owned-target"
                        >
                            I own this target or have written authorization.
                        </Label>
                        <Switch
                            checked={ownedTargetConfirmed}
                            id="shannon-owned-target"
                            onCheckedChange={setOwnedTargetConfirmed}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                        <Label
                            className="text-sm leading-snug"
                            htmlFor="shannon-non-production"
                        >
                            This is not a production environment.
                        </Label>
                        <Switch
                            checked={nonProductionConfirmed}
                            id="shannon-non-production"
                            onCheckedChange={setNonProductionConfirmed}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        disabled={isRunning}
                        onClick={() => setOpen(false)}
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!canRun}
                        onClick={runScan}
                    >
                        {isRunning && <Loader2 className="animate-spin" />}
                        Run scan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const Flow = () => {
    const { isDesktop } = useBreakpoint();
    const navigate = useNavigate();

    const { flowData, flowError, flowId, isLoading: isFlowLoading } = useFlow();
    const { isFavoriteFlow, toggleFavoriteFlow } = useFavorites();

    // Redirect to flows list if there's an error loading flow data or flow not found
    useEffect(() => {
        if (flowError || (!isFlowLoading && !flowData?.flow)) {
            navigate('/flows', { replace: true });
        }
    }, [flowError, flowData, isFlowLoading, navigate]);

    // Desktop: side panel defaults to 'terminal'
    const [desktopTabsTab, setDesktopTabsTab] = useState<string>('terminal');

    // Mobile: use the same auto-detection logic as FlowCentralTabs
    const { handleTabChange: handleMobileTabChange, resolvedTab: mobileAutoTab } = useFlowTabDetection();

    const activeTabsTab = isDesktop ? desktopTabsTab : mobileAutoTab;
    const handleTabsTabChange = isDesktop ? setDesktopTabsTab : handleMobileTabChange;

    const tabsCard = (
        <div className="flex h-[calc(100dvh-3rem)] max-w-full flex-col rounded-none border-0">
            <div className="flex-1 overflow-auto py-4 pr-0 pl-4">
                <FlowTabs
                    activeTab={activeTabsTab}
                    onTabChange={handleTabsTabChange}
                />
            </div>
        </div>
    );

    return (
        <>
            <header className="bg-background sticky top-0 z-10 flex h-12 w-full shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex w-full items-center justify-between gap-2 px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            className="mr-2 h-4"
                            orientation="vertical"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="gap-2">
                                    {flowData?.flow && (
                                        <>
                                            <FlowStatusIcon
                                                status={flowData.flow.status}
                                                tooltip={formatName(flowData.flow.status)}
                                            />

                                            <ProviderIcon
                                                provider={flowData.flow.provider}
                                                tooltip={formatName(flowData.flow.provider.name)}
                                            />
                                        </>
                                    )}
                                    <BreadcrumbPage>{flowData?.flow?.title || 'Select a flow'}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        {flowId && <ShannonScanDialog />}
                        {flowId && (
                            <Button
                                className="shrink-0"
                                onClick={() => toggleFavoriteFlow(flowId)}
                                size="icon"
                                variant="ghost"
                            >
                                <Star className={isFavoriteFlow(flowId) ? 'fill-yellow-500 stroke-yellow-500' : ''} />
                            </Button>
                        )}
                        {!!(flowData?.tasks ?? [])?.length && <FlowReportDropdown />}
                    </div>
                </div>
            </header>
            <div className="relative flex h-[calc(100dvh-3rem)] w-full max-w-full flex-1">
                {isFlowLoading && (
                    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
                        <Loader2 className="size-16 animate-spin" />
                    </div>
                )}
                {isDesktop ? (
                    <ResizablePanelGroup
                        className="w-full"
                        direction="horizontal"
                    >
                        <ResizablePanel
                            defaultSize={50}
                            minSize={30}
                        >
                            <div className="flex h-[calc(100dvh-3rem)] max-w-full flex-col rounded-none border-0">
                                <div className="flex-1 overflow-auto py-4 pr-0 pl-4">
                                    <FlowCentralTabs />
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle>
                            <GripVertical className="size-4" />
                        </ResizableHandle>
                        <ResizablePanel
                            defaultSize={50}
                            minSize={30}
                        >
                            {tabsCard}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                ) : (
                    tabsCard
                )}
            </div>
        </>
    );
};

export default Flow;
