import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlowFormValues } from '@/features/flows/flow-form';
import type { UserResourceFragmentFragment } from '@/graphql/types';

import { SidebarProvider } from '@/components/ui/sidebar';

import NewFlow from './new-flow';

const flowMocks = vi.hoisted(() => ({
    createFlow: vi.fn<(values: FlowFormValues) => Promise<null | string>>(),
    createFlowWithAssistant: vi.fn<(values: FlowFormValues) => Promise<null | string>>(),
    setSelectedProvider: vi.fn<(provider: { name: string; type: string }) => void>(),
    uploadFiles: vi.fn<() => Promise<null>>(),
}));

const resourceFixtures: UserResourceFragmentFragment[] = [
    {
        createdAt: new Date('2026-01-01T00:00:00Z'),
        id: '7',
        isDir: false,
        name: 'authorized-scope.md',
        path: 'authorized-scope.md',
        size: 256,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        userId: 'user-1',
    },
];

vi.mock('@/providers/flows-provider', () => ({
    useFlows: () => ({
        createFlow: flowMocks.createFlow,
        createFlowWithAssistant: flowMocks.createFlowWithAssistant,
    }),
}));

vi.mock('@/providers/providers-provider', () => ({
    useProviders: () => ({
        providers: [{ name: 'deepseek', type: 'deepseek' }],
        selectedProvider: { name: 'deepseek', type: 'deepseek' },
        setSelectedProvider: flowMocks.setSelectedProvider,
    }),
}));

vi.mock('@/providers/system-settings-provider', () => ({
    useSystemSettings: () => ({
        settings: { assistantUseAgents: true },
    }),
}));

vi.mock('@/providers/templates-provider', () => ({
    useTemplates: () => ({
        templates: [
            {
                createdAt: new Date('2026-01-01T00:00:00Z'),
                id: 'template-1',
                text: 'Check an authorized target for obvious exposure.',
                title: 'Exposure check',
                updatedAt: new Date('2026-01-01T00:00:00Z'),
                userId: 'user-1',
            },
        ],
    }),
}));

vi.mock('@/providers/resources-provider', () => ({
    useResources: () => ({
        resources: resourceFixtures,
    }),
}));

vi.mock('@/features/resources/use-resources-upload', () => ({
    useResourcesUpload: () => ({
        isUploading: false,
        uploadFiles: flowMocks.uploadFiles,
    }),
}));

function LocationProbe() {
    const location = useLocation();

    return <output aria-label="current location">{`${location.pathname}${location.search}`}</output>;
}

function renderNewFlow(initialEntry: string) {
    render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <SidebarProvider>
                <Routes>
                    <Route
                        element={
                            <>
                                <NewFlow />
                                <LocationProbe />
                            </>
                        }
                        path="/flows/new"
                    />
                    <Route
                        element={<LocationProbe />}
                        path="/flows/:flowId"
                    />
                </Routes>
            </SidebarProvider>
        </MemoryRouter>,
    );
}

describe('NewFlow', () => {
    beforeEach(() => {
        window.scrollTo = vi.fn();
        flowMocks.createFlow.mockReset();
        flowMocks.createFlowWithAssistant.mockReset();
        flowMocks.setSelectedProvider.mockReset();
        flowMocks.uploadFiles.mockReset();
        flowMocks.createFlow.mockResolvedValue('flow-simple');
        flowMocks.createFlowWithAssistant.mockResolvedValue('flow-assistant');
        flowMocks.uploadFiles.mockResolvedValue(null);
    });

    it('creates an automation flow from simple mode', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        expect(screen.getByRole('heading', { name: '쉬운 보안 점검 시작' })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Assistant' })).not.toBeInTheDocument();

        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'example.com');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));

        const submitButton = screen.getByRole('button', { name: '점검 실행' });

        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => {
            expect(flowMocks.createFlow).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('승인된 보안 점검 대상: example.com'),
                    providerName: 'deepseek',
                }),
            );
        });
        expect(flowMocks.createFlowWithAssistant).not.toHaveBeenCalled();
        expect(screen.getByLabelText('current location')).toHaveTextContent('/flows/flow-simple?tab=automation');
    });

    it('keeps simple mode guided while preserving provider, resources, and payload shape', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'host.docker.internal');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));

        expect(screen.getByText('점검 요약 정보')).toBeInTheDocument();
        expect(screen.getAllByText('외부 노출 점검')).toHaveLength(2);
        expect(screen.getByText('실행 전 확인')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /deepseek/i })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '템플릿 및 자료' }));

        expect(await screen.findByRole('tab', { name: /템플릿/ })).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /자료/ }));
        await user.click(await screen.findByText('authorized-scope.md'));
        await user.keyboard('{Escape}');

        const submitButton = screen.getByRole('button', { name: '점검 실행' });

        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => {
            expect(flowMocks.createFlow).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('승인된 보안 점검 대상: host.docker.internal'),
                    providerName: 'deepseek',
                    resourceIds: ['7'],
                }),
            );
        });
    });

    it('preserves assistant creation from expert mode', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=expert');

        expect(screen.getByRole('heading', { name: 'Expert Mode Console' })).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Assistant' }));
        await user.type(screen.getByPlaceholderText('무엇을 도와드릴까요?'), 'Create a plan');

        const submitButton = screen.getByRole('button', { name: '실행 시작' });

        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => {
            expect(flowMocks.createFlowWithAssistant).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Create a plan',
                    providerName: 'deepseek',
                    useAgents: true,
                }),
            );
        });
        expect(flowMocks.createFlow).not.toHaveBeenCalled();
        expect(screen.getByLabelText('current location')).toHaveTextContent('/flows/flow-assistant?tab=assistant');
    });

    it('keeps expert mode on the full control surface', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=expert');

        expect(screen.getByRole('heading', { name: '전문가 실행 설정' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '전체 실행 제어' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Automation' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Assistant' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /deepseek/i })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '템플릿 및 자료' }));

        expect(await screen.findByRole('tab', { name: /템플릿/ })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /자료/ })).toBeInTheDocument();
    });

    it('syncs mode selection into the URL', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=expert&keep=1');

        await user.click(screen.getByRole('button', { name: '간편 모드' }));

        expect(screen.getByLabelText('current location')).toHaveTextContent('/flows/new?mode=simple&keep=1');
        expect(screen.getByRole('heading', { name: '쉬운 보안 점검 시작' })).toBeInTheDocument();
    });
});
