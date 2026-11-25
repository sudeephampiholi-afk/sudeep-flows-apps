import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  mockAsset,
  mockNumericSeriesData,
  mockTimeSeries,
} from '../__mocks__/asset360';
import { MAX_SELECTED_TIME_SERIES } from '../domain/asset360Validation';
import type { ActivityService } from '../services/activityService';
import type { AssetService } from '../services/assetService';
import { CdfServiceError } from '../services/cdfErrors';
import type { TimeSeriesService } from '../services/timeSeriesService';
import {
  createDefaultAsset360State,
  type Asset360State,
} from '../state/asset360State';
import { useAsset360StateStorage } from '../state/Asset360StateProvider';
import { TestProviders } from '../test/renderWithProviders';

import type {
  Asset360ViewModelContextType,
  HostStateSync,
} from './asset360ViewModelContext';
import { useTimeSeriesViewModel } from './useTimeSeriesViewModel';

const SECOND_SERIES = {
  id: { space: 'time-series-space', externalId: 'temperature' },
  name: 'Bearing temperature',
  type: 'numeric' as const,
  sourceUnit: '°C',
};
const STRING_SERIES = {
  id: { space: 'time-series-space', externalId: 'mode' },
  name: 'Operating mode',
  type: 'string' as const,
};
const LATEST_TIMESTAMP = '2026-03-14T14:39:43.480Z';
const EARLIER_TIMESTAMP = '2026-03-13T14:39:43.480Z';
const DEFAULT_RANGE = {
  start: '2026-03-07T14:39:43.480Z',
  end: LATEST_TIMESTAMP,
};

describe('useTimeSeriesViewModel', () => {
  it('loads every linked type but plots none by default', async () => {
    const service = makeTimeSeriesService({
      listByAsset: vi.fn(() =>
        Promise.resolve([mockTimeSeries, STRING_SERIES])
      ),
    });
    const { result } = renderTimeSeriesHook(service);

    expect(result.current.linkedStatus).toBe('loading');
    await waitFor(() => expect(result.current.linkedStatus).toBe('success'));

    expect(result.current.linkedSeries).toEqual([
      mockTimeSeries,
      STRING_SERIES,
    ]);
    expect(result.current.selectedSeriesIds).toEqual([]);
    expect(result.current.latestStatus).toBe('idle');
    expect(result.current.rangeStatus).toBe('idle');
    expect(service.retrieveLatest).not.toHaveBeenCalled();
    expect(service.retrieveRange).not.toHaveBeenCalled();
  });

  it('selects only numeric series and synchronizes a seven-day max-latest range', async () => {
    const service = makeTimeSeriesService({
      listByAsset: vi.fn(() =>
        Promise.resolve([mockTimeSeries, SECOND_SERIES, STRING_SERIES])
      ),
      retrieveLatest: vi.fn(() =>
        Promise.resolve([
          {
            series: mockTimeSeries.id,
            timestamp: EARLIER_TIMESTAMP,
            value: 40,
          },
          {
            series: SECOND_SERIES.id,
            timestamp: LATEST_TIMESTAMP,
            value: 70,
          },
        ])
      ),
      retrieveRange: vi.fn(() =>
        Promise.resolve([
          mockNumericSeriesData,
          { series: SECOND_SERIES.id, datapoints: [] },
        ])
      ),
    });
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );
    const { result } = renderTimeSeriesHook(service, {
      hostStateSync: { syncInternalState },
    });
    await waitFor(() => expect(result.current.linkedStatus).toBe('success'));

    act(() => result.current.toggleSeries(STRING_SERIES));
    expect(service.retrieveLatest).not.toHaveBeenCalled();

    act(() => result.current.toggleSeries(mockTimeSeries));
    act(() => result.current.toggleSeries(SECOND_SERIES));

    await waitFor(() =>
      expect(service.retrieveLatest).toHaveBeenLastCalledWith([
        mockTimeSeries.id,
        SECOND_SERIES.id,
      ])
    );
    await waitFor(() =>
      expect(service.retrieveRange).toHaveBeenCalledWith(
        [mockTimeSeries.id, SECOND_SERIES.id],
        DEFAULT_RANGE
      )
    );
    expect(result.current.range).toEqual(DEFAULT_RANGE);
    expect(result.current.rangeStatus).toBe('success');

    const synchronizedStates = syncInternalState.mock.calls.map(
      ([serialized]: [string]) => JSON.parse(serialized)
    );
    expect(synchronizedStates[synchronizedStates.length - 1]).toEqual({
      ...makeInitialState(),
      selectedTimeSeriesIds: [mockTimeSeries.id, SECOND_SERIES.id],
      chartRange: DEFAULT_RANGE,
    });
  });

  it('recomputes the default range when a selected series is removed', async () => {
    const service = makeTimeSeriesService({
      listByAsset: vi.fn(() =>
        Promise.resolve([mockTimeSeries, SECOND_SERIES])
      ),
      retrieveLatest: vi
        .fn<TimeSeriesService['retrieveLatest']>()
        .mockResolvedValueOnce([
          {
            series: mockTimeSeries.id,
            timestamp: EARLIER_TIMESTAMP,
            value: 40,
          },
        ]),
    });
    const restored = makeInitialState({
      selectedTimeSeriesIds: [mockTimeSeries.id, SECOND_SERIES.id],
      chartRange: DEFAULT_RANGE,
    });
    const { result } = renderTimeSeriesHook(service, { initialState: restored });
    await waitFor(() => expect(result.current.linkedStatus).toBe('success'));

    act(() => result.current.toggleSeries(SECOND_SERIES));

    await waitFor(() =>
      expect(result.current.range).toEqual({
        start: '2026-03-06T14:39:43.480Z',
        end: EARLIER_TIMESTAMP,
      })
    );
    expect(service.retrieveLatest).toHaveBeenCalledWith([mockTimeSeries.id]);
  });

  it('keeps presets anchored to the current logical data end', async () => {
    const service = makeTimeSeriesService();
    const restored = makeInitialState({
      selectedTimeSeriesIds: [mockTimeSeries.id],
      chartRange: DEFAULT_RANGE,
    });
    const { result } = renderTimeSeriesHook(service, {
      initialState: restored,
    });
    await waitFor(() => expect(result.current.rangeStatus).toBe('empty'));

    act(() => result.current.setRangePreset(1));
    await waitFor(() =>
      expect(result.current.range).toEqual({
        start: '2026-03-13T14:39:43.480Z',
        end: LATEST_TIMESTAMP,
      })
    );
    act(() => result.current.setRangePreset(30));
    await waitFor(() =>
      expect(result.current.range).toEqual({
        start: '2026-02-12T14:39:43.480Z',
        end: LATEST_TIMESTAMP,
      })
    );
  });

  it('restores selected IDs and range without replacing the saved range', async () => {
    const restoredRange = {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-08T00:00:00.000Z',
    };
    const service = makeTimeSeriesService();
    const { result } = renderTimeSeriesHook(service, {
      initialState: makeInitialState({
        selectedTimeSeriesIds: [mockTimeSeries.id],
        chartRange: restoredRange,
      }),
    });

    await waitFor(() => expect(result.current.rangeStatus).toBe('empty'));
    expect(result.current.selectedSeriesIds).toEqual([mockTimeSeries.id]);
    expect(result.current.range).toEqual(restoredRange);
    expect(service.retrieveLatest).not.toHaveBeenCalled();
    expect(service.retrieveRange).toHaveBeenCalledWith(
      [mockTimeSeries.id],
      restoredRange
    );
  });

  it('keeps URL-shared state bounded by the series selection limit', async () => {
    const selectedTimeSeriesIds = Array.from(
      { length: MAX_SELECTED_TIME_SERIES },
      (_value, index) => ({
        space: 'time-series-space',
        externalId: `series-${index}`,
      })
    );
    const service = makeTimeSeriesService();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );
    const { result } = renderTimeSeriesHook(service, {
      initialState: makeInitialState({ selectedTimeSeriesIds }),
      hostStateSync: { syncInternalState },
    });
    await waitFor(() => expect(result.current.linkedStatus).toBe('empty'));

    act(() => result.current.toggleSeries(mockTimeSeries));

    expect(result.current.selectedSeriesIds).toEqual(selectedTimeSeriesIds);
    expect(result.current.hasReachedSelectionLimit).toBe(true);
    expect(syncInternalState).not.toHaveBeenCalled();
  });

  it('clears chart data when latest or range retrieval is empty', async () => {
    const latestEmptyService = makeTimeSeriesService({
      retrieveLatest: vi.fn(() => Promise.resolve([])),
    });
    const latestEmpty = renderTimeSeriesHook(latestEmptyService, {
      initialState: makeInitialState({
        selectedTimeSeriesIds: [mockTimeSeries.id],
      }),
    });
    await waitFor(() =>
      expect(latestEmpty.result.current.latestStatus).toBe('empty')
    );
    expect(latestEmpty.result.current.range).toBeNull();
    expect(latestEmpty.result.current.seriesData).toEqual([]);

    const rangeEmptyService = makeTimeSeriesService();
    const rangeEmpty = renderTimeSeriesHook(rangeEmptyService, {
      initialState: makeInitialState({
        selectedTimeSeriesIds: [mockTimeSeries.id],
        chartRange: DEFAULT_RANGE,
      }),
    });
    await waitFor(() =>
      expect(rangeEmpty.result.current.rangeStatus).toBe('empty')
    );
    expect(rangeEmpty.result.current.seriesData).toEqual([]);
  });

  it('refreshes only on demand and does not poll', async () => {
    const service = makeTimeSeriesService({
      retrieveRange: vi.fn(() => Promise.resolve([mockNumericSeriesData])),
    });
    const { result } = renderTimeSeriesHook(service, {
      initialState: makeInitialState({
        selectedTimeSeriesIds: [mockTimeSeries.id],
        chartRange: DEFAULT_RANGE,
      }),
    });
    await waitFor(() => expect(result.current.rangeStatus).toBe('success'));
    expect(service.retrieveRange).toHaveBeenCalledOnce();

    await new Promise((resolve: (value?: unknown) => void) =>
      globalThis.setTimeout(resolve, 25)
    );
    expect(service.retrieveRange).toHaveBeenCalledOnce();

    act(() => result.current.refresh());
    await waitFor(() =>
      expect(service.retrieveRange).toHaveBeenCalledTimes(2)
    );
  });

  it('keeps linked, latest, and range errors local and retryable', async () => {
    const listByAsset = vi
      .fn<TimeSeriesService['listByAsset']>()
      .mockRejectedValueOnce(
        new CdfServiceError('noAccess', 'No time-series access.')
      )
      .mockResolvedValueOnce([mockTimeSeries]);
    const service = makeTimeSeriesService({ listByAsset });
    const linked = renderTimeSeriesHook(service);

    await waitFor(() =>
      expect(linked.result.current.linkedStatus).toBe('noAccess')
    );
    act(() => linked.result.current.retryLinked());
    await waitFor(() =>
      expect(linked.result.current.linkedStatus).toBe('success')
    );

    const retrieveLatest = vi
      .fn<TimeSeriesService['retrieveLatest']>()
      .mockRejectedValueOnce(
        new CdfServiceError('request', 'Latest datapoints failed.')
      )
      .mockResolvedValueOnce([
        {
          series: mockTimeSeries.id,
          timestamp: LATEST_TIMESTAMP,
          value: 42,
        },
      ]);
    const latest = renderTimeSeriesHook(
      makeTimeSeriesService({ retrieveLatest }),
      {
        initialState: makeInitialState({
          selectedTimeSeriesIds: [mockTimeSeries.id],
        }),
      }
    );
    await waitFor(() =>
      expect(latest.result.current.latestStatus).toBe('error')
    );
    act(() => latest.result.current.retryLatest());
    await waitFor(() =>
      expect(latest.result.current.range).toEqual(DEFAULT_RANGE)
    );

    const retrieveRange = vi
      .fn<TimeSeriesService['retrieveRange']>()
      .mockRejectedValueOnce(
        new CdfServiceError('request', 'Range request failed.')
      )
      .mockResolvedValueOnce([mockNumericSeriesData]);
    const range = renderTimeSeriesHook(
      makeTimeSeriesService({ retrieveRange }),
      {
        initialState: makeInitialState({
          selectedTimeSeriesIds: [mockTimeSeries.id],
          chartRange: DEFAULT_RANGE,
        }),
      }
    );
    await waitFor(() =>
      expect(range.result.current.rangeStatus).toBe('error')
    );
    act(() => range.result.current.retryRange());
    await waitFor(() =>
      expect(range.result.current.rangeStatus).toBe('success')
    );
  });

  it('stores a warning when host synchronization rejects', async () => {
    const { result } = renderTimeSeriesHook(makeTimeSeriesService(), {
      hostStateSync: {
        syncInternalState: vi.fn(() => Promise.reject(new Error('host down'))),
      },
    });
    await waitFor(() => expect(result.current.linkedStatus).toBe('empty'));

    act(() => result.current.toggleSeries(mockTimeSeries));

    await waitFor(() => expect(result.current.shareStateWarning).toBe(true));
  });
});

function renderTimeSeriesHook(
  timeSeriesService: TimeSeriesService,
  options: {
    initialState?: Asset360State;
    hostStateSync?: HostStateSync;
  } = {}
) {
  const assetService: AssetService = {
    search: vi.fn(() => Promise.resolve([])),
    retrieve: vi.fn(() => Promise.resolve(undefined)),
  };
  const hostStateSync = options.hostStateSync ?? {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
  };
  const context: Asset360ViewModelContextType = {
    useAssetService: () => assetService,
    useTimeSeriesService: () => timeSeriesService,
    useActivityService: makeActivityServiceHook(),
    useAsset360StateStorage,
    useHostStateSync: () => hostStateSync,
    searchDelay: () => Promise.resolve(),
  };

  return renderHook(() => useTimeSeriesViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <TestProviders
        asset360InitialState={JSON.stringify(
          options.initialState ?? makeInitialState()
        )}
        viewModelContext={context}
      >
        {children}
      </TestProviders>
    ),
  });
}

function makeActivityServiceHook(): () => ActivityService {
  const service: ActivityService = {
    listByAsset: vi.fn(() => Promise.resolve([])),
  };
  return () => service;
}

function makeTimeSeriesService(
  overrides: Partial<TimeSeriesService> = {}
): TimeSeriesService {
  return {
    listByAsset: vi.fn(() => Promise.resolve([])),
    retrieveLatest: vi.fn(() => Promise.resolve([])),
    retrieveRange: vi.fn(() => Promise.resolve([])),
    ...overrides,
  };
}

function makeInitialState(
  overrides: Partial<Asset360State> = {}
): Asset360State {
  return {
    ...createDefaultAsset360State(),
    activeView: 'asset',
    selectedAssetId: mockAsset.id,
    ...overrides,
  };
}
