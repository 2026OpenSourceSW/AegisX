import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Login from './login';

vi.mock('@/providers/user-provider', () => ({
    useUser: () => ({
        authInfo: { providers: [] },
        isLoading: false,
    }),
}));

describe('Login page', () => {
    it('uses AegisX project-specific assurance copy in the left panel', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>,
        );

        expect(screen.getByText('승인된 대상만 안전하게 점검하세요')).toBeInTheDocument();
        expect(
            screen.getByText('AegisX는 보안 점검 요청, 실행 과정, 보고서 확인까지 한 곳에서 관리합니다.'),
        ).toBeInTheDocument();
    });
});
