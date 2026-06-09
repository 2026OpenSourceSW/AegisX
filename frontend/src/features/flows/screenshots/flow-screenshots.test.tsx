import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import type { ScreenshotFragmentFragment } from '@/graphql/types';

import { StatusType } from '@/graphql/types';

import FlowScreenshots from './flow-screenshots';

const flowMock = vi.hoisted(() => ({
    flowData: {
        screenshots: [] as ScreenshotFragmentFragment[],
    },
    flowId: '7',
    flowStatus: 'finished' as StatusType,
}));

vi.mock('@/providers/flow-provider', () => ({
    useFlow: () => flowMock,
}));

vi.mock('@/hooks/use-auto-scroll', () => ({
    useAutoScroll: () => ({
        containerRef: { current: null },
        endRef: { current: null },
        hasNewMessages: false,
        isScrolledToBottom: true,
        scrollToEnd: vi.fn(),
    }),
}));

const screenshotFixture: ScreenshotFragmentFragment = {
    createdAt: '2026-06-08T17:01:00Z',
    flowId: '7',
    id: '42',
    name: 'authorized-target.png',
    subtaskId: null,
    taskId: null,
    url: 'https://authorized.example/',
};

function installIntersectingObserver() {
    class ImmediateIntersectionObserver implements IntersectionObserver {
        disconnect = vi.fn();
        observe = vi.fn((target: Element) => {
            this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
        });
        readonly root = null;

        readonly rootMargin = '';
        takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
        readonly thresholds = [];
        unobserve = vi.fn();

        constructor(
            private readonly callback: IntersectionObserverCallback,
            _options?: IntersectionObserverInit,
        ) {}
    }

    vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver);
}

function renderScreenshots() {
    render(
        <MemoryRouter>
            <TooltipProvider>
                <FlowScreenshots />
            </TooltipProvider>
        </MemoryRouter>,
    );
}

describe('FlowScreenshots', () => {
    beforeEach(() => {
        installIntersectingObserver();
        flowMock.flowId = '7';
        flowMock.flowData = { screenshots: [] };
        flowMock.flowStatus = StatusType.Finished;
    });

    it('shows a Korean empty state that explains screenshots may be absent for assistant-only runs', () => {
        renderScreenshots();

        expect(screen.getByRole('heading', { name: '스크린샷이 없습니다' })).toBeInTheDocument();
        expect(screen.getByText('에이전트가 브라우저 스크린샷을 캡처하면 여기에 표시됩니다.')).toBeInTheDocument();
        expect(
            screen.getByText('브라우저 도구가 실행되지 않았거나 스크린샷 캡처에 실패한 경우에는 기록이 없을 수 있습니다.'),
        ).toBeInTheDocument();
    });

    it('shows a startup state while a running flow is waiting for browser capture', () => {
        flowMock.flowStatus = StatusType.Running;

        renderScreenshots();

        expect(screen.getByRole('heading', { name: '스크린샷 준비 중' })).toBeInTheDocument();
        expect(screen.getByText('브라우저 점검이 실행되면 스크린샷이 자동으로 표시됩니다.')).toBeInTheDocument();
    });

    it('renders captured screenshot images from the flow screenshot file endpoint', () => {
        flowMock.flowData = { screenshots: [screenshotFixture] };

        renderScreenshots();

        const image = screen.getByRole('img', { name: 'authorized-target.png' });

        expect(image).toHaveAttribute('src', '/api/v1/flows/7/screenshots/42/file');
        expect(screen.getByRole('link', { name: /https:\/\/authorized\.example/ })).toHaveAttribute(
            'href',
            'https://authorized.example/',
        );
    });

    it('surfaces a Korean image load failure state with a direct open action', () => {
        flowMock.flowData = { screenshots: [screenshotFixture] };

        renderScreenshots();
        fireEvent.error(screen.getByRole('img', { name: 'authorized-target.png' }));

        expect(screen.getByText('스크린샷 이미지를 불러오지 못했습니다.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '새 창에서 열기' })).toHaveAttribute(
            'href',
            '/api/v1/flows/7/screenshots/42/file',
        );
    });
});
