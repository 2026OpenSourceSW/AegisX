import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssistantLogsQuery, AssistantsQuery, FlowReportQuery } from '@/graphql/types';

import { MessageLogType, ProviderType, ResultFormat, StatusType } from '@/graphql/types';

import FlowReport from './flow-report';

const reportMocks = vi.hoisted(() => ({
    assistantLogsQueryResult: {
        data: undefined,
        error: undefined,
        loading: false,
    },
    assistantsQueryResult: {
        data: undefined,
        error: undefined,
        loading: false,
    },
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
        useAssistantLogsQuery: () => reportMocks.assistantLogsQueryResult,
        useAssistantsQuery: () => reportMocks.assistantsQueryResult,
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
            result: `## 주요 발견 사항

| 위험도 | OWASP Top 10:2025 유형 | 취약점 |
| --- | --- | --- |
| 🔴 HIGH | A02:2025 - Security Misconfiguration | Wildcard CORS(ACAO: *) |

Markdown report body is preserved.`,
            status: StatusType.Finished,
            subtasks: null,
            title: 'SQL injection evidence',
            updatedAt: '2026-01-01T00:00:00Z',
        },
    ],
};

const assistantOnlyReportData: FlowReportQuery = {
    flow: {
        createdAt: '2026-01-01T00:00:00Z',
        id: '7',
        provider: { name: 'deepseek', type: ProviderType.Deepseek },
        status: StatusType.Waiting,
        terminals: [],
        title: '비파괴 웹 취약점 점검',
        updatedAt: '2026-01-01T00:00:00Z',
    },
    tasks: [],
};

const assistantsData: AssistantsQuery = {
    assistants: [
        {
            createdAt: '2026-01-01T00:00:00Z',
            flowId: '7',
            id: '1',
            provider: { name: 'deepseek', type: ProviderType.Deepseek },
            status: StatusType.Waiting,
            title: '비파괴 웹 취약점 점검',
            updatedAt: '2026-01-01T00:00:00Z',
            useAgents: true,
        },
    ],
};

const assistantLogsData: AssistantLogsQuery = {
    assistantLogs: [
        {
            appendPart: false,
            assistantId: '1',
            createdAt: '2026-01-01T00:00:00Z',
            flowId: '7',
            id: '1',
            message: '[점검 대상]\n- 대상 URL: https://authorized.example/',
            result: '',
            resultFormat: ResultFormat.Markdown,
            thinking: null,
            type: MessageLogType.Input,
        },
        {
            appendPart: false,
            assistantId: '1',
            createdAt: '2026-01-01T00:05:00Z',
            flowId: '7',
            id: '2',
            message: '# 웹 애플리케이션 보안 점검 보고서\n\nWildcard CORS와 CSP 누락이 확인되었습니다.',
            result: '',
            resultFormat: ResultFormat.Markdown,
            thinking: null,
            type: MessageLogType.Answer,
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
        reportMocks.assistantsQueryResult.data = undefined;
        reportMocks.assistantsQueryResult.error = undefined;
        reportMocks.assistantsQueryResult.loading = false;
        reportMocks.assistantLogsQueryResult.data = undefined;
        reportMocks.assistantLogsQueryResult.error = undefined;
        reportMocks.assistantLogsQueryResult.loading = false;
        reportMocks.queryResult.data = flowReportData;
        reportMocks.queryResult.error = undefined;
        reportMocks.queryResult.loading = false;
    });

    it('renders the loading state while report data is pending', () => {
        reportMocks.queryResult.data = undefined;
        reportMocks.queryResult.loading = true;

        renderFlowReport();

        expect(screen.getByRole('heading', { name: '보고서 준비 중' })).toBeInTheDocument();
        expect(screen.getByText('Flow 증거와 작업 요약을 준비하고 있습니다.')).toBeInTheDocument();
    });

    it('renders the error state when report data cannot be loaded', () => {
        reportMocks.queryResult.data = undefined;
        reportMocks.queryResult.error = new Error('network unavailable');

        renderFlowReport();

        expect(screen.getByRole('heading', { name: '보고서 불러오기 오류' })).toBeInTheDocument();
        expect(screen.getByText('보고서 데이터를 불러오지 못했습니다')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
    });

    it('renders markdown report content when data is available', () => {
        renderFlowReport();

        expect(screen.getByRole('heading', { name: 'Flow 보안 보고서' })).toBeInTheDocument();
        expect(screen.getByText(/핵심 발견 요약/)).toBeInTheDocument();
        expect(screen.getByText(/발견 항목 요약/)).toBeInTheDocument();
        expect(screen.getByText(/Wildcard CORS/)).toBeInTheDocument();
        expect(screen.getByText(/SQL injection evidence/)).toBeInTheDocument();
        expect(screen.getByText(/Markdown report body is preserved/)).toBeInTheDocument();
    });

    it('renders assistant-only report content when a flow has no automation tasks', () => {
        reportMocks.queryResult.data = assistantOnlyReportData;
        reportMocks.assistantsQueryResult.data = assistantsData;
        reportMocks.assistantLogsQueryResult.data = assistantLogsData;

        renderFlowReport('/flows/7/report');

        expect(screen.getByRole('heading', { name: 'Flow 보안 보고서' })).toBeInTheDocument();
        expect(screen.getByText(/어시스턴트 점검 보고서/)).toBeInTheDocument();
        expect(screen.getByText(/비파괴 웹 취약점 점검/)).toBeInTheDocument();
        expect(screen.getByText(/Wildcard CORS와 CSP 누락/)).toBeInTheDocument();
        expect(screen.queryByText('No tasks available for this flow.')).not.toBeInTheDocument();
    });

    it('keeps assistant-only report wording when the assistant session has no report logs yet', () => {
        reportMocks.queryResult.data = assistantOnlyReportData;
        reportMocks.assistantsQueryResult.data = assistantsData;
        reportMocks.assistantLogsQueryResult.data = { assistantLogs: [] };

        renderFlowReport('/flows/7/report');

        expect(screen.getByText(/보고서로 정리할 어시스턴트 응답이 아직 없습니다/)).toBeInTheDocument();
        expect(screen.queryByText('No tasks available for this flow.')).not.toBeInTheDocument();
    });

    it('renders the generating state when PDF download is requested', async () => {
        renderFlowReport('/flows/101/report?download=1');

        expect(screen.getByRole('heading', { name: 'PDF 생성 중' })).toBeInTheDocument();
        expect(screen.getByText('현재 보고서 내용으로 PDF 문서를 만들고 있습니다.')).toBeInTheDocument();

        await waitFor(() => {
            expect(reportMocks.generatePDFFromMarkdown).toHaveBeenCalledWith(
                expect.stringContaining('SQL injection evidence'),
                expect.stringMatching(/^report_flow_101_aegisx_evidence_flow_\d{14}$/),
            );
        });
    });
});
