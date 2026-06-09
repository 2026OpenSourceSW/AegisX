import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTheme } from '@/hooks/use-theme';

import { ThemeProvider } from './theme-provider';

function SystemThemeButton() {
    const { setTheme, theme } = useTheme();

    return (
        <button
            onClick={() => setTheme('system')}
            type="button"
        >
            시스템 테마 사용 {theme}
        </button>
    );
}

function ThemeProbe() {
    const { theme } = useTheme();

    return <span data-testid="theme">{theme}</span>;
}

describe('ThemeProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        window.matchMedia = vi.fn().mockReturnValue({
            addEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
            matches: false,
            media: '(prefers-color-scheme: dark)',
            onchange: null,
            removeEventListener: vi.fn(),
        });
    });

    afterEach(() => {
        document.documentElement.className = '';
        vi.restoreAllMocks();
    });

    it('uses defaultTheme when localStorage has no stored theme', async () => {
        render(
            <ThemeProvider
                defaultTheme="dark"
                storageKey="aegisx-theme-test"
            >
                <ThemeProbe />
            </ThemeProvider>,
        );

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');

        await waitFor(() => {
            expect(document.documentElement).toHaveClass('dark');
        });
        expect(localStorage.getItem('aegisx-theme-test')).toBeNull();
    });

    it('persists an explicit system theme when defaultTheme is not system', async () => {
        const user = userEvent.setup();

        render(
            <ThemeProvider
                defaultTheme="dark"
                storageKey="aegisx-theme-test"
            >
                <SystemThemeButton />
            </ThemeProvider>,
        );

        await user.click(screen.getByRole('button', { name: '시스템 테마 사용 dark' }));

        expect(localStorage.getItem('aegisx-theme-test')).toBe('system');
        await waitFor(() => {
            expect(document.documentElement).toHaveClass('light');
        });
    });
});
