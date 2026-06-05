import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
    it('uses the shared AegisX 8px control radius', () => {
        render(<Button>Run assessment</Button>);

        expect(screen.getByRole('button', { name: 'Run assessment' })).toHaveClass('rounded-lg');
        expect(screen.getByRole('button', { name: 'Run assessment' })).not.toHaveClass('rounded-md');
    });
});
