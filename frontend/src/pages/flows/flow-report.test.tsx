import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlowReportQuery } from '@/graphql/types';

import { ProviderType, StatusType } from '@/graphql/types';

import FlowReport from './flow-report';

const reportMocks = vi.hoisted(() => ({
    generatePDFFromMarkdown: vi.fn<() => Promise<void>>(),
    queryResult: {
        data: undefined,
        error: undefined,
        loading: false,
    },
}));

vi.mock('@/components/shared/markdown', () => ({
    default: ({ children }: { readonly children: string }) => <div>{children}</div>,
}));

vi.mock('@/graphql/types', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/graphql/types')>();

    return {
        ...actual,
        useFlowReportQuery: () => reportMocks.queryResult,
    };
});

vi.mock('@/lib/report', async () => {
    const actual = await vi.importActual<typeof import('@/lib/report')>('@/lib/report');

    return {
        ...actual,
        generatePDFFromMarkdown: reportMocks.generatePDFFromMarkdown,
    };
});

const flowReportData: FlowReportQuery = {
    flow: {
        createdAt: '2026-01-01T00:00:00Z',
        id: '101',
        provider: { name: 'deepseek', type: ProviderType.Deepseek },
        status: StatusType.Finished,
        terminals: [],
        title: 'AegisX evidence flow',
        updatedAt: '2026-01-01T00:00:00Z',
    },
    tasks: [
        {
            createdAt: '2026-01-01T00:00:00Z',
            flowId: '101',
            id: '501',
            input: '# Scope\nAuthorized staging target only.',
            result: 'Markdown report body is preserved.',
            status: StatusType.Finished,
            subtasks: null,
            title: 'SQL injection evidence',
            updatedAt: '2026-01-01T00:00:00Z',
        },
    ],
};

function renderFlowReport(initialEntry = '/flows/101/report') {
    render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route
                    element={<FlowReport />}
                    path="/flows/:flowId/report"
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe('FlowReport', () => {
    beforeEach(() => {
        reportMocks.generatePDFFromMarkdown.mockReset();
        reportMocks.generatePDFFromMarkdown.mockReturnValue(new Promise(() => undefined));
        reportMocks.queryResult.data = flowReportData;
        reportMocks.queryResult.error = undefined;
        reportMocks.queryResult.loading = false;
    });

    it('renders the loading state while report data is pending', () => {
        reportMocks.queryResult.data = undefined;
        reportMocks.queryResult.loading = true;

        renderFlowReport();

        expect(screen.getByRole('heading', { name: 'Loading report' })).toBeInTheDocument();
        expect(screen.getByText('Preparing the flow evidence and task summary.')).toBeInTheDocument();
    });

    it('renders the error state when report data cannot be loaded', () => {
        reportMocks.queryResult.data = undefined;
        reportMocks.queryResult.error = new Error('network unavailable');

        renderFlowReport();

        expect(screen.getByRole('heading', { name: 'Error loading report' })).toBeInTheDocument();
        expect(screen.getByText('Failed to load flow data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('renders markdown report content when data is available', () => {
        renderFlowReport();

        expect(screen.getByRole('heading', { name: 'Flow security report' })).toBeInTheDocument();
        expect(screen.getByText(/SQL injection evidence/)).toBeInTheDocument();
        expect(screen.getByText(/Markdown report body is preserved/)).toBeInTheDocument();
    });

    it('renders the generating state when PDF download is requested', async () => {
        renderFlowReport('/flows/101/report?download=1');

        expect(screen.getByRole('heading', { name: 'Generating PDF' })).toBeInTheDocument();
        expect(screen.getByText('Creating the PDF document from the current report.')).toBeInTheDocument();

        await waitFor(() => {
            expect(reportMocks.generatePDFFromMarkdown).toHaveBeenCalledWith(
                expect.stringContaining('SQL injection evidence'),
                expect.stringMatching(/^report_flow_101_aegisx_evidence_flow_\d{14}\.pdf$/),
            );
        });
    });
});
