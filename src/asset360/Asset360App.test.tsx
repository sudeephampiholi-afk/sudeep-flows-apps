import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mockActivity,
  mockAsset,
  mockNumericSeriesData,
  mockTimeSeries,
} from '../__mocks__/asset360';
import type { ActivityService } from '../services/activityService';
import type { AssetService } from '../services/assetService';
import { CdfServiceError } from '../services/cdfErrors';
import type { TimeSeriesService } from '../services/timeSeriesService';
import {
  createDefaultAsset360State,
  type Asset360State,
} from '../state/asset360State';
import { useAsset360StateStorage } from '../state/Asset360StateProvider';
import { renderWithProviders } from '../test/renderWithProviders';

import { Asset360App } from './Asset360App';
import type {
  Asset360ViewModelContextType,
  HostStateSync,
} from './asset360ViewModelContext';

const RANGE = {
  start: '2026-03-07T14:39:43.480Z',
  end: '2026-03-14T14:39:43.480Z',
};

describe('Asset360App', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500);
  });

  it('supports the investigation flow from search through chart and activity details', async () => {
    const services = makeServices({
      asset: {
        search: vi.fn(() => Promise.resolve([mockAsset])),
        retrieve: vi.fn(() => Promise.resolve(mockAsset)),
      },
      timeSeries: {
        listByAsset: vi.fn(() => Promise.resolve([mockTimeSeries])),
        retrieveLatest: vi.fn(() =>
          Promise.resolve([
            {
              series: mockTimeSeries.id,
              timestamp: RANGE.end,
              value: 42,
            },
          ])
        ),
        retrieveRange: vi.fn(() =>
          Promise.resolve([mockNumericSeriesData])
        ),
      },
      activity: {
        listByAsset: vi.fn(() => Promise.resolve([mockActivity])),
      },
    });
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );
    const user = userEvent.setup();

    renderAsset360(services, { syncInternalState });

    await user.type(screen.getByLabelText('Search assets'), 'pump');
    await screen.findByRole('button', { name: 'Open Main pump' });
    await user.click(screen.getByRole('button', { name: 'Open Main pump' }));

    expect(
      await screen.findByRole('heading', { name: 'Main pump' })
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole('checkbox', { name: /Discharge pressure/ })
    );

    expect(
      await screen.findByRole('img', { name: 'Numeric time-series chart' })
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', {
        name: 'Open activity details for activity-1',
      })
    );

    expect(
      screen.getByRole('heading', { name: 'Activity details' })
    ).toBeInTheDocument();
    expect(screen.getByText('Routine inspection')).toBeInTheDocument();
    expect(syncInternalState).toHaveBeenCalled();
  });

  it('keeps successful panels usable when time-series loading fails', async () => {
    const services = makeServices({
      asset: {
        retrieve: vi.fn(() => Promise.resolve(mockAsset)),
      },
      timeSeries: {
        listByAsset: vi.fn(() =>
          Promise.reject(
            new CdfServiceError('request', 'Time series are unavailable.')
          )
        ),
      },
      activity: {
        listByAsset: vi.fn(() => Promise.resolve([mockActivity])),
      },
    });

    renderAsset360(services, undefined, makeAssetState());

    expect(
      await screen.findByRole('heading', { name: 'Main pump' })
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Time series are unavailable.')
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('list', { name: 'Work orders / activities' })
    ).toBeInTheDocument();
    expect(screen.getByText('Inspect pump seal')).toBeInTheDocument();
  });

  it('returns to the restored search without losing its query', async () => {
    const services = makeServices({
      asset: {
        search: vi.fn(() => Promise.resolve([mockAsset])),
        retrieve: vi.fn(() => Promise.resolve(mockAsset)),
      },
    });
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );
    const user = userEvent.setup();

    renderAsset360(
      services,
      { syncInternalState },
      makeAssetState({ searchQuery: 'pump' })
    );

    await user.click(
      await screen.findByRole('button', { name: 'Back to asset search' })
    );

    expect(await screen.findByLabelText('Search assets')).toHaveValue('pump');
    expect(
      await screen.findByRole('button', { name: 'Open Main pump' })
    ).toBeInTheDocument();
    await waitFor(() => expect(syncInternalState).toHaveBeenCalledOnce());
  });

  it('restores the asset, chart range, series selection, and activity details', async () => {
    const services = makeServices({
      asset: {
        retrieve: vi.fn(() => Promise.resolve(mockAsset)),
      },
      timeSeries: {
        listByAsset: vi.fn(() => Promise.resolve([mockTimeSeries])),
        retrieveRange: vi.fn(() =>
          Promise.resolve([mockNumericSeriesData])
        ),
      },
      activity: {
        listByAsset: vi.fn(() => Promise.resolve([mockActivity])),
      },
    });
    const restored = makeAssetState({
      searchQuery: 'pump',
      selectedTimeSeriesIds: [mockTimeSeries.id],
      chartRange: RANGE,
      selectedActivityId: mockActivity.id,
    });

    renderAsset360(services, undefined, restored);

    expect(
      await screen.findByRole('img', { name: 'Numeric time-series chart' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Activity details' })
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Discharge pressure/ })).toBeChecked();
    expect(services.timeSeries.retrieveLatest).not.toHaveBeenCalled();
    expect(services.timeSeries.retrieveRange).toHaveBeenCalledWith(
      [mockTimeSeries.id],
      RANGE
    );
  });
});

type Services = {
  asset: AssetService;
  timeSeries: TimeSeriesService;
  activity: ActivityService;
};

function renderAsset360(
  services: Services,
  hostStateSync: HostStateSync = {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
  },
  initialState?: Asset360State
) {
  const context: Asset360ViewModelContextType = {
    useAssetService: () => services.asset,
    useTimeSeriesService: () => services.timeSeries,
    useActivityService: () => services.activity,
    useAsset360StateStorage,
    useHostStateSync: () => hostStateSync,
    searchDelay: () => Promise.resolve(),
  };

  return renderWithProviders(<Asset360App />, {
    asset360InitialState:
      initialState === undefined ? undefined : JSON.stringify(initialState),
    viewModelContext: context,
  });
}

function makeServices(overrides: {
  asset?: Partial<AssetService>;
  timeSeries?: Partial<TimeSeriesService>;
  activity?: Partial<ActivityService>;
} = {}): Services {
  return {
    asset: {
      search: vi.fn(() => Promise.resolve([])),
      retrieve: vi.fn(() => Promise.resolve(undefined)),
      ...overrides.asset,
    },
    timeSeries: {
      listByAsset: vi.fn(() => Promise.resolve([])),
      retrieveLatest: vi.fn(() => Promise.resolve([])),
      retrieveRange: vi.fn(() => Promise.resolve([])),
      ...overrides.timeSeries,
    },
    activity: {
      listByAsset: vi.fn(() => Promise.resolve([])),
      ...overrides.activity,
    },
  };
}

function makeAssetState(
  overrides: Partial<Asset360State> = {}
): Asset360State {
  return {
    ...createDefaultAsset360State(),
    activeView: 'asset',
    selectedAssetId: mockAsset.id,
    ...overrides,
  };
}
