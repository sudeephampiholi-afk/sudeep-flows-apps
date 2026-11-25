import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

describe('AppErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children while the application is healthy', () => {
    render(
      <AppErrorBoundary reloadPage={vi.fn()}>
        <p>Application content</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText('Application content')).toBeInTheDocument();
  });

  it('shows a recovery UI and reloads on request after a render failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reloadPage = vi.fn();

    render(
      <AppErrorBoundary reloadPage={reloadPage}>
        <BrokenContent />
      </AppErrorBoundary>
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' })
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload app' }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });
});

function BrokenContent(): never {
  throw new Error('render failed');
}
