import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import Logo from '@/components/icons/logo';
import Markdown from '@/components/shared/markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFlowReportQuery } from '@/graphql/types';
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

    const flow = data?.flow ?? null;
    const dataReady = !loading && !queryError && flow !== null;

    const reportContent = useMemo(() => {
        if (!dataReady) {
            return '';
        }

        return generateReport(data?.tasks ?? [], flow);
    }, [dataReady, data?.tasks, flow]);

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
                setPdfResult({ error: 'Failed to generate PDF', flowId, phase: 'error' });
            });
    }, [dataReady, download, silent, reportContent, flow, flowId]);

    let state: ReportState;
    let errorMessage: null | string = null;

    if (loading) {
        state = 'loading';
    } else if (queryError || flow === null) {
        state = 'error';
        errorMessage = 'Failed to load flow data';
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
                            <Badge variant="blue">{state === 'loading' ? 'Report' : 'PDF export'}</Badge>
                            <CardTitle className="text-2xl font-semibold">
                                {state === 'loading' ? 'Loading report' : 'Generating PDF'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-center">
                            <Loader2 className="text-primary mx-auto size-8 animate-spin" />
                            <p className="text-muted-foreground">
                                {state === 'loading'
                                    ? 'Preparing the flow evidence and task summary.'
                                    : 'Creating the PDF document from the current report.'}
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
                            <Badge variant="destructive">Report error</Badge>
                            <CardTitle className="text-2xl font-semibold">Error loading report</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-center">
                            <p className="text-muted-foreground">
                                {errorMessage || 'An unexpected error occurred while loading the report.'}
                            </p>
                            <Button
                                className="mx-auto"
                                onClick={() => window.close()}
                                type="button"
                                variant="secondary"
                            >
                                Close
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
                            <Badge variant="blue">AegisX report</Badge>
                            <h1 className="mt-2 truncate text-2xl font-semibold">Flow security report</h1>
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
