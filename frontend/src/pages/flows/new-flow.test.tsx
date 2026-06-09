import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FlowFormValues } from '@/features/flows/flow-form';
import type { UserResourceFragmentFragment } from '@/graphql/types';

import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from '@/providers/theme-provider';

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
            <ThemeProvider>
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
            </ThemeProvider>
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

        expect(screen.getByRole('heading', { name: '보안 점검 시작' })).toBeInTheDocument();
        expect(screen.getByText(/비교적 빠르고 간편하게 보안 상태를 확인할 수 있습니다/)).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: '어시스턴트' })).not.toBeInTheDocument();

        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'example.com');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));
        expect(await screen.findByRole('heading', { name: '점검 권한 확인' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '동의하고 계속하기' }));

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

        const simplePayload = flowMocks.createFlow.mock.calls[0]?.[0];
        expect(simplePayload?.message).toContain('OWASP Top 10:2025');
        expect(simplePayload?.message?.split('\n')[0]).toBe('<빠른 점검>');
        expect(simplePayload?.message).toContain('점검 시나리오: 빠른 점검');
        expect(simplePayload?.message).toContain('5~10분');
        expect(simplePayload?.message).toContain('긴 정밀 스캔/무차별 대입/권한 범위 밖 탐색은 수행하지 않습니다');
        expect(simplePayload?.message).toContain('단일 terminal 명령은 120초 안에 끝나도록 timeout을 함께 사용');
        expect(simplePayload?.message).toContain('A01:2025 - Broken Access Control');
        expect(simplePayload?.message).toContain('A10:2025 - Mishandling of Exceptional Conditions');
        expect(simplePayload?.message).toContain('발견 항목마다 OWASP Top 10:2025 기준으로 분류');
        expect(simplePayload?.message).toContain('쉬운 요약');
        expect(flowMocks.createFlowWithAssistant).not.toHaveBeenCalled();
        await waitFor(() => {
            expect(screen.getByLabelText('current location')).toHaveTextContent('/flows/flow-simple?tab=automation');
        });
    });

    it('keeps simple mode guided while preserving provider, resources, and payload shape', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'host.docker.internal');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));
        await user.click(await screen.findByRole('button', { name: '동의하고 계속하기' }));

        expect(screen.getByText('점검 요약 정보')).toBeInTheDocument();
        expect(screen.getAllByText('빠른 점검')).toHaveLength(2);
        expect(screen.getAllByText('5분~10분')).toHaveLength(2);
        expect(screen.getAllByText('점검 후 산정').length).toBeGreaterThan(0);
        expect(screen.queryByText('외부 노출 점검')).not.toBeInTheDocument();
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

        const guidedPayload = flowMocks.createFlow.mock.calls[0]?.[0];
        expect(guidedPayload?.message).toContain('A05:2025 - Injection');
        expect(guidedPayload?.message).toContain('각 취약점의 위험, 영향, 우선 조치');
    });

    it('keeps simple mode safety prompt instead of exposing templates', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'quick.example');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));
        await user.click(await screen.findByRole('button', { name: '동의하고 계속하기' }));

        await user.click(screen.getByRole('button', { name: '템플릿 및 자료' }));

        expect(screen.queryByText('Exposure check')).not.toBeInTheDocument();
        expect(screen.getByText('간편 모드에서는 안내 프롬프트를 자동으로 사용합니다.')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        await user.click(screen.getByRole('button', { name: '점검 실행' }));

        await waitFor(() => expect(flowMocks.createFlow).toHaveBeenCalledTimes(1));

        const simplePayload = flowMocks.createFlow.mock.calls[0]?.[0];
        expect(simplePayload?.message?.split('\n')[0]).toBe('<빠른 점검>');
        expect(simplePayload?.message).toContain('승인된 보안 점검 대상: quick.example');
        expect(simplePayload?.message).not.toBe('Check an authorized target for obvious exposure.');
    });

    it('submits regenerated simple prompt after manual edits and target changes', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        const targetInput = screen.getByLabelText('점검 대상 (도메인 또는 IP)');

        await user.type(targetInput, 'old.example');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));
        await user.click(await screen.findByRole('button', { name: '동의하고 계속하기' }));

        const messageInput = screen.getByPlaceholderText('필요하면 점검 요청을 수정하세요...');
        await user.clear(messageInput);
        await user.type(messageInput, 'manual stale prompt for old.example');
        fireEvent.change(targetInput, { target: { value: 'new.example' } });

        await waitFor(() => expect(targetInput).toHaveValue('new.example'));
        await waitFor(() => expect(screen.getByText('new.example')).toBeInTheDocument());
        await waitFor(() => {
            const regeneratedMessage = (messageInput as HTMLTextAreaElement).value;
            expect(regeneratedMessage).toContain('승인된 보안 점검 대상: new.example');
            expect(regeneratedMessage).not.toContain('old.example');
            expect(regeneratedMessage).not.toBe('manual stale prompt for old.example');
        });

        await user.click(screen.getByRole('button', { name: '점검 실행' }));

        await waitFor(() => expect(flowMocks.createFlow).toHaveBeenCalledTimes(1));

        const simplePayload = flowMocks.createFlow.mock.calls[0]?.[0];
        expect(simplePayload?.message?.split('\n')[0]).toBe('<빠른 점검>');
        expect(simplePayload?.message).toContain('승인된 보안 점검 대상: new.example');
        expect(simplePayload?.message).not.toContain('old.example');
        expect(simplePayload?.message).not.toBe('manual stale prompt for old.example');
    });

    it('keeps final simple mode user notes under the safety prompt', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'quick.example');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));
        await user.click(await screen.findByRole('button', { name: '동의하고 계속하기' }));

        const messageInput = screen.getByPlaceholderText('필요하면 점검 요청을 수정하세요...');
        fireEvent.change(messageInput, { target: { value: '관리자 로그인 경로도 함께 확인해 주세요.' } });

        await user.click(screen.getByRole('button', { name: '점검 실행' }));

        await waitFor(() => expect(flowMocks.createFlow).toHaveBeenCalledTimes(1));

        const simplePayload = flowMocks.createFlow.mock.calls[0]?.[0];
        expect(simplePayload?.message?.split('\n')[0]).toBe('<빠른 점검>');
        expect(simplePayload?.message).toContain('승인된 보안 점검 대상: quick.example');
        expect(simplePayload?.message).toContain('사용자 추가 요청:');
        expect(simplePayload?.message).toContain('관리자 로그인 경로도 함께 확인해 주세요.');
    });

    it('does not mark non-quick simple scenarios as quick scans', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        await user.click(screen.getByRole('button', { name: /웹사이트 기본 점검/ }));
        await user.type(screen.getByLabelText('점검 대상 (도메인 또는 IP)'), 'example.com');
        await user.click(screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.'));
        await user.click(await screen.findByRole('button', { name: '동의하고 계속하기' }));

        expect(screen.getAllByText('점검 후 산정').length).toBeGreaterThan(0);
        expect(screen.getByText('예상 시간').nextElementSibling).toHaveTextContent('점검 후 산정');

        const submitButton = screen.getByRole('button', { name: '점검 실행' });

        await waitFor(() => expect(submitButton).toBeEnabled());
        await user.click(submitButton);

        await waitFor(() => expect(flowMocks.createFlow).toHaveBeenCalledTimes(1));

        const webPayload = flowMocks.createFlow.mock.calls[0]?.[0];
        expect(webPayload?.message).toContain('점검 시나리오: 웹사이트 기본 점검');
        expect(webPayload?.message).not.toContain('<빠른 점검>');
        expect(webPayload?.message?.split('\n')[0]).toBe('승인된 보안 점검 대상: example.com');
    });

    it('preserves assistant creation from expert mode', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=expert');

        expect(screen.getByRole('heading', { name: 'Expert Mode 콘솔' })).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: '어시스턴트' }));
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

    it('explains the Agents option in assistant expert mode', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=expert');

        await user.click(screen.getByRole('tab', { name: '어시스턴트' }));
        await user.click(screen.getByRole('button', { name: 'Agents 사용 도움말' }));

        expect(await screen.findByText('Agents 사용이란?')).toBeInTheDocument();
        expect(screen.getByText(/자동 점검은 작업과 세부 작업을 생성해 보고서 중심으로 실행합니다/)).toBeInTheDocument();
        expect(screen.getByText(/어시스턴트 모드는 대화형 흐름으로 요청을 이어갑니다/)).toBeInTheDocument();
        expect(screen.getByText(/pentester, searcher, coder, memorist, installer, adviser/)).toBeInTheDocument();
        expect(screen.getByText(/더 느리고 토큰을 더 사용할 수 있습니다/)).toBeInTheDocument();
        expect(screen.getByText(/끄면 터미널, 파일, 브라우저, 검색 같은 직접 도구 위주로 처리합니다/)).toBeInTheDocument();
    });

    it('keeps expert mode on the full control surface', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=expert');

        expect(screen.getByRole('heading', { name: '전문가 실행 설정' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: '전체 실행 제어' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '자동 점검' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: '어시스턴트' })).toBeInTheDocument();
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
        expect(screen.getByRole('heading', { name: '보안 점검 시작' })).toBeInTheDocument();
    });

    it('keeps ownership unchecked unless the user accepts the authorization dialog', async () => {
        const user = userEvent.setup();

        renderNewFlow('/flows/new?mode=simple');

        const ownershipCheckbox = screen.getByLabelText('본인이 소유하거나 점검 권한이 있는 대상입니다.');

        await user.click(ownershipCheckbox);

        expect(await screen.findByRole('heading', { name: '점검 권한 확인' })).toBeInTheDocument();
        expect(ownershipCheckbox).not.toBeChecked();

        await user.click(screen.getByRole('button', { name: '취소' }));

        expect(screen.queryByRole('heading', { name: '점검 권한 확인' })).not.toBeInTheDocument();
        expect(ownershipCheckbox).not.toBeChecked();

        await user.click(ownershipCheckbox);
        await user.click(await screen.findByRole('button', { name: '동의하고 계속하기' }));

        expect(ownershipCheckbox).toBeChecked();
    });
});
