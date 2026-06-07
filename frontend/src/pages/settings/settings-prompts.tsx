import type { ColumnDef, Row } from '@tanstack/react-table';

import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Bot,
    Code,
    Ellipsis,
    Loader2,
    Pencil,
    RotateCcw,
    Settings,
    Trash2,
    User,
    Wrench,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AgentPrompt, AgentPrompts, DefaultPrompt, PromptType } from '@/graphql/types';

import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { DataTable } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusCard } from '@/components/ui/status-card';
import { useDeletePromptMutation, useSettingsPromptsQuery } from '@/graphql/types';
import { usePageStorageKeys } from '@/hooks/use-page-storage-keys';

type AgentPromptTableData = {
    displayName: string;
    hasHuman: boolean;
    hasSystem: boolean;
    humanStatus: 'Custom' | 'Default' | 'N/A';
    humanTemplate?: string;
    humanType?: PromptType;
    name: string;
    systemStatus: 'Custom' | 'Default' | 'N/A';
    systemTemplate: string;
    systemType?: PromptType;
};

type ToolPromptTableData = {
    displayName: string;
    name: string;
    promptType?: PromptType;
    status: 'Custom' | 'Default' | 'N/A';
    template: string;
};

function formatPromptStatus(status: 'Custom' | 'Default' | 'N/A') {
    if (status === 'Custom') {
        return '사용자 지정';
    }

    if (status === 'Default') {
        return '기본값';
    }

    return status;
}

function SettingsPrompts() {
    const { data, error, loading: isLoading } = useSettingsPromptsQuery();
    const [deletePrompt, { loading: isDeleteLoading }] = useDeletePromptMutation();
    const navigate = useNavigate();
    // Shared base key for the route; each DataTable appends its own suffix so
    // sorting / column visibility / search-column narrowing live in distinct
    // slots even though the page mounts two tables.
    const { table: tableStorageBase } = usePageStorageKeys();

    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetOperation, setResetOperation] = useState<null | {
        displayName: string;
        promptName: string;
        type: 'all' | 'human' | 'system' | 'tool';
    }>(null);

    // Three-way sorting: null → asc → desc → null.
    const handleColumnSort = (column: {
        clearSorting: () => void;
        getIsSorted: () => 'asc' | 'desc' | false;
        toggleSorting: (desc?: boolean) => void;
    }) => {
        const sorted = column.getIsSorted();

        if (sorted === 'asc') {
            column.toggleSorting(true);
        } else if (sorted === 'desc') {
            column.clearSorting();
        } else {
            column.toggleSorting(false);
        }
    };

    const handlePromptEdit = (promptName: string) => {
        navigate(`/settings/prompts/${promptName}`);
    };

    const handleResetDialogOpen = (
        type: 'all' | 'human' | 'system' | 'tool',
        promptName: string,
        displayName: string,
    ) => {
        setResetOperation({ displayName, promptName, type });
        setResetDialogOpen(true);
    };

    const handleResetPrompt = async () => {
        if (!resetOperation || !data?.settingsPrompts?.default) {
            return;
        }

        try {
            const { promptName, type } = resetOperation;
            const { agents } = data.settingsPrompts.default;
            const { tools } = data.settingsPrompts.default;
            const userDefined = data.settingsPrompts.userDefined || [];

            if (type === 'tool') {
                const toolPrompt = tools?.[promptName as keyof typeof tools];

                if (toolPrompt?.type) {
                    const userPrompt = userDefined.find((p) => p.type === toolPrompt.type);

                    if (userPrompt) {
                        await deletePrompt({
                            refetchQueries: ['settingsPrompts'],
                            variables: { promptId: userPrompt.id },
                        });
                    }
                }
            } else {
                const agentPrompts = agents?.[promptName as keyof typeof agents] as AgentPrompts;

                if (agentPrompts) {
                    const systemType = agentPrompts.system?.type;
                    const humanType = agentPrompts.human?.type;

                    if (type === 'system' && systemType) {
                        const userPrompt = userDefined.find((p) => p.type === systemType);

                        if (userPrompt) {
                            await deletePrompt({
                                refetchQueries: ['settingsPrompts'],
                                variables: { promptId: userPrompt.id },
                            });
                        }
                    } else if (type === 'human' && humanType) {
                        const userPrompt = userDefined.find((p) => p.type === humanType);

                        if (userPrompt) {
                            await deletePrompt({
                                refetchQueries: ['settingsPrompts'],
                                variables: { promptId: userPrompt.id },
                            });
                        }
                    } else if (type === 'all') {
                        if (systemType) {
                            const userSystemPrompt = userDefined.find((p) => p.type === systemType);

                            if (userSystemPrompt) {
                                await deletePrompt({
                                    refetchQueries: ['settingsPrompts'],
                                    variables: { promptId: userSystemPrompt.id },
                                });
                            }
                        }

                        if (humanType) {
                            const userHumanPrompt = userDefined.find((p) => p.type === humanType);

                            if (userHumanPrompt) {
                                await deletePrompt({
                                    refetchQueries: ['settingsPrompts'],
                                    variables: { promptId: userHumanPrompt.id },
                                });
                            }
                        }
                    }
                }
            }

            setResetOperation(null);
        } catch (error) {
            console.error('Failed to reset prompt:', error);
        }
    };

    const canResetPrompt = (promptName: string, resetType: 'all' | 'human' | 'system' | 'tool'): boolean => {
        if (!data?.settingsPrompts?.default || !data?.settingsPrompts?.userDefined) {
            return false;
        }

        const { userDefined } = data.settingsPrompts;
        const { agents } = data.settingsPrompts.default;
        const { tools } = data.settingsPrompts.default;

        if (resetType === 'tool') {
            const toolPrompt = tools?.[promptName as keyof typeof tools];

            return toolPrompt?.type ? userDefined.some((p) => p.type === toolPrompt.type) : false;
        } else {
            const agentPrompts = agents?.[promptName as keyof typeof agents] as AgentPrompts;

            if (!agentPrompts) {
                return false;
            }

            const systemType = agentPrompts.system?.type;
            const humanType = agentPrompts.human?.type;

            switch (resetType) {
                case 'all': {
                    const hasCustomSystem = systemType ? userDefined.some((p) => p.type === systemType) : false;
                    const hasCustomHuman = humanType ? userDefined.some((p) => p.type === humanType) : false;

                    return hasCustomSystem || hasCustomHuman;
                }

                case 'human': {
                    return humanType ? userDefined.some((p) => p.type === humanType) : false;
                }

                case 'system': {
                    return systemType ? userDefined.some((p) => p.type === systemType) : false;
                }
                // No default
            }
        }

        return false;
    };

    const getAgentPromptsData = (): AgentPromptTableData[] => {
        if (!data?.settingsPrompts?.default?.agents) {
            return [];
        }

        const { agents } = data.settingsPrompts.default;
        const userDefined = data.settingsPrompts.userDefined || [];
        const agentEntries: AgentPromptTableData[] = [];

        const formatName = (key: string): string => {
            return key.replaceAll(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        };

        Object.entries(agents).forEach(([key, prompts]) => {
            if (key === '__typename') {
                return;
            }

            const systemType = (prompts as AgentPrompt | AgentPrompts)?.system?.type;
            const humanType = (prompts as AgentPrompts)?.human?.type;

            const hasCustomSystem = userDefined.some((p) => p.type === systemType);
            const hasCustomHuman = humanType ? userDefined.some((p) => p.type === humanType) : false;

            const agentData: AgentPromptTableData = {
                displayName: formatName(key),
                hasHuman: !!(prompts as AgentPrompts)?.human,
                hasSystem: !!(prompts as AgentPrompt | AgentPrompts)?.system,
                humanStatus: (prompts as AgentPrompts)?.human ? (hasCustomHuman ? 'Custom' : 'Default') : 'N/A',
                humanTemplate: (prompts as AgentPrompts)?.human?.template,
                humanType,
                name: key,
                systemStatus: (prompts as AgentPrompt | AgentPrompts)?.system
                    ? hasCustomSystem
                        ? 'Custom'
                        : 'Default'
                    : 'N/A',
                systemTemplate: (prompts as AgentPrompt | AgentPrompts)?.system?.template || '',
                systemType,
            };

            agentEntries.push(agentData);
        });

        return agentEntries.sort((a, b) => a.name.localeCompare(b.name));
    };

    const getToolPromptsData = (): ToolPromptTableData[] => {
        if (!data?.settingsPrompts?.default?.tools) {
            return [];
        }

        const { tools } = data.settingsPrompts.default;
        const userDefined = data.settingsPrompts.userDefined || [];
        const toolEntries: ToolPromptTableData[] = [];

        const formatName = (key: string): string => {
            return key.replaceAll(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        };

        Object.entries(tools).forEach(([key, prompt]) => {
            if (key === '__typename') {
                return;
            }

            const toolType = (prompt as DefaultPrompt)?.type;
            const hasCustomTool = userDefined.some((p) => p.type === toolType);

            const toolData: ToolPromptTableData = {
                displayName: formatName(key),
                name: key,
                promptType: toolType,
                status: (prompt as DefaultPrompt)?.template ? (hasCustomTool ? 'Custom' : 'Default') : 'N/A',
                template: (prompt as DefaultPrompt)?.template || '',
            };

            toolEntries.push(toolData);
        });

        return toolEntries.sort((a, b) => a.name.localeCompare(b.name));
    };

    const agentColumns: ColumnDef<AgentPromptTableData>[] = [
        {
            accessorKey: 'displayName',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{row.original.displayName}</span>
                </div>
            ),
            enableHiding: false,
            header: ({ column }) => {
                const sorted = column.getIsSorted();

                return (
                    <Button
                        className="text-muted-foreground hover:text-primary flex items-center gap-2 p-0 no-underline hover:no-underline"
                        onClick={() => handleColumnSort(column)}
                        variant="link"
                    >
                        에이전트 이름
                        {sorted === 'asc' ? (
                            <ArrowDown className="size-4" />
                        ) : sorted === 'desc' ? (
                            <ArrowUp className="size-4" />
                        ) : null}
                    </Button>
                );
            },
            meta: { columnMenuLabel: '에이전트 이름', searchable: true },
            size: 200,
        },
        {
            accessorKey: 'systemStatus',
            cell: ({ row }) => {
                const status = row.getValue('systemStatus') as string;

                return (
                    <Badge variant={status === 'Custom' ? 'default' : status === 'Default' ? 'secondary' : 'outline'}>
                        {formatPromptStatus(status)}
                    </Badge>
                );
            },
            header: '시스템 프롬프트',
            meta: { columnMenuLabel: '시스템 프롬프트', searchable: true },
            size: 100,
        },
        {
            accessorKey: 'humanStatus',
            cell: ({ row }) => {
                const status = row.getValue('humanStatus') as string;

                return (
                    <Badge variant={status === 'Custom' ? 'default' : status === 'Default' ? 'secondary' : 'outline'}>
                        {status}
                    </Badge>
                );
            },
            header: '사용자 프롬프트',
            meta: { columnMenuLabel: '사용자 프롬프트', searchable: true },
            size: 100,
        },
        {
            cell: ({ row }) => {
                const agent = row.original;

                return (
                    <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    aria-label="작업 메뉴 열기"
                                    className="size-8 p-0"
                                    variant="ghost"
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-24"
                            >
                                <DropdownMenuItem onClick={() => handlePromptEdit(agent.name)}>
                                    <Pencil className="size-3" />
                                    편집
                                </DropdownMenuItem>
                                {(canResetPrompt(agent.name, 'system') ||
                                    canResetPrompt(agent.name, 'human') ||
                                    canResetPrompt(agent.name, 'all')) && <DropdownMenuSeparator />}
                                {canResetPrompt(agent.name, 'system') && (
                                    <DropdownMenuItem
                                        disabled={
                                            isDeleteLoading &&
                                            resetOperation?.promptName === agent.name &&
                                            resetOperation?.type === 'system'
                                        }
                                        onClick={() => handleResetDialogOpen('system', agent.name, agent.displayName)}
                                    >
                                        {isDeleteLoading &&
                                        resetOperation?.promptName === agent.name &&
                                        resetOperation?.type === 'system' ? (
                                            <>
                                                <Loader2 className="size-3 animate-spin" />
                                                초기화 중...
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="size-3" />
                                                시스템 초기화
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                )}
                                {agent.hasHuman && canResetPrompt(agent.name, 'human') && (
                                    <DropdownMenuItem
                                        disabled={
                                            isDeleteLoading &&
                                            resetOperation?.promptName === agent.name &&
                                            resetOperation?.type === 'human'
                                        }
                                        onClick={() => handleResetDialogOpen('human', agent.name, agent.displayName)}
                                    >
                                        {isDeleteLoading &&
                                        resetOperation?.promptName === agent.name &&
                                        resetOperation?.type === 'human' ? (
                                            <>
                                                <Loader2 className="size-3 animate-spin" />
                                                초기화 중...
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="size-3" />
                                                사용자 초기화
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                )}
                                {canResetPrompt(agent.name, 'all') && (
                                    <DropdownMenuItem
                                        disabled={
                                            isDeleteLoading &&
                                            resetOperation?.promptName === agent.name &&
                                            resetOperation?.type === 'all'
                                        }
                                        onClick={() => handleResetDialogOpen('all', agent.name, agent.displayName)}
                                    >
                                        {isDeleteLoading &&
                                        resetOperation?.promptName === agent.name &&
                                        resetOperation?.type === 'all' ? (
                                            <>
                                                <Loader2 className="size-3 animate-spin" />
                                                초기화 중...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="size-3" />
                                                모두 초기화
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            enableHiding: false,
            header: () => null,
            id: 'actions',
            meta: { preventRowClick: true },
            size: 48,
        },
    ];

    const toolColumns: ColumnDef<ToolPromptTableData>[] = [
        {
            accessorKey: 'displayName',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{row.original.displayName}</span>
                </div>
            ),
            enableHiding: false,
            header: ({ column }) => {
                const sorted = column.getIsSorted();

                return (
                    <Button
                        className="text-muted-foreground hover:text-primary flex items-center gap-2 p-0 hover:no-underline"
                        onClick={() => handleColumnSort(column)}
                        variant="link"
                    >
                        도구 이름
                        {sorted === 'asc' ? (
                            <ArrowDown className="size-4" />
                        ) : sorted === 'desc' ? (
                            <ArrowUp className="size-4" />
                        ) : null}
                    </Button>
                );
            },
            meta: { columnMenuLabel: '도구 이름', searchable: true },
            size: 300,
        },
        {
            accessorKey: 'status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;

                return (
                    <Badge variant={status === 'Custom' ? 'default' : status === 'Default' ? 'secondary' : 'outline'}>
                        {formatPromptStatus(status)}
                    </Badge>
                );
            },
            header: '프롬프트',
            meta: { columnMenuLabel: '프롬프트', searchable: true },
            size: 100,
        },
        {
            cell: ({ row }) => {
                const tool = row.original;

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    aria-label="작업 메뉴 열기"
                                    className="size-8 p-0"
                                    variant="ghost"
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-24"
                            >
                                <DropdownMenuItem onClick={() => handlePromptEdit(tool.name)}>
                                    <Pencil className="size-3" />
                                    편집
                                </DropdownMenuItem>
                                {canResetPrompt(tool.name, 'tool') && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            disabled={
                                                isDeleteLoading &&
                                                resetOperation?.promptName === tool.name &&
                                                resetOperation?.type === 'tool'
                                            }
                                            onClick={() => handleResetDialogOpen('tool', tool.name, tool.displayName)}
                                        >
                                            {isDeleteLoading &&
                                            resetOperation?.promptName === tool.name &&
                                            resetOperation?.type === 'tool' ? (
                                                <>
                                                    <Loader2 className="size-3 animate-spin" />
                                                    초기화 중...
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="size-3" />
                                                    초기화
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            enableHiding: false,
            header: () => null,
            id: 'actions',
            meta: { preventRowClick: true },
            size: 48,
        },
    ];

    const renderAgentSubComponent = ({ row }: { row: Row<AgentPromptTableData> }) => {
        const agent = row.original;

        const userSystemPrompt = data?.settingsPrompts?.userDefined?.find((p) => p.type === agent.systemType);
        const userHumanPrompt = data?.settingsPrompts?.userDefined?.find((p) => p.type === agent.humanType);

        const systemTemplate = userSystemPrompt?.template || agent.systemTemplate;
        const humanTemplate = userHumanPrompt?.template || agent.humanTemplate;

        return (
            <div className="bg-muted/20 flex flex-col gap-4 border-t p-4">
                <h4 className="font-medium">프롬프트 템플릿</h4>
                <hr className="border-muted-foreground/20" />

                <div className="flex flex-col gap-4">
                    {agent.hasSystem && (
                        <div>
                            <h5 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                <Code className="size-3" />
                                시스템 프롬프트
                                {userSystemPrompt && (
                                    <Badge
                                        className="text-xs"
                                        variant="secondary"
                                    >
                                        사용자 지정
                                    </Badge>
                                )}
                            </h5>
                            <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                                {systemTemplate}
                            </pre>
                        </div>
                    )}

                    {agent.hasHuman && humanTemplate && (
                        <div>
                            <h5 className="mb-2 flex items-center gap-2 text-sm font-medium">
                                <User className="size-3" />
                                사용자 프롬프트
                                {userHumanPrompt && (
                                    <Badge
                                        className="text-xs"
                                        variant="secondary"
                                    >
                                        사용자 지정
                                    </Badge>
                                )}
                            </h5>
                            <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                                {humanTemplate}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderToolSubComponent = ({ row }: { row: Row<ToolPromptTableData> }) => {
        const tool = row.original;

        const userToolPrompt = data?.settingsPrompts?.userDefined?.find((p) => p.type === tool.promptType);

        const template = userToolPrompt?.template || tool.template;

        return (
            <div className="bg-muted/20 border-t p-4">
                <div className="mb-2 flex items-center gap-2">
                    <h5 className="text-sm font-medium">템플릿</h5>
                    {userToolPrompt && (
                        <Badge
                            className="text-xs"
                            variant="secondary"
                        >
                            사용자 지정
                        </Badge>
                    )}
                </div>
                <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                    {template}
                </pre>
            </div>
        );
    };

    const renderAgentRowContextMenu = (agent: AgentPromptTableData) => {
        const hasResetOptions =
            canResetPrompt(agent.name, 'system') ||
            canResetPrompt(agent.name, 'human') ||
            canResetPrompt(agent.name, 'all');

        return (
            <>
                <ContextMenuItem onClick={() => handlePromptEdit(agent.name)}>
                    <Pencil className="size-3" />
                    편집
                </ContextMenuItem>
                {hasResetOptions && <ContextMenuSeparator />}
                {canResetPrompt(agent.name, 'system') && (
                    <ContextMenuItem
                        disabled={
                            isDeleteLoading &&
                            resetOperation?.promptName === agent.name &&
                            resetOperation?.type === 'system'
                        }
                        onClick={() => handleResetDialogOpen('system', agent.name, agent.displayName)}
                    >
                        <RotateCcw className="size-3" />
                        {isDeleteLoading &&
                        resetOperation?.promptName === agent.name &&
                        resetOperation?.type === 'system'
                            ? '초기화 중...'
                            : '시스템 초기화'}
                    </ContextMenuItem>
                )}
                {agent.hasHuman && canResetPrompt(agent.name, 'human') && (
                    <ContextMenuItem
                        disabled={
                            isDeleteLoading &&
                            resetOperation?.promptName === agent.name &&
                            resetOperation?.type === 'human'
                        }
                        onClick={() => handleResetDialogOpen('human', agent.name, agent.displayName)}
                    >
                        <RotateCcw className="size-3" />
                        {isDeleteLoading &&
                        resetOperation?.promptName === agent.name &&
                        resetOperation?.type === 'human'
                            ? '초기화 중...'
                            : '사용자 초기화'}
                    </ContextMenuItem>
                )}
                {canResetPrompt(agent.name, 'all') && (
                    <ContextMenuItem
                        disabled={
                            isDeleteLoading &&
                            resetOperation?.promptName === agent.name &&
                            resetOperation?.type === 'all'
                        }
                        onClick={() => handleResetDialogOpen('all', agent.name, agent.displayName)}
                    >
                        <Trash2 className="size-3" />
                        {isDeleteLoading && resetOperation?.promptName === agent.name && resetOperation?.type === 'all'
                            ? '초기화 중...'
                            : '모두 초기화'}
                    </ContextMenuItem>
                )}
            </>
        );
    };

    const renderToolRowContextMenu = (tool: ToolPromptTableData) => (
        <>
            <ContextMenuItem onClick={() => handlePromptEdit(tool.name)}>
                <Pencil />
                편집
            </ContextMenuItem>
            {canResetPrompt(tool.name, 'tool') && (
                <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        disabled={
                            isDeleteLoading &&
                            resetOperation?.promptName === tool.name &&
                            resetOperation?.type === 'tool'
                        }
                        onClick={() => handleResetDialogOpen('tool', tool.name, tool.displayName)}
                    >
                        <RotateCcw />
                        {isDeleteLoading && resetOperation?.promptName === tool.name && resetOperation?.type === 'tool'
                            ? '초기화 중...'
                            : '초기화'}
                    </ContextMenuItem>
                </>
            )}
        </>
    );

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsPromptsHeader />
                <StatusCard
                    description="프롬프트 템플릿을 불러오는 동안 잠시 기다려 주세요"
                    icon={<Loader2 className="text-muted-foreground size-16 animate-spin" />}
                    title="프롬프트 불러오는 중..."
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsPromptsHeader />
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>프롬프트를 불러오지 못했습니다</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    const agentPrompts = getAgentPromptsData();
    const toolPrompts = getToolPromptsData();

    if (agentPrompts.length === 0 && toolPrompts.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <SettingsPromptsHeader />
                <StatusCard
                    description="프롬프트 템플릿을 불러올 수 없습니다"
                    icon={<Settings className="text-muted-foreground size-8" />}
                    title="사용 가능한 프롬프트가 없습니다"
                />
            </div>
        );
    }

    return (
        <Fragment>
            <div className="flex flex-col gap-6">
                <SettingsPromptsHeader />

                {agentPrompts.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Bot className="text-muted-foreground size-5" />
                            <h2 className="text-lg font-semibold">에이전트 프롬프트</h2>
                            <Badge variant="secondary">{agentPrompts.length}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            AI 에이전트가 사용할 시스템 및 사용자 프롬프트
                        </p>
                        <DataTable<AgentPromptTableData>
                            columns={agentColumns}
                            data={agentPrompts}
                            empty={{ entityName: '에이전트 프롬프트' }}
                            filterPlaceholder="에이전트 프롬프트 검색..."
                            initialPageSize={1000}
                            renderRowContextMenu={renderAgentRowContextMenu}
                            renderSubComponent={renderAgentSubComponent}
                            storageKey={`${tableStorageBase}:agents`}
                        />
                    </div>
                )}

                {toolPrompts.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Wrench className="text-muted-foreground size-5" />
                            <h2 className="text-lg font-semibold">도구 프롬프트</h2>
                            <Badge variant="secondary">{toolPrompts.length}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            시스템 도구와 유틸리티용 프롬프트 템플릿
                        </p>
                        <DataTable<ToolPromptTableData>
                            columns={toolColumns}
                            data={toolPrompts}
                            empty={{ entityName: '도구 프롬프트' }}
                            filterPlaceholder="도구 프롬프트 검색..."
                            initialPageSize={1000}
                            renderRowContextMenu={renderToolRowContextMenu}
                            renderSubComponent={renderToolSubComponent}
                            storageKey={`${tableStorageBase}:tools`}
                        />
                    </div>
                )}
            </div>

            <ConfirmationDialog
                cancelText="취소"
                cancelVariant="outline"
                confirmIcon={<RotateCcw />}
                confirmText="초기화"
                confirmVariant="destructive"
                description={
                    resetOperation?.type === 'system'
                        ? `"${resetOperation.displayName}" 시스템 프롬프트를 기본 템플릿으로 되돌릴까요? 이 작업은 되돌릴 수 없습니다.`
                        : resetOperation?.type === 'human'
                          ? `"${resetOperation.displayName}" 사용자 프롬프트를 기본 템플릿으로 되돌릴까요? 이 작업은 되돌릴 수 없습니다.`
                          : resetOperation?.type === 'all'
                            ? `"${resetOperation.displayName}"의 모든 프롬프트를 기본 템플릿으로 되돌릴까요? 이 작업은 되돌릴 수 없습니다.`
                            : `"${resetOperation?.displayName}" 프롬프트를 기본 템플릿으로 되돌릴까요? 이 작업은 되돌릴 수 없습니다.`
                }
                handleConfirm={handleResetPrompt}
                handleOpenChange={setResetDialogOpen}
                isOpen={resetDialogOpen}
                title={`${resetOperation?.displayName || '프롬프트'} 초기화`}
            />
        </Fragment>
    );
}

function SettingsPromptsHeader() {
    return (
        <div className="flex items-center justify-between">
            <p className="text-muted-foreground">시스템 및 사용자 지정 프롬프트 템플릿을 관리합니다</p>
        </div>
    );
}

export default SettingsPrompts;
