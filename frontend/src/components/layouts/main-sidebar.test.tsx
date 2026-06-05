import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';

import { MainSidebar } from './main-sidebar';

const sidebarMocks = vi.hoisted(() => ({
    logout: vi.fn<() => Promise<void>>(),
    openFilePicker: vi.fn<() => void>(),
    setTheme: vi.fn<(theme: 'dark' | 'light' | 'system') => void>(),
}));

vi.mock('@/hooks/use-theme', () => ({
    useTheme: () => ({
        setTheme: sidebarMocks.setTheme,
        theme: 'light',
    }),
}));

vi.mock('@/providers/user-provider', () => ({
    useUser: () => ({
        authInfo: {
            user: {
                mail: 'analyst@aegisx.test',
                name: 'Security Analyst',
                type: 'local',
            },
        },
        logout: sidebarMocks.logout,
    }),
}));

vi.mock('@/providers/favorites-provider', () => ({
    useFavorites: () => ({
        addFavoriteFlow: vi.fn(),
        favoriteFlowIds: [],
        removeFavoriteFlow: vi.fn(),
    }),
}));

vi.mock('@/providers/sidebar-flows-provider', () => ({
    useSidebarFlows: () => ({
        flows: [],
    }),
}));

vi.mock('@/features/resources/use-resources-upload', () => ({
    useResourcesUpload: () => ({
        fileInputKey: 'test-upload',
        fileInputProps: {},
        openFilePicker: sidebarMocks.openFilePicker,
    }),
}));

function renderMainSidebar(path = '/dashboard') {
    render(
        <MemoryRouter initialEntries={[path]}>
            <SidebarProvider>
                <MainSidebar />
            </SidebarProvider>
        </MemoryRouter>,
    );
}

describe('MainSidebar', () => {
    it('renders the primary shell navigation with the active route marked', () => {
        renderMainSidebar('/dashboard');

        expect(screen.getByText('AegisX')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /New Flow/i })).toHaveAttribute('href', '/flows/new');
        expect(screen.getByRole('link', { name: /Flows/i })).toHaveAttribute('href', '/flows');
        expect(screen.getByRole('link', { name: /Resources/i })).toHaveAttribute('href', '/resources');
        expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', '/settings');
        expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('data-active', 'true');
    });

    it('renders the Stitch enterprise product signal in the brand lockup', () => {
        renderMainSidebar('/dashboard');

        expect(screen.getByText('Enterprise Security')).toBeInTheDocument();
    });
});
