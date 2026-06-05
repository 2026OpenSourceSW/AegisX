import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';

import AegisXPageTopbar from './aegisx-page-topbar';

const topbarMocks = vi.hoisted(() => ({
    setTheme: vi.fn<(theme: 'dark' | 'light') => void>(),
    theme: 'light' as 'dark' | 'light',
}));

vi.mock('@/hooks/use-theme', () => ({
    useTheme: () => ({
        setTheme: topbarMocks.setTheme,
        theme: topbarMocks.theme,
    }),
}));

function renderTopbar() {
    render(
        <MemoryRouter>
            <SidebarProvider>
                <AegisXPageTopbar subtitle="보안 점검 워크스페이스" />
            </SidebarProvider>
        </MemoryRouter>,
    );
}

describe('AegisXPageTopbar', () => {
    it('exposes a direct dark and light mode toggle near the top-right actions', async () => {
        const user = userEvent.setup();

        renderTopbar();

        const toggle = screen.getByRole('button', { name: '다크 모드로 전환' });

        await user.click(toggle);

        expect(topbarMocks.setTheme).toHaveBeenCalledWith('dark');
    });
});
