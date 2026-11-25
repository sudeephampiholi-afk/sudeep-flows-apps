import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { mockAsset } from '../__mocks__/asset360';
import type { ActivityService } from '../services/activityService';
import type { AssetService } from '../services/assetService';
import { CdfServiceError } from '../services/cdfErrors';
import type { TimeSeriesService } from '../services/timeSeriesService';
import { createDefaultAsset360State } from '../state/asset360State';
import { useAsset360StateStorage } from '../state/Asset360StateProvider';
import { TestProviders } from '../test/renderWithProviders';

import type {
  Asset360ViewModelContextType,
  HostStateSync,
} from './asset360ViewModelContext';
import { useAssetDetailsViewModel } from './useAssetDetailsViewModel';

describe('useAssetDetailsViewModel', () => {
  it('loads the selected asset and returns its verified fields', async () => {
    let resolveRetrieve: (
      asset: Awaited<ReturnType<AssetService['retrieve']>>
    ) => void = () => undefined;
    const service = makeAssetService({
      retrieve: vi.fn<AssetService['retrieve']>(
        () =>
          new Promise<Awaited<ReturnType<AssetService['retrieve']>>>((resolve) => {
            resolveRetrieve = resolve;
          })
      ),
    });
    const { result } = renderDetailsHook(service);

    expect(result.current.status).toBe('loading');
    act(() => resolveRetrieve(mockAsset));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.asset).toEqual(mockAsset);
    expect(service.retrieve).toHaveBeenCalledWith(mockAsset.id);
  });

  it('returns an empty state when the selected asset no longer exists', async () => {
    const { result } = renderDetailsHook(makeAssetService());

    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('returns no-access and request errors distinctly', async () => {
    const noAccessService = makeAssetService({
      retrieve: vi.fn(() =>
        Promise.reject(
          new CdfServiceError('noAccess', 'You do not have access to assets.')
        )
      ),
    });
    const requestService = makeAssetService({
      retrieve: vi.fn(() =>
        Promise.reject(
          new CdfServiceError('request', 'The asset could not be loaded.')
        )
      ),
    });

    const noAccess = renderDetailsHook(noAccessService);
    const request = renderDetailsHook(requestService);

    await waitFor(() => expect(noAccess.result.current.status).toBe('noAccess'));
    await waitFor(() => expect(request.result.current.status).toBe('error'));
  });

  it('retries retrieval and returns to search without losing the query', async () => {
    const service = makeAssetService({
      retrieve: vi
        .fn<AssetService['retrieve']>()
        .mockRejectedValueOnce(
          new CdfServiceError('request', 'The asset could not be loaded.')
        )
        .mockResolvedValueOnce(mockAsset),
    });
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(
      () => Promise.resolve(true)
    );
    const { result } = renderDetailsHook(service, { syncInternalState });

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.backToSearch());
    await waitFor(() => expect(syncInternalState).toHaveBeenCalledOnce());
    expect(JSON.parse(syncInternalState.mock.calls[0][0])).toEqual({
      ...createDefaultAsset360State(),
      searchQuery: 'pump',
    });
  });
});

function renderDetailsHook(
  service: AssetService,
  hostStateSync: HostStateSync = {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
  }
) {
  const context: Asset360ViewModelContextType = {
    useAssetService: () => service,
    useTimeSeriesService: makeTimeSeriesServiceHook(),
    useActivityService: makeActivityServiceHook(),
    useAsset360StateStorage,
    useHostStateSync: () => hostStateSync,
    searchDelay: () => Promise.resolve(),
  };
  const initialState = JSON.stringify({
    ...createDefaultAsset360State(),
    activeView: 'asset',
    searchQuery: 'pump',
    selectedAssetId: mockAsset.id,
  });

  return renderHook(() => useAssetDetailsViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TestProviders
        asset360InitialState={initialState}
        viewModelContext={context}
      >
        {children}
      </TestProviders>
    ),
  });
}

function makeAssetService(
  overrides: Partial<AssetService> = {}
): AssetService {
  return {
    search: vi.fn(() => Promise.resolve([])),
    retrieve: vi.fn(() => Promise.resolve(undefined)),
    ...overrides,
  };
}

function makeActivityServiceHook(): () => ActivityService {
  const service: ActivityService = {
    listByAsset: vi.fn(() => Promise.resolve([])),
  };
  return () => service;
}

function makeTimeSeriesServiceHook(): () => TimeSeriesService {
  const service: TimeSeriesService = {
    listByAsset: vi.fn(() => Promise.resolve([])),
    retrieveLatest: vi.fn(() => Promise.resolve([])),
    retrieveRange: vi.fn(() => Promise.resolve([])),
  };
  return () => service;
}
