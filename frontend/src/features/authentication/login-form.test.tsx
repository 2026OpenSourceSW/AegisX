import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import LoginForm from './login-form';

vi.mock('@/providers/user-provider', () => ({
    useUser: () => ({
        authInfo: null,
        isAuthenticated: () => false,
        login: async () => ({ success: false }),
        loginWithOAuth: async () => ({ success: false }),
        setAuth: () => undefined,
    }),
}));

describe('LoginForm', () => {
    it('renders AegisX as the visible login brand', () => {
        render(
            <MemoryRouter>
                <LoginForm providers={[]} />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { name: 'AegisX' })).toBeInTheDocument();
    });
});
