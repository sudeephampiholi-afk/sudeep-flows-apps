import type { ConnectToHostAppResult, HostAppAPI } from '@cognite/app-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HostAppProvider, useHostApp } from './HostAppContext';

describe('HostAppProvider', () => {
  it('shows host loading UI until the supplied connection resolves', () => {
    const connection = new Promise<ConnectToHostAppResult>(() => undefined);

    render(
      <HostAppProvider
        connection={connection}
        loadingFallback={<p>Connecting to host...</p>}
        errorFallback={<p>Host connection failed.</p>}
      >
        <HostReader />
      </HostAppProvider>
    );

    expect(screen.getByText('Connecting to host...')).toBeInTheDocument();
    expect(screen.queryByTestId('initial-state')).not.toBeInTheDocument();
  });

  it('provides the API and initial state from the supplied connection', async () => {
    const api = makeHostApi();

    render(
      <HostAppProvider
        connection={Promise.resolve({
          api,
          initialState: '{"version":1}',
        })}
        loadingFallback={<p>Connecting to host...</p>}
        errorFallback={<p>Host connection failed.</p>}
      >
        <HostReader />
      </HostAppProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('initial-state')).toHaveTextContent(
        '{"version":1}'
      )
    );
    expect(screen.getByTestId('host-api')).toHaveTextContent('available');
  });

  it('shows host error UI when the supplied connection rejects', async () => {
    render(
      <HostAppProvider
        connection={Promise.reject(new Error('bridge unavailable'))}
        loadingFallback={<p>Connecting to host...</p>}
        errorFallback={<p>Host connection failed.</p>}
      >
        <HostReader />
      </HostAppProvider>
    );

    await waitFor(() =>
      expect(screen.getByText('Host connection failed.')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('initial-state')).not.toBeInTheDocument();
  });
});

function HostReader() {
  const { api, initialState } = useHostApp();
  return (
    <>
      <span data-testid="host-api">{api ? 'available' : 'missing'}</span>
      <span data-testid="initial-state">{initialState ?? 'none'}</span>
    </>
  );
}

function makeHostApi(): HostAppAPI {
  return {
    getProject: vi.fn(() => Promise.resolve('publicdatacdm')),
    getBaseUrl: vi.fn(() => Promise.resolve('https://cognite.test')),
    getAccessToken: vi.fn(() => Promise.resolve('test-token')),
    getAppId: vi.fn(() => Promise.resolve('test-app-id')),
  } as Partial<HostAppAPI> as HostAppAPI;
}
