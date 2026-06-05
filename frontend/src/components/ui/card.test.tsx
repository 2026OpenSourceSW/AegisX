import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, CardTitle } from './card';

const tightTrackingClass = ['tracking', 'tight'].join('-');

describe('Card', () => {
    it('uses the compact AegisX enterprise card surface', () => {
        render(<Card data-testid="card">Security posture</Card>);

        expect(screen.getByTestId('card')).toHaveClass('rounded-lg');
        expect(screen.getByTestId('card')).not.toHaveClass('rounded-xl');
    });

    it('keeps title letter spacing neutral for dense dashboards', () => {
        render(<CardTitle>Usage by Provider</CardTitle>);

        expect(screen.getByText('Usage by Provider')).not.toHaveClass(tightTrackingClass);
    });
});
