import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import Markdown from '@/components/shared/markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssistantLogsQuery, useAssistantsQuery, useFlowReportQuery } from '@/graphql/types';
import { Log } from '@/lib/log';
import { generateFileName, generatePDFFromMarkdown, generateReport } from '@/lib/report';

type PdfPhase = 'done' | 'error' | 'idle';

interface PdfResult {
    readonly error: null | string;
    readonly flowId: string;
    readonly phase: PdfPhase;
}

type ReportState = 'content' | 'error' | 'generating' | 'loading';

function FlowReport() {
    const { flowId } = useParams<{ flowId: string }>();
    const [searchParams] = useSearchParams();
    const download = searchParams.has('download');
    const silent = searchParams.has('silent');

    const [pdfResult, setPdfResult] = useState<null | PdfResult>(null);
    const pdfTriggeredFlowId = useRef<null | string>(null);

    const {
        data,
        error: queryError,
        loading,
    } = useFlowReportQuery({
        errorPolicy: 'all',
        skip: !flowId,
        variables: { id: flowId ?? '' },
    });

    const {
        data: assistantsData,
        error: assistantsError,
        loading: assistantsLoading,
    } = useAssistantsQuery({
        errorPolicy: 'all',
        skip: !flowId,
        variables: { flowId: flowId ?? '' },
    });

    const firstAssistantId = assistantsData?.assistants?.at(0)?.id ?? null;

    const {
        data: assistantLogsData,
        error: assistantLogsError,
        loading: assistantLogsLoading,
    } = useAssistantLogsQuery({
        errorPolicy: 'all',
        skip: !flowId || !firstAssistantId,
        variables: { assistantId: firstAssistantId ?? '', flowId: flowId ?? '' },
    });

    const flow = data?.flow ?? null;
    const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
    const assistantLogs = useMemo(() => assistantLogsData?.assistantLogs ?? [], [assistantLogsData?.assistantLogs]);
    const hasAutomationTasks = tasks.length > 0;
    const isAssistantReportLoading =
        !hasAutomationTasks && (assistantsLoading || (Boolean(firstAssistantId) && assistantLogsLoading));
    const reportQueryError =
        queryError || (!hasAutomationTasks && (assistantsError ?? assistantLogsError)) || undefined;
    const dataReady = !loading && !isAssistantReportLoading && !reportQueryError && flow !== null;

    const reportContent = useMemo(() => {
        if (!dataReady) {
            return '';
        }

        return generateReport(tasks, flow, assistantLogs, {
            preferAssistantReport: !hasAutomationTasks && Boolean(firstAssistantId),
        });
    }, [dataReady, tasks, flow, assistantLogs, hasAutomationTasks, firstAssistantId]);

    const pdfPhase = pdfResult?.flowId === flowId ? pdfResult.phase : 'idle';
    const pdfError = pdfResult?.flowId === flowId ? pdfResult.error : null;

    useEffect(() => {
        if (!dataReady || !download || flow === null || !flowId || pdfTriggeredFlowId.current === flowId) {
            return;
        }

        pdfTriggeredFlowId.current = flowId;

        const fileName = generateFileName(flow);

        generatePDFFromMarkdown(reportContent, fileName)
            .then(() => {
                if (silent) {
                    setTimeout(() => window.close(), 1000);
                } else {
                    setPdfResult({ error: null, flowId, phase: 'done' });
                }
            })
            .catch((err) => {
                Log.error('PDF generation failed:', err);
                setPdfResult({ error: 'PDF 생성에 실패했습니다', flowId, phase: 'error' });
            });
    }, [dataReady, download, silent, reportContent, flow, flowId]);

    let state: ReportState;
    let errorMessage: null | string = null;

    if (loading || isAssistantReportLoading) {
        state = 'loading';
    } else if (reportQueryError || flow === null) {
        state = 'error';
        errorMessage = '보고서 데이터를 불러오지 못했습니다';
    } else if (pdfPhase === 'error') {
        state = 'error';
        errorMessage = pdfError;
    } else if (download && pdfPhase !== 'done') {
        state = 'generating';
    } else {
        state = 'content';
    }

    if (state === 'loading' || state === 'generating') {
        return (
            <div className="bg-muted/30 min-h-screen p-6">
                <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center">
                    <Card className="w-full max-w-lg">
                        <CardHeader className="items-center text-center">
                            <Logo className="text-primary mb-3 size-14" />
                            <Badge variant="blue">{state === 'loading' ? '보고서' : 'PDF 내보내기'}</Badge>
                            <CardTitle className="text-2xl font-semibold">
                                {state === 'loading' ? '보고서 준비 중' : 'PDF 생성 중'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-center">
                            <Loader2 className="text-primary mx-auto size-8 animate-spin" />
                            <p className="text-muted-foreground">
                                {state === 'loading'
                                    ? 'Flow 증거와 작업 요약을 준비하고 있습니다.'
                                    : '현재 보고서 내용으로 PDF 문서를 만들고 있습니다.'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="bg-muted/30 min-h-screen p-6">
                <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center">
                    <Card className="border-destructive/30 w-full max-w-lg">
                        <CardHeader className="items-center text-center">
                            <AlertCircle className="text-destructive mb-3 size-14" />
                            <Badge variant="destructive">보고서 오류</Badge>
                            <CardTitle className="text-2xl font-semibold">보고서 불러오기 오류</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-center">
                            <p className="text-muted-foreground">
                                {errorMessage || '보고서를 불러오는 중 예상치 못한 오류가 발생했습니다.'}
                            </p>
                            <Button
                                className="mx-auto"
                                onClick={() => window.close()}
                                type="button"
                                variant="secondary"
                            >
                                닫기
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-muted/30 min-h-screen p-4 md:p-8">
            <article className="bg-card mx-auto max-w-5xl rounded-xl border shadow-sm">
                <header className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <Logo className="text-primary size-10 shrink-0" />
                        <div className="min-w-0">
                            <Badge variant="blue">AegisX 보고서</Badge>
                            <h1 className="mt-2 truncate text-2xl font-semibold">Flow 보안 보고서</h1>
                        </div>
                    </div>
                </header>
                <div className="p-5 md:p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <Markdown>{reportContent}</Markdown>
                    </div>
                </div>
            </article>
        </div>
    );
}

export default FlowReport;
