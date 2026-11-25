import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/renderWithProviders';

import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('announces the loading label as a status region', () => {
    renderWithProviders(<LoadingSkeleton label="Loading assets..." />);

    expect(
      screen.getByRole('status', { name: 'Loading assets...' })
    ).toBeInTheDocument();
    expect(screen.getByText('Loading assets...')).toBeInTheDocument();
  });

  it('renders the requested number of placeholder rows', () => {
    const { container } = renderWithProviders(
      <LoadingSkeleton label="Loading rows..." rows={5} />
    );

    expect(container.querySelectorAll('[data-skeleton-row]')).toHaveLength(5);
  });

  it('defaults to three placeholder rows', () => {
    const { container } = renderWithProviders(
      <LoadingSkeleton label="Loading..." />
    );

    expect(container.querySelectorAll('[data-skeleton-row]')).toHaveLength(3);
  });
});
