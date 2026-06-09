import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from '@/providers/theme-provider';

import Dashboard from './dashboard';

function renderDashboard() {
    render(
        <MemoryRouter>
            <ThemeProvider>
                <SidebarProvider>
                    <Dashboard />
                </SidebarProvider>
            </ThemeProvider>
        </MemoryRouter>,
    );
}

describe('Dashboard', () => {
    it('renders the AegisX post-login mode selection entry screen', () => {
        renderDashboard();

        expect(screen.getByRole('heading', { name: '사용 목적에 맞는 점검 모드를 선택하세요' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Simple Mode' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Expert Mode' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Simple Mode 시작/ })).toHaveAttribute(
            'href',
            '/flows/new?mode=simple',
        );
        expect(screen.getByRole('link', { name: /Expert Mode 시작/ })).toHaveAttribute(
            'href',
            '/flows/new?mode=expert',
        );
    });
});
