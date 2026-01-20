import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

describe('LandingPage', () => {
    it('renders the main heading', () => {
        render(
            <MemoryRouter>
                <LandingPage />
            </MemoryRouter>
        );
        // Expecting "Stop Tracking. Start Landing." or similar text from the Landing Page
        expect(screen.getByText(/Stop Tracking/i)).toBeInTheDocument();
    });
});
