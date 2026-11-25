import type { ConnectToHostAppResult, HostAppAPI } from '@cognite/app-sdk';
import type { CogniteClient } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App, { type AppDependencies } from './App';

function makeDeps(client: CogniteClient = makeClient()): AppDependencies {
  return {
    createClient: vi.fn<AppDependencies['createClient']>(() => client),
    reloadPage: vi.fn(),
  };
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const connection = new Promise<ConnectToHostAppResult>(() => undefined);

    renderApp(<App hostConnection={connection} deps={makeDeps()} />);

    expect(screen.getByText('Connecting to Fusion host...')).toBeInTheDocument();
  });

  it('renders a distinct host connection error', async () => {
    renderApp(
      <App
        hostConnection={Promise.reject(new Error('bridge unavailable'))}
        deps={makeDeps()}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByText('Failed to connect to Fusion host')
      ).toBeInTheDocument()
    );
  });

  it('renders project loading after the host connection succeeds', async () => {
    const hostResult = makeHostResult({
      getProject: vi.fn(() => new Promise<string>(() => undefined)),
    });

    renderApp(
      <App hostConnection={Promise.resolve(hostResult)} deps={makeDeps()} />
    );

    await waitFor(() =>
      expect(screen.getByText('Loading CDF project...')).toBeInTheDocument()
    );
  });

  it('renders authenticated asset search', async () => {
    const hostResult = makeHostResult();
    const deps = makeDeps();

    renderApp(
      <App hostConnection={Promise.resolve(hostResult)} deps={deps} />
    );

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Asset 360' })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByText(/Find an asset by tag, name, or description/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Search assets')).toBeInTheDocument();
    expect(deps.createClient).toHaveBeenCalledOnce();
    expect(hostResult.api.getProject).toHaveBeenCalledOnce();
  });
});

function renderApp(app: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
  );
}

function makeClient(): CogniteClient {
  return {
    authenticate: vi.fn(() => Promise.resolve('test-token')),
  } as Partial<CogniteClient> as CogniteClient;
}

function makeHostResult(
  apiOverrides: Partial<HostAppAPI> = {}
): ConnectToHostAppResult {
  return {
    api: {
      getProject: vi.fn<HostAppAPI['getProject']>(() =>
        Promise.resolve('publicdatacdm')
      ),
      getBaseUrl: vi.fn<HostAppAPI['getBaseUrl']>(() =>
        Promise.resolve('https://cognite.test')
      ),
      getAccessToken: vi.fn<HostAppAPI['getAccessToken']>(() =>
        Promise.resolve('test-token')
      ),
      getAppId: vi.fn<HostAppAPI['getAppId']>(() =>
        Promise.resolve('test-app-id')
      ),
      ...apiOverrides,
    } as Partial<HostAppAPI> as HostAppAPI,
  };
}
