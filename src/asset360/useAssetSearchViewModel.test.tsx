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
  SearchDelay,
} from './asset360ViewModelContext';
import { useAssetSearchViewModel } from './useAssetSearchViewModel';

describe('useAssetSearchViewModel', () => {
  it('does not request assets for blank or short input', async () => {
    const service = makeAssetService();
    const { result } = renderSearchHook(service);

    act(() => result.current.setSearchQuery('p'));

    await waitFor(() => expect(result.current.searchQuery).toBe('p'));
    expect(service.search).not.toHaveBeenCalled();
    expect(result.current.status).toBe('prompt');
  });

  it('does not store or synchronize invalid search input', async () => {
    const service = makeAssetService();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(
      () => Promise.resolve(true)
    );
    const { result } = renderSearchHook(service, {
      hostStateSync: { syncInternalState },
    });

    act(() => result.current.setSearchQuery('a'.repeat(201)));

    expect(result.current.searchQuery).toBe('');
    expect(syncInternalState).not.toHaveBeenCalled();
    expect(service.search).not.toHaveBeenCalled();
  });

  it('loads ranked results without reordering them', async () => {
    let resolveSearch: (assets: Awaited<ReturnType<AssetService['search']>>) => void =
      () => undefined;
    const service = makeAssetService({
      search: vi.fn<AssetService['search']>(
        () =>
          new Promise<Awaited<ReturnType<AssetService['search']>>>((resolve) => {
            resolveSearch = resolve;
          })
      ),
    });
    const { result } = renderSearchHook(service, {}, 'pump');

    await waitFor(() => expect(result.current.status).toBe('loading'));
    act(() => {
      resolveSearch([
        {
          id: { space: 'assets', externalId: 'server-first' },
          name: 'Pump B',
          tags: ['backup'],
        },
        mockAsset,
      ]);
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.results.map((asset) => asset.id.externalId)).toEqual([
      'server-first',
      mockAsset.id.externalId,
    ]);
  });

  it('waits 300ms and cancels stale search keys before requesting CDF', async () => {
    const service = makeAssetService({
      search: vi.fn(() => Promise.resolve([mockAsset])),
    });
    const controlledDelay = createControlledDelay();
    const unhandledRejection = vi.fn();
    window.addEventListener('unhandledrejection', unhandledRejection);

    const { result, unmount } = renderSearchHook(service, {
      searchDelay: controlledDelay.delay,
    });

    act(() => result.current.setSearchQuery('pu'));
    await waitFor(() => expect(controlledDelay.delay).toHaveBeenCalledOnce());
    expect(controlledDelay.delay).toHaveBeenLastCalledWith(
      300,
      expect.any(AbortSignal)
    );

    act(() => result.current.setSearchQuery('pum'));
    await waitFor(() => expect(controlledDelay.delay).toHaveBeenCalledTimes(2));
    expect(controlledDelay.signals[0]?.aborted).toBe(true);

    act(() => result.current.setSearchQuery('pump'));
    await waitFor(() => expect(controlledDelay.delay).toHaveBeenCalledTimes(3));
    expect(controlledDelay.signals[1]?.aborted).toBe(true);

    controlledDelay.resolveLatest();

    await waitFor(() => expect(service.search).toHaveBeenCalledOnce());
    expect(service.search).toHaveBeenCalledWith('pump');

    act(() => result.current.setSearchQuery('pumps'));
    await waitFor(() => expect(controlledDelay.delay).toHaveBeenCalledTimes(4));
    unmount();
    expect(controlledDelay.signals[3]?.aborted).toBe(true);
    await Promise.resolve();
    expect(unhandledRejection).not.toHaveBeenCalled();

    window.removeEventListener('unhandledrejection', unhandledRejection);
  });

  it('surfaces a classified search error', async () => {
    const service = makeAssetService({
      search: vi.fn(() =>
        Promise.reject(
          new CdfServiceError('noAccess', 'You do not have access to assets.')
        )
      ),
    });
    const { result } = renderSearchHook(service, {}, 'pump');

    await waitFor(() => expect(result.current.status).toBe('noAccess'));
    expect(result.current.errorMessage).toBe(
      'You do not have access to assets.'
    );
  });

  it('syncs complete state and resets downstream selections on selection', async () => {
    const service = makeAssetService();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(
      () => Promise.resolve(true)
    );
    const { result } = renderSearchHook(
      service,
      { hostStateSync: { syncInternalState } },
      undefined,
      JSON.stringify({
        ...createDefaultAsset360State(),
        activeView: 'asset',
        searchQuery: 'pump',
        selectedAssetId: {
          space: 'assets',
          externalId: 'previous-asset',
        },
        selectedTimeSeriesIds: [
          { space: 'series', externalId: 'pressure' },
        ],
        chartRange: {
          start: '2026-01-01T00:00:00.000Z',
          end: '2026-01-08T00:00:00.000Z',
        },
        selectedActivityId: { space: 'activities', externalId: 'work-1' },
      })
    );

    act(() => result.current.selectAsset(mockAsset.id));

    await waitFor(() => expect(syncInternalState).toHaveBeenCalledOnce());
    expect(JSON.parse(syncInternalState.mock.calls[0][0])).toEqual({
      ...createDefaultAsset360State(),
      activeView: 'asset',
      searchQuery: 'pump',
      selectedAssetId: mockAsset.id,
    });
  });

  it('catches sync failures and exposes a non-blocking warning', async () => {
    const service = makeAssetService();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(
      () => Promise.reject(new Error('host unavailable'))
    );
    const { result } = renderSearchHook(service, {
      hostStateSync: { syncInternalState },
    });

    act(() => result.current.setSearchQuery('pump'));

    await waitFor(() => expect(result.current.shareStateWarning).toBe(true));
    expect(result.current.searchQuery).toBe('pump');
  });
});

function renderSearchHook(
  service: AssetService,
  options: {
    hostStateSync?: HostStateSync;
    searchDelay?: SearchDelay;
  } = {},
  searchQuery?: string,
  initialState?: string
) {
  const hostStateSync = options.hostStateSync ?? {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
  };
  const searchDelay =
    options.searchDelay ??
    vi.fn<SearchDelay>(() => Promise.resolve());
  const context: Asset360ViewModelContextType = {
    useAssetService: () => service,
    useTimeSeriesService: makeTimeSeriesServiceHook(),
    useActivityService: makeActivityServiceHook(),
    useAsset360StateStorage,
    useHostStateSync: () => hostStateSync,
    searchDelay,
  };
  const seededState =
    initialState ??
    (searchQuery === undefined
      ? undefined
      : JSON.stringify({
          ...createDefaultAsset360State(),
          searchQuery,
        }));

  return renderHook(() => useAssetSearchViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      (
        <TestProviders
          asset360InitialState={seededState}
          viewModelContext={context}
        >
          {children}
        </TestProviders>
      ),
  });
}

function createControlledDelay(): {
  delay: ReturnType<typeof vi.fn<SearchDelay>>;
  signals: AbortSignal[];
  resolveLatest(): void;
} {
  const signals: AbortSignal[] = [];
  const pending: Array<{ resolve(): void }> = [];
  const delay = vi.fn<SearchDelay>(
    (_milliseconds: number, signal: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        signals.push(signal);
        pending.push({ resolve });
        signal.addEventListener(
          'abort',
          () => {
            const error = new Error('Search delay aborted');
            error.name = 'AbortError';
            reject(error);
          },
          { once: true }
        );
      })
  );
  return {
    delay,
    signals,
    resolveLatest: () => pending[pending.length - 1]?.resolve(),
  };
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
