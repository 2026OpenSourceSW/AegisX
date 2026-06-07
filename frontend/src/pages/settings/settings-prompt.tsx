import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    Bot,
    CheckCircle,
    Code,
    FileDiff,
    Loader2,
    RotateCcw,
    Save,
    User,
    Wrench,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { type Control, type ControllerRenderProps, type FieldValues, useController, useForm, useFormState } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import type { AgentPrompt, AgentPrompts, DefaultPrompt, PromptType, ValidatePromptMutation } from '@/graphql/types';

import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { StatusCard } from '@/components/ui/status-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    useCreatePromptMutation,
    useDeletePromptMutation,
    useSettingsPromptsQuery,
    useUpdatePromptMutation,
    useValidatePromptMutation,
} from '@/graphql/types';
import { formatPromptId } from '@/lib/route-titles/format-prompt-id';
import { cn } from '@/lib/utils';

const systemFormSchema = z.object({
    template: z.string().min(1, '시스템 템플릿이 필요합니다'),
});

const humanFormSchema = z.object({
    template: z.string().min(1, '사용자 템플릿이 필요합니다'),
});

interface BaseFieldProps extends ControllerProps {
    label?: string;
}
interface BaseTextareaProps {
    className?: string;
    placeholder?: string;
}

interface ControllerProps {
    control: Control<FieldValues>;
    disabled?: boolean;
    name: string;
}

interface FormTextareaItemProps extends BaseFieldProps, BaseTextareaProps {
    description?: string;
}

type HumanFormData = z.infer<typeof humanFormSchema>;

type SystemFormData = z.infer<typeof systemFormSchema>;

function FormTextareaItem({ className, control, disabled, label, name, placeholder }: FormTextareaItemProps) {
    const { field, fieldState } = useController({
        control,
        defaultValue: '',
        disabled,
        name,
    });

    return (
        <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
                <Textarea
                    {...field}
                    className={cn('min-h-[640px]! font-mono text-sm', className)}
                    disabled={disabled}
                    placeholder={placeholder}
                />
            </FormControl>
            {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
        </FormItem>
    );
}

const getUsedVariables = (template: string | undefined): Set<string> => {
    const usedVariables = new Set<string>();

    if (!template) {
        return usedVariables;
    }

    const variableRegex = /\{\{\.(\w+)\}\}/g;
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
        const variable = match[1];

        if (variable) {
            usedVariables.add(variable);
        }
    }

    return usedVariables;
};

interface VariablesProps {
    currentTemplate: string;
    onVariableClick: (variable: string) => void;
    variables: string[];
}

function SettingsPrompt() {
    const { promptId } = useParams<{ promptId: string }>();
    const navigate = useNavigate();

    const { data, error, loading } = useSettingsPromptsQuery();
    const [createPrompt, { error: createError, loading: isCreateLoading }] = useCreatePromptMutation();
    const [updatePrompt, { error: updateError, loading: isUpdateLoading }] = useUpdatePromptMutation();
    const [deletePrompt, { error: deleteError, loading: isDeleteLoading }] = useDeletePromptMutation();
    const [validatePrompt, { error: validateError, loading: isValidateLoading }] = useValidatePromptMutation();

    const [submitError, setSubmitError] = useState<null | string>(null);
    const [activeTab, setActiveTab] = useState<'human' | 'system'>('system');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [validationResult, setValidationResult] = useState<null | ValidatePromptMutation['validatePrompt']>(null);
    const [validationDialogOpen, setValidationDialogOpen] = useState(false);
    const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [pendingBrowserBack, setPendingBrowserBack] = useState(false);
    const allowBrowserLeaveRef = useRef(false);
    const hasPushedBlockerStateRef = useRef(false);

    const isLoading = isCreateLoading || isUpdateLoading || isDeleteLoading || isValidateLoading;

    const handleVariableClick = (variable: string, field: ControllerRenderProps<FieldValues, string>, formId: string) => {
        const textarea = document.querySelector(`#${formId} textarea`) as HTMLTextAreaElement;

        if (textarea) {
            const currentValue = field.value || '';
            const variablePattern = `{{.${variable}}}`;

            const variableIndex = currentValue.indexOf(variablePattern);

            if (variableIndex !== -1) {
                textarea.focus();
                textarea.setSelectionRange(variableIndex, variableIndex + variablePattern.length);

                const lineHeight = 20;
                const textBeforeSelection = currentValue.slice(0, Math.max(0, variableIndex));
                const linesBeforeSelection = textBeforeSelection.split('\n').length - 1;
                const selectionTop = linesBeforeSelection * lineHeight;
                const textareaHeight = textarea.clientHeight;
                const scrollTop = Math.max(0, selectionTop - textareaHeight / 2);

                textarea.scrollTop = scrollTop;
            } else {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue =
                    currentValue.slice(0, Math.max(0, start)) + variablePattern + currentValue.slice(Math.max(0, end));
                field.onChange(newValue);

                // preventScroll: avoid yanking the user away from where they were typing.
                setTimeout(() => {
                    textarea.focus({ preventScroll: true });
                    textarea.setSelectionRange(start + variablePattern.length, start + variablePattern.length);
                }, 0);
            }
        }
    };

    const handleReset = () => {
        setResetDialogOpen(true);
    };

    const handleConfirmReset = async () => {
        if (!promptInfo) {
            return;
        }

        try {
            setSubmitError(null);

            if (activeTab === 'system' && promptInfo.userSystemPrompt) {
                await deletePrompt({
                    refetchQueries: ['settingsPrompts'],
                    variables: { promptId: promptInfo.userSystemPrompt.id },
                });
                systemForm.setValue('template', promptInfo.defaultSystemTemplate);
            } else if (activeTab === 'human' && promptInfo.userHumanPrompt) {
                await deletePrompt({
                    refetchQueries: ['settingsPrompts'],
                    variables: { promptId: promptInfo.userHumanPrompt.id },
                });
                humanForm.setValue('template', promptInfo.defaultHumanTemplate);
            }

            setResetDialogOpen(false);
        } catch (error) {
            console.error('Reset error:', error);
            setSubmitError(error instanceof Error ? error.message : '초기화하는 중 오류가 발생했습니다');
            setResetDialogOpen(false);
        }
    };

    const handleValidate = async () => {
        if (!promptInfo) {
            return;
        }

        try {
            setSubmitError(null);
            setValidationResult(null);

            let promptType: PromptType;
            let currentTemplate: string;

            if (activeTab === 'system') {
                if (promptInfo.type === 'agent') {
                    const agentData = promptInfo.data as AgentPrompt | AgentPrompts;
                    promptType = agentData.system.type;
                } else {
                    const toolData = promptInfo.data as DefaultPrompt;
                    promptType = toolData.type;
                }

                currentTemplate = systemTemplate;
            } else {
                const agentData = promptInfo.data as AgentPrompts;
                promptType = agentData.human!.type;
                currentTemplate = humanTemplate;
            }

            const result = await validatePrompt({
                variables: {
                    template: currentTemplate,
                    type: promptType,
                },
            });

            setValidationResult(result.data?.validatePrompt);
            setValidationDialogOpen(true);
        } catch (error) {
            console.error('Validation error:', error);
            setSubmitError(error instanceof Error ? error.message : '유효성을 검사하는 중 오류가 발생했습니다');
        }
    };

    const systemForm = useForm<SystemFormData>({
        defaultValues: {
            template: '',
        },
        resolver: zodResolver(systemFormSchema),
    });

    const humanForm = useForm<HumanFormData>({
        defaultValues: {
            template: '',
        },
        resolver: zodResolver(humanFormSchema),
    });

    const { isDirty: isSystemDirty } = useFormState({ control: systemForm.control });
    const { isDirty: isHumanDirty } = useFormState({ control: humanForm.control });
    const isDirty = isSystemDirty || isHumanDirty;

    const systemTemplate = systemForm.watch('template');
    const humanTemplate = humanForm.watch('template');

    // eslint-disable-next-line react-hooks/preserve-manual-memoization -- branching reads from data.settingsPrompts that the compiler can't statically prove stable
    const promptInfo = useMemo(() => {
        if (!promptId || !data?.settingsPrompts) {
            return null;
        }

        const { default: defaultPrompts, userDefined } = data.settingsPrompts;

        if (!defaultPrompts) {
            return null;
        }

        const { agents, tools } = defaultPrompts;

        const agentData = agents?.[promptId as keyof typeof agents] as AgentPrompt | AgentPrompts | undefined;

        if (agentData) {
            const userSystemPrompt = userDefined?.find((p) => p.type === agentData.system.type);
            const userHumanPrompt = userDefined?.find((p) => p.type === (agentData as AgentPrompts)?.human?.type);

            return {
                data: agentData,
                defaultHumanTemplate: (agentData as AgentPrompts)?.human?.template || '',
                defaultSystemTemplate: agentData?.system?.template || '',
                displayName: formatPromptId(promptId),
                hasHuman: !!(agentData as AgentPrompts)?.human,
                humanTemplate: userHumanPrompt?.template || (agentData as AgentPrompts)?.human?.template || '',
                systemTemplate: userSystemPrompt?.template || agentData?.system?.template || '',
                type: 'agent' as const,
                userHumanPrompt,
                userSystemPrompt,
            };
        }

        const toolData = tools?.[promptId as keyof typeof tools] as DefaultPrompt | undefined;

        if (toolData) {
            const userToolPrompt = userDefined?.find((p) => p.type === toolData.type);

            return {
                data: toolData,
                defaultHumanTemplate: '',
                defaultSystemTemplate: toolData?.template || '',
                displayName: formatPromptId(promptId),
                hasHuman: false,
                humanTemplate: '',
                systemTemplate: userToolPrompt?.template || toolData?.template || '',
                type: 'tool' as const,
                userHumanPrompt: null,
                userSystemPrompt: userToolPrompt,
            };
        }

        return null;
    }, [promptId, data?.settingsPrompts]);

    const variablesData = useMemo(() => {
        if (!promptInfo) {
            return null;
        }

        let variables: string[] = [];
        let formId = '';
        let currentTemplate = '';

        if (activeTab === 'system') {
            variables =
                promptInfo.type === 'agent'
                    ? (promptInfo.data as AgentPrompt | AgentPrompts)?.system?.variables || []
                    : (promptInfo.data as DefaultPrompt)?.variables || [];
            formId = 'system-prompt-form';
            currentTemplate = systemTemplate;
        } else if (activeTab === 'human' && promptInfo.type === 'agent' && promptInfo.hasHuman) {
            variables = (promptInfo.data as AgentPrompts)?.human?.variables || [];
            formId = 'human-prompt-form';
            currentTemplate = humanTemplate;
        }

        return { currentTemplate, formId, variables };
    }, [promptInfo, activeTab, systemTemplate, humanTemplate]);

    const handleVariableClickCallback = useCallback(
        (variable: string) => {
            if (!variablesData) {
                return;
            }

            const field =
                activeTab === 'system'
                    ? {
                          onChange: (value: string) => systemForm.setValue('template', value),
                          value: systemTemplate,
                      }
                    : {
                          onChange: (value: string) => humanForm.setValue('template', value),
                          value: humanTemplate,
                      };
            handleVariableClick(variable, field, variablesData.formId);
        },
        [activeTab, systemTemplate, humanTemplate, variablesData, systemForm, humanForm],
    );

    useEffect(() => {
        if (promptInfo) {
            systemForm.reset({
                template: promptInfo.systemTemplate,
            });
            humanForm.reset({
                template: promptInfo.humanTemplate,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promptInfo]);

    // Push a synthetic history entry while the form is dirty so a browser-back can be intercepted
    // by popstate below — react-router's blocker doesn't cover the native back gesture.
    useEffect(() => {
        if (isDirty && !hasPushedBlockerStateRef.current) {
            window.history.pushState({ __pentagiBlock__: true }, '');
            hasPushedBlockerStateRef.current = true;
        }
    }, [isDirty]);

    useEffect(() => {
        const handlePopState = () => {
            if (!isDirty) {
                return;
            }

            if (allowBrowserLeaveRef.current) {
                allowBrowserLeaveRef.current = false;

                return;
            }

            setPendingBrowserBack(true);
            setIsLeaveDialogOpen(true);
            window.history.forward();
        };

        window.addEventListener('popstate', handlePopState, { capture: true });

        return () => {
            window.removeEventListener('popstate', handlePopState, { capture: true });
        };
    }, [isDirty]);

    const handleBack = () => {
        if (isDirty) {
            setIsLeaveDialogOpen(true);

            return;
        }

        navigate('/settings/prompts');
    };

    const handleConfirmLeave = () => {
        if (pendingBrowserBack) {
            allowBrowserLeaveRef.current = true;
            setPendingBrowserBack(false);
            window.history.go(-2);

            return;
        }

        navigate('/settings/prompts');
    };

    const handleLeaveDialogOpenChange = (open: boolean) => {
        if (!open && pendingBrowserBack) {
            setPendingBrowserBack(false);
        }

        setIsLeaveDialogOpen(open);
    };

    const handleSystemSubmit = async (formData: SystemFormData) => {
        if (!promptInfo) {
            return;
        }

        const isUpdate = !!promptInfo.userSystemPrompt;

        // Submitting an unchanged template would create a no-op userDefined row that masks the default.
        if (!isUpdate && formData.template === promptInfo.defaultSystemTemplate) {
            return;
        }

        try {
            setSubmitError(null);

            let promptType: PromptType;

            if (promptInfo.type === 'agent') {
                const agentData = promptInfo.data as AgentPrompt | AgentPrompts;
                promptType = agentData.system.type;
            } else {
                const toolData = promptInfo.data as DefaultPrompt;
                promptType = toolData.type;
            }

            if (isUpdate) {
                await updatePrompt({
                    refetchQueries: ['settingsPrompts'],
                    variables: {
                        promptId: promptInfo.userSystemPrompt!.id,
                        template: formData.template,
                    },
                });
            } else {
                await createPrompt({
                    refetchQueries: ['settingsPrompts'],
                    variables: {
                        template: formData.template,
                        type: promptType,
                    },
                });
            }
        } catch (error) {
            console.error('Submit error:', error);
            setSubmitError(error instanceof Error ? error.message : '저장하는 중 오류가 발생했습니다');
        }
    };

    const handleHumanSubmit = async (formData: HumanFormData) => {
        if (!promptInfo) {
            return;
        }

        const isUpdate = !!promptInfo.userHumanPrompt;

        // Submitting an unchanged template would create a no-op userDefined row that masks the default.
        if (!isUpdate && formData.template === promptInfo.defaultHumanTemplate) {
            return;
        }

        try {
            setSubmitError(null);

            const agentData = promptInfo.data as AgentPrompts;
            const humanPromptType = agentData.human?.type;

            if (!humanPromptType) {
                setSubmitError('사용자 프롬프트 유형을 찾을 수 없습니다');

                return;
            }

            if (isUpdate) {
                await updatePrompt({
                    refetchQueries: ['settingsPrompts'],
                    variables: {
                        promptId: promptInfo.userHumanPrompt!.id,
                        template: formData.template,
                    },
                });
            } else {
                await createPrompt({
                    refetchQueries: ['settingsPrompts'],
                    variables: {
                        template: formData.template,
                        type: humanPromptType,
                    },
                });
            }
        } catch (error) {
            console.error('Submit error:', error);
            setSubmitError(error instanceof Error ? error.message : '저장하는 중 오류가 발생했습니다');
        }
    };

    if (loading) {
        return (
            <>
                <StatusCard
                    description="프롬프트 정보를 불러오는 동안 잠시 기다려 주세요"
                    icon={<Loader2 className="text-muted-foreground size-16 animate-spin" />}
                    title="프롬프트 데이터 불러오는 중..."
                />
            </>
        );
    }

    if (error) {
        return (
            <>
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>프롬프트 데이터를 불러오지 못했습니다</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </>
        );
    }

    if (!promptInfo) {
        return (
            <>
                <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>프롬프트를 찾을 수 없습니다</AlertTitle>
                    <AlertDescription>
                        "{promptId}" 프롬프트를 찾을 수 없거나 편집을 지원하지 않습니다.
                    </AlertDescription>
                </Alert>
            </>
        );
    }

    const currentTemplate = activeTab === 'system' ? systemTemplate : humanTemplate;
    const defaultTemplate = activeTab === 'system' ? promptInfo.defaultSystemTemplate : promptInfo.defaultHumanTemplate;

    // ReactDiffViewer styles aligned with shadcn — uses Tailwind CSS vars rather than hard-coded colors.
    const diffStyles = {
        content: {
            fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.875rem',
            width: '50%',
        },
        diffContainer: {
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
        },
        gutter: {
            borderRight: '1px solid var(--border)',
        },
        line: {
            borderBottom: '1px solid oklch(from var(--border) l c h / 0.50)',
        },
        lineNumber: {
            color: 'var(--muted-foreground)',
        },
        splitView: {
            gap: '0',
        },
        variables: {
            dark: {
                addedBackground: 'hsl(142 70% 45% / 0.50)',
                addedColor: 'var(--foreground)',
                addedGutterBackground: 'hsl(142 70% 45% / 0.40)',
                addedGutterColor: 'var(--muted-foreground)',
                codeFoldBackground: 'var(--muted)',
                codeFoldContentColor: 'var(--muted-foreground)',
                codeFoldGutterBackground: 'var(--muted)',
                diffViewerBackground: 'var(--background)',
                diffViewerColor: 'var(--foreground)',
                diffViewerTitleBackground: 'var(--card)',
                diffViewerTitleBorderColor: 'var(--border)',
                diffViewerTitleColor: 'var(--card-foreground)',
                emptyLineBackground: 'var(--background)',
                gutterBackground: 'var(--muted)',
                gutterBackgroundDark: 'var(--muted)',
                gutterColor: 'var(--muted-foreground)',
                highlightBackground: 'oklch(from var(--primary) l c h / 0.20)',
                highlightGutterBackground: 'oklch(from var(--primary) l c h / 0.30)',
                removedBackground: 'oklch(from var(--destructive) l c h / 0.50)',
                removedColor: 'var(--foreground)',
                removedGutterBackground: 'oklch(from var(--destructive) l c h / 0.40)',
                removedGutterColor: 'var(--muted-foreground)',
                wordAddedBackground: 'hsl(142 70% 45% / 0.70)',
                wordRemovedBackground: 'oklch(from var(--destructive) l c h / 0.70)',
            },
            light: {
                addedBackground: 'hsl(142 70% 45% / 0.50)',
                addedColor: 'var(--foreground)',
                addedGutterBackground: 'hsl(142 70% 45% / 0.40)',
                addedGutterColor: 'var(--muted-foreground)',
                codeFoldBackground: 'var(--muted)',
                codeFoldContentColor: 'var(--muted-foreground)',
                codeFoldGutterBackground: 'var(--muted)',
                diffViewerBackground: 'var(--background)',
                diffViewerColor: 'var(--foreground)',
                diffViewerTitleBackground: 'var(--card)',
                diffViewerTitleBorderColor: 'var(--border)',
                diffViewerTitleColor: 'var(--card-foreground)',
                emptyLineBackground: 'var(--background)',
                gutterBackground: 'var(--muted)',
                gutterBackgroundDark: 'var(--muted)',
                gutterColor: 'var(--muted-foreground)',
                highlightBackground: 'oklch(from var(--primary) l c h / 0.20)',
                highlightGutterBackground: 'oklch(from var(--primary) l c h / 0.30)',
                removedBackground: 'oklch(from var(--destructive) l c h / 0.50)',
                removedColor: 'var(--foreground)',
                removedGutterBackground: 'oklch(from var(--destructive) l c h / 0.40)',
                removedGutterColor: 'var(--muted-foreground)',
                wordAddedBackground: 'hsl(142 70% 45% / 0.70)',
                wordRemovedBackground: 'oklch(from var(--destructive) l c h / 0.70)',
            },
        },
    };

    const mutationError = createError || updateError || deleteError || validateError || submitError;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    {promptInfo.type === 'agent' ? (
                        <Bot className="text-muted-foreground size-5" />
                    ) : (
                        <Wrench className="text-muted-foreground size-5" />
                    )}
                    {promptInfo.displayName}
                </h2>

                <div className="text-muted-foreground">
                    {promptInfo.type === 'agent'
                        ? '이 AI 에이전트가 사용할 프롬프트를 설정합니다'
                        : '이 도구가 사용할 프롬프트를 설정합니다'}
                </div>
            </div>

            <Tabs
                className="w-full"
                defaultValue="system"
                onValueChange={(value) => setActiveTab(value as 'human' | 'system')}
            >
                <TabsList>
                    <TabsTrigger value="system">
                        <div className="flex items-center gap-2">
                            <Code className="size-4" />
                            시스템 프롬프트
                        </div>
                    </TabsTrigger>
                    {promptInfo.type === 'agent' && promptInfo.hasHuman && (
                        <TabsTrigger value="human">
                            <div className="flex items-center gap-2">
                                <User className="size-4" />
                                사용자 프롬프트
                            </div>
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent
                    className="mt-4"
                    value="system"
                >
                    <Form {...systemForm}>
                        <form
                            className="flex flex-col gap-6"
                            id="system-prompt-form"
                            onSubmit={systemForm.handleSubmit(handleSystemSubmit)}
                        >
                            {/* Error Alert */}
                            {mutationError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="size-4" />
                                    <AlertTitle>오류</AlertTitle>
                                    <AlertDescription>
                                        {mutationError instanceof Error ? (
                                            mutationError.message
                                        ) : (
                                            <div className="whitespace-pre-line">{mutationError}</div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* System Template Field */}
                            <FormTextareaItem
                                control={systemForm.control}
                                disabled={isLoading}
                                name="template"
                                placeholder={
                                    promptInfo.type === 'tool'
                                        ? '도구 템플릿을 입력하세요...'
                                        : '시스템 프롬프트 템플릿을 입력하세요...'
                                }
                            />
                        </form>
                    </Form>
                </TabsContent>

                {promptInfo.type === 'agent' && promptInfo.hasHuman && (
                    <TabsContent
                        className="mt-6"
                        value="human"
                    >
                        <Form {...humanForm}>
                            <form
                                className="flex flex-col gap-6"
                                id="human-prompt-form"
                                onSubmit={humanForm.handleSubmit(handleHumanSubmit)}
                            >
                                {/* Error Alert */}
                                {mutationError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="size-4" />
                                        <AlertTitle>오류</AlertTitle>
                                        <AlertDescription>
                                            {mutationError instanceof Error ? (
                                                mutationError.message
                                            ) : (
                                                <div className="whitespace-pre-line">{mutationError}</div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Human Template Field */}
                                <FormTextareaItem
                                    control={humanForm.control}
                                    disabled={isLoading}
                                    name="template"
                                    placeholder="사용자 프롬프트 템플릿을 입력하세요..."
                                />
                            </form>
                        </Form>
                    </TabsContent>
                )}
            </Tabs>

            {/* Sticky footer with variables and buttons */}
            <div className="bg-background sticky -bottom-4 -mx-4 mt-4 -mb-4 border-t p-4 shadow-lg">
                {/* Variables */}
                {variablesData && (
                    <Variables
                        currentTemplate={variablesData.currentTemplate}
                        onVariableClick={handleVariableClickCallback}
                        variables={variablesData.variables}
                    />
                )}

                {/* Action buttons */}
                <div className="flex items-center">
                    <div className="flex gap-2">
                        {/* Reset button - only show when user has custom prompt */}
                        {((activeTab === 'system' && promptInfo?.userSystemPrompt) ||
                            (activeTab === 'human' && promptInfo?.userHumanPrompt)) && (
                            <>
                                <Button
                                    disabled={isLoading}
                                    onClick={handleReset}
                                    type="button"
                                    variant="destructive"
                                >
                                    {isDeleteLoading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw />}
                                    {isDeleteLoading ? '초기화 중...' : '초기화'}
                                </Button>

                                <Button
                                    disabled={isLoading}
                                    onClick={() => setIsDiffDialogOpen(true)}
                                    type="button"
                                    variant="outline"
                                >
                                    <FileDiff className="size-4" />
                                    차이 보기
                                </Button>
                            </>
                        )}
                        <Button
                            disabled={isLoading}
                            onClick={handleValidate}
                            type="button"
                            variant="outline"
                        >
                            {isValidateLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <CheckCircle className="size-4" />
                            )}
                            {isValidateLoading ? '유효성 검사 중...' : '유효성 검사'}
                        </Button>
                    </div>

                    <div className="ml-auto flex gap-2">
                        <Button
                            disabled={isLoading}
                            onClick={handleBack}
                            type="button"
                            variant="outline"
                        >
                            취소
                        </Button>
                        {activeTab === 'system' && (
                            <FormSubmitButton
                                form="system-prompt-form"
                                icon={<Save className="size-4" />}
                                loading={isLoading}
                                variant="secondary"
                            >
                                {isLoading ? '저장 중...' : '변경사항 저장'}
                            </FormSubmitButton>
                        )}
                        {activeTab === 'human' && promptInfo?.type === 'agent' && promptInfo?.hasHuman && (
                            <FormSubmitButton
                                form="human-prompt-form"
                                icon={<Save className="size-4" />}
                                loading={isLoading}
                                variant="secondary"
                            >
                                {isLoading ? '저장 중...' : '변경사항 저장'}
                            </FormSubmitButton>
                        )}
                    </div>
                </div>
            </div>

            {/* Reset Confirmation Dialog */}
            <ConfirmationDialog
                cancelText="취소"
                cancelVariant="outline"
                confirmIcon={<RotateCcw />}
                confirmText="초기화"
                confirmVariant="destructive"
                description="이 프롬프트를 기본값으로 초기화할까요? 이 작업은 되돌릴 수 없습니다."
                handleConfirm={handleConfirmReset}
                handleOpenChange={setResetDialogOpen}
                isOpen={resetDialogOpen}
                itemName={activeTab === 'system' ? '시스템 프롬프트' : '사용자 프롬프트'}
                itemType="템플릿"
                title="프롬프트 초기화"
            />

            {/* Leave Confirmation Dialog */}
            <ConfirmationDialog
                cancelText="계속 편집"
                confirmIcon={undefined}
                confirmText="나가기"
                confirmVariant="destructive"
                description="저장하지 않은 변경사항이 있습니다. 저장하지 않고 나갈까요?"
                handleConfirm={handleConfirmLeave}
                handleOpenChange={handleLeaveDialogOpenChange}
                isOpen={isLeaveDialogOpen}
                title="변경사항을 버릴까요?"
            />

            {/* Validation Results Dialog */}
            <Dialog
                onOpenChange={setValidationDialogOpen}
                open={validationDialogOpen}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="size-5" />
                            유효성 검사 결과
                        </DialogTitle>
                        <DialogDescription>
                            {activeTab === 'system' ? '시스템' : '사용자'} 프롬프트 템플릿의 유효성 검사 결과입니다.
                        </DialogDescription>
                    </DialogHeader>

                    {validationResult && (
                        <div className="flex flex-col gap-4">
                            <Alert variant={validationResult.result ? 'default' : 'destructive'}>
                                {validationResult.result === 'success' ? (
                                    <CheckCircle className="size-4 text-green-500!" />
                                ) : (
                                    <XCircle className="size-4 text-red-500!" />
                                )}
                                <AlertTitle>
                                    {validationResult.result === 'success' ? '유효한 템플릿' : '유효성 검사 오류'}
                                </AlertTitle>
                                <AlertDescription>
                                    <div className="whitespace-pre-line">
                                        {validationResult.message}
                                        {validationResult.details && (
                                            <div className="mt-2">
                                                <strong>세부 정보:</strong> {validationResult.details}
                                            </div>
                                        )}
                                        {validationResult.line && (
                                            <div className="mt-1">
                                                <strong>줄:</strong> {validationResult.line}
                                            </div>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <div className="flex justify-end">
                                <Button onClick={() => setValidationDialogOpen(false)}>닫기</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Diff Dialog */}
            <Dialog
                onOpenChange={setIsDiffDialogOpen}
                open={isDiffDialogOpen}
            >
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileDiff className="size-5" />
                            차이 보기
                        </DialogTitle>
                        <DialogDescription>현재 값과 기본 템플릿의 차이를 확인합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-auto">
                        <ReactDiffViewer
                            newValue={currentTemplate}
                            oldValue={defaultTemplate}
                            splitView
                            styles={diffStyles}
                            useDarkTheme
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Variables({ currentTemplate, onVariableClick, variables }: VariablesProps) {
    if (variables.length === 0) {
        return null;
    }

    const usedVariables = getUsedVariables(currentTemplate);

    return (
        <div className="bg-muted/50 mb-4 rounded-md border p-3">
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">사용 가능한 변수:</h4>
            <div className="flex flex-wrap gap-1">
                {variables.map((variable) => {
                    const isUsed = usedVariables.has(variable);

                    return (
                        <code
                            className={`cursor-pointer rounded border px-2 py-1 font-mono text-xs transition-colors ${
                                isUsed
                                    ? 'border-green-300 bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-background text-foreground hover:bg-accent'
                            }`}
                            key={variable}
                            onClick={() => onVariableClick(variable)}
                        >
                            {`{{.${variable}}}`}
                        </code>
                    );
                })}
            </div>
        </div>
    );
}

export default SettingsPrompt;
