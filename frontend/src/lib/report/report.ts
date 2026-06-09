import type { AssistantLogFragmentFragment, FlowFragmentFragment, TaskFragmentFragment } from '@/graphql/types';

import { Log } from '@/lib/log';

import { buildAssistantReportMarkdown } from './report-assistant-markdown';
import { buildReportMarkdown } from './report-markdown';

interface GenerateReportOptions {
    readonly preferAssistantReport?: boolean;
}

export const generateReport = (
    tasks: readonly TaskFragmentFragment[],
    flow?: FlowFragmentFragment | null,
    assistantLogs: readonly AssistantLogFragmentFragment[] = [],
    options: GenerateReportOptions = {},
): string => {
    if (tasks.length === 0 && (assistantLogs.length > 0 || options.preferAssistantReport)) {
        return buildAssistantReportMarkdown(assistantLogs, flow);
    }

    return buildReportMarkdown([...tasks], flow);
};

export const generateFileName = (flow: FlowFragmentFragment): string => {
    const flowId = flow.id;
    const flowTitle = flow.title
        .replaceAll(/[^\w\s.-]/g, '_')
        .replaceAll(/[\s\u2000-\u200B]+/g, '_')
        .toLowerCase()
        .slice(0, 150)
        .replace(/_+$/, '');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const datetime = `${year}${month}${day}${hours}${minutes}${seconds}`;

    return `report_flow_${flowId}_${flowTitle}_${datetime}`;
};

export const downloadTextFile = (content: string, fileName: string, mimeType = 'text/plain'): void => {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        document.body.append(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    } catch (error) {
        Log.error('Failed to download file:', error);
        throw error;
    }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);

        return true;
    } catch (error) {
        Log.error('Failed to copy to clipboard:', error);

        return false;
    }
};

// Lazy-load the PDF generator so @react-pdf/renderer (~1.5 MB) is fetched
// only when the user actually triggers a PDF export, not on every page that
// imports report utilities (flow.tsx, flow-report.tsx).
export const generatePDFFromMarkdown = async (content: string, fileName: string): Promise<void> => {
    const { generatePDFFromMarkdownNew } = await import('./report-pdf');

    return generatePDFFromMarkdownNew(content, fileName);
};

export const generatePDFBlob = async (content: string): Promise<Blob> => {
    const { generatePDFBlobNew } = await import('./report-pdf');

    return generatePDFBlobNew(content);
};
