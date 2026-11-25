import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { mockActivity, mockAsset } from '../__mocks__/asset360';
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
import { useActivitiesViewModel } from './useActivitiesViewModel';

const SECOND_ACTIVITY = {
  id: { space: 'activity-space', externalId: 'activity-2' },
  name: 'Replace pump seal',
  description: 'Seal replacement',
  tags: ['corrective', 'priority'],
  sourceId: 'SAP-200',
  sourceContext: 'SAP',
  source: { space: 'source-space', externalId: 'sap' },
  sourceCreatedTime: '2026-03-10T08:00:00.000Z',
  sourceUpdatedTime: '2026-03-12T09:30:00.000Z',
  sourceCreatedUser: 'planner',
  sourceUpdatedUser: 'technician',
  startTime: '2026-03-12T10:00:00.000Z',
  endTime: '2026-03-12T12:00:00.000Z',
  scheduledStartTime: '2026-03-12T09:00:00.000Z',
  scheduledEndTime: '2026-03-12T13:00:00.000Z',
};

describe('useActivitiesViewModel', () => {
  it('loads activities independently for the selected asset', async () => {
    let resolveActivities: (
      activities: Awaited<ReturnType<ActivityService['listByAsset']>>
    ) => void = () => undefined;
    const service = makeActivityService({
      listByAsset: vi.fn(
        () =>
          new Promise<Awaited<ReturnType<ActivityService['listByAsset']>>>(
            (resolve) => {
              resolveActivities = resolve;
            }
          )
      ),
    });
    const { result } = renderActivitiesHook(service);

    expect(result.current.status).toBe('loading');
    act(() => resolveActivities([mockActivity, SECOND_ACTIVITY]));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.activities).toEqual([mockActivity, SECOND_ACTIVITY]);
    expect(service.listByAsset).toHaveBeenCalledWith(mockAsset.id);
  });

  it('restores a selected activity from the complete host state', async () => {
    const service = makeActivityService({
      listByAsset: vi.fn(() =>
        Promise.resolve([mockActivity, SECOND_ACTIVITY])
      ),
    });
    const { result } = renderActivitiesHook(service, {
      initialState: makeInitialState({
        searchQuery: 'pump',
        selectedTimeSeriesIds: [
          { space: 'series-space', externalId: 'pressure' },
        ],
        chartRange: {
          start: '2026-03-01T00:00:00.000Z',
          end: '2026-03-08T00:00:00.000Z',
        },
        selectedActivityId: SECOND_ACTIVITY.id,
      }),
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.selectedActivity).toEqual(SECOND_ACTIVITY);
  });

  it('selects and closes details while synchronizing complete state', async () => {
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );
    const initialState = makeInitialState({
      searchQuery: 'pump',
      selectedTimeSeriesIds: [
        { space: 'series-space', externalId: 'pressure' },
      ],
      chartRange: {
        start: '2026-03-01T00:00:00.000Z',
        end: '2026-03-08T00:00:00.000Z',
      },
    });
    const { result } = renderActivitiesHook(
      makeActivityService({
        listByAsset: vi.fn(() => Promise.resolve([mockActivity])),
      }),
      { initialState, hostStateSync: { syncInternalState } }
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.selectActivity(mockActivity.id));
    await waitFor(() => expect(syncInternalState).toHaveBeenCalledOnce());
    expect(JSON.parse(syncInternalState.mock.calls[0][0])).toEqual({
      ...initialState,
      selectedActivityId: mockActivity.id,
    });
    expect(result.current.selectedActivity).toEqual(mockActivity);

    act(() => result.current.closeActivity());
    await waitFor(() => expect(syncInternalState).toHaveBeenCalledTimes(2));
    expect(JSON.parse(syncInternalState.mock.calls[1][0])).toEqual(initialState);
    expect(result.current.selectedActivity).toBeUndefined();
  });

  it('returns empty, no-access, and error states and retries failures', async () => {
    const empty = renderActivitiesHook(makeActivityService());
    await waitFor(() => expect(empty.result.current.status).toBe('empty'));

    const noAccess = renderActivitiesHook(
      makeActivityService({
        listByAsset: vi.fn(() =>
          Promise.reject(
            new CdfServiceError(
              'noAccess',
              'You do not have access to activities.'
            )
          )
        ),
      })
    );
    await waitFor(() =>
      expect(noAccess.result.current.status).toBe('noAccess')
    );
    expect(noAccess.result.current.errorMessage).toBe(
      'You do not have access to activities.'
    );

    const listByAsset = vi
      .fn<ActivityService['listByAsset']>()
      .mockRejectedValueOnce(
        new CdfServiceError('request', 'Activities could not be loaded.')
      )
      .mockResolvedValueOnce([mockActivity]);
    const request = renderActivitiesHook(
      makeActivityService({ listByAsset })
    );
    await waitFor(() =>
      expect(request.result.current.status).toBe('error')
    );

    act(() => request.result.current.retry());
    await waitFor(() =>
      expect(request.result.current.status).toBe('success')
    );
    expect(listByAsset).toHaveBeenCalledTimes(2);
  });

  it('catches host synchronization failures through the shared warning', async () => {
    const { result } = renderActivitiesHook(
      makeActivityService({
        listByAsset: vi.fn(() => Promise.resolve([mockActivity])),
      }),
      {
        hostStateSync: {
          syncInternalState: vi.fn(() =>
            Promise.reject(new Error('host unavailable'))
          ),
        },
      }
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => result.current.selectActivity(mockActivity.id));

    await waitFor(() => expect(result.current.shareStateWarning).toBe(true));
  });
});

function renderActivitiesHook(
  activityService: ActivityService,
  options: {
    initialState?: Asset360State;
    hostStateSync?: HostStateSync;
  } = {}
) {
  const assetService: AssetService = {
    search: vi.fn(() => Promise.resolve([])),
    retrieve: vi.fn(() => Promise.resolve(undefined)),
  };
  const timeSeriesService: TimeSeriesService = {
    listByAsset: vi.fn(() => Promise.resolve([])),
    retrieveLatest: vi.fn(() => Promise.resolve([])),
    retrieveRange: vi.fn(() => Promise.resolve([])),
  };
  const hostStateSync = options.hostStateSync ?? {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
  };
  const context: Asset360ViewModelContextType = {
    useAssetService: () => assetService,
    useTimeSeriesService: () => timeSeriesService,
    useActivityService: () => activityService,
    useAsset360StateStorage,
    useHostStateSync: () => hostStateSync,
    searchDelay: () => Promise.resolve(),
  };

  return renderHook(() => useActivitiesViewModel(), {
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

function makeActivityService(
  overrides: Partial<ActivityService> = {}
): ActivityService {
  return {
    listByAsset: vi.fn(() => Promise.resolve([])),
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
