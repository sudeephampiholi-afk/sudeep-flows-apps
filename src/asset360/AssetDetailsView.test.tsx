import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { mockAsset } from '../__mocks__/asset360';
import { renderWithProviders } from '../test/renderWithProviders';

import { AssetDetailsView } from './AssetDetailsView';
import type { ActivitiesViewModel } from './useActivitiesViewModel';
import type { AssetDetailsViewModel } from './useAssetDetailsViewModel';
import type { TimeSeriesViewModel } from './useTimeSeriesViewModel';

describe('AssetDetailsView', () => {
  it('renders verified asset fields and independently loaded panels', () => {
    renderWithProviders(
      <AssetDetailsView
        viewModel={makeViewModel({
          status: 'success',
          asset: mockAsset,
        })}
        timeSeriesViewModel={makeTimeSeriesViewModel()}
        activitiesViewModel={makeActivitiesViewModel({ status: 'empty' })}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Main pump' })
    ).toBeInTheDocument();
    expect(screen.getByText(mockAsset.id.externalId)).toBeInTheDocument();
    expect(screen.getByText('Water injection pump')).toBeInTheDocument();
    expect(screen.getByText('type-space:pump')).toBeInTheDocument();
    expect(screen.getByText('Time series')).toBeInTheDocument();
    expect(
      screen.getByText('Select a numeric series to chart')
    ).toBeInTheDocument();
    expect(screen.getByText('Work orders / activities')).toBeInTheDocument();
    expect(screen.getByText('No related activities')).toBeInTheDocument();
    expect(screen.queryByText('Aliases')).not.toBeInTheDocument();
  });

  it('renders loading, empty, no-access, and request errors with actions', async () => {
    const retry = vi.fn();
    const backToSearch = vi.fn();
    const { rerender } = renderWithProviders(
      <AssetDetailsView
        viewModel={makeViewModel({ status: 'loading', retry, backToSearch })}
        timeSeriesViewModel={makeTimeSeriesViewModel()}
        activitiesViewModel={makeActivitiesViewModel()}
      />
    );
    expect(screen.getByText('Loading asset...')).toBeInTheDocument();

    rerender(
      <AssetDetailsView
        viewModel={makeViewModel({ status: 'empty', retry, backToSearch })}
        timeSeriesViewModel={makeTimeSeriesViewModel()}
        activitiesViewModel={makeActivitiesViewModel()}
      />
    );
    expect(screen.getByText('Asset not found')).toBeInTheDocument();

    rerender(
      <AssetDetailsView
        viewModel={makeViewModel({
          status: 'noAccess',
          errorMessage: 'You do not have access to assets.',
          retry,
          backToSearch,
        })}
        timeSeriesViewModel={makeTimeSeriesViewModel()}
        activitiesViewModel={makeActivitiesViewModel()}
      />
    );
    expect(
      screen.getByText('You do not have access to assets.')
    ).toBeInTheDocument();

    rerender(
      <AssetDetailsView
        viewModel={makeViewModel({
          status: 'error',
          errorMessage: 'The asset could not be loaded.',
          retry,
          backToSearch,
        })}
        timeSeriesViewModel={makeTimeSeriesViewModel()}
        activitiesViewModel={makeActivitiesViewModel()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Back to asset search' })
    );
    expect(retry).toHaveBeenCalledOnce();
    expect(backToSearch).toHaveBeenCalledOnce();
  });
});

function makeViewModel(
  overrides: Partial<AssetDetailsViewModel> = {}
): AssetDetailsViewModel {
  return {
    status: 'loading',
    asset: undefined,
    errorMessage: undefined,
    shareStateWarning: false,
    retry: vi.fn(),
    backToSearch: vi.fn(),
    ...overrides,
  };
}

function makeTimeSeriesViewModel(): TimeSeriesViewModel {
  return {
    linkedStatus: 'success',
    linkedSeries: [],
    linkedErrorMessage: undefined,
    selectedSeriesIds: [],
    hasReachedSelectionLimit: false,
    latestStatus: 'idle',
    latestErrorMessage: undefined,
    rangeStatus: 'idle',
    rangeErrorMessage: undefined,
    range: null,
    rangeDays: undefined,
    seriesData: [],
    isRefreshing: false,
    shareStateWarning: false,
    toggleSeries: vi.fn(),
    setRangePreset: vi.fn(),
    retryLinked: vi.fn(),
    retryLatest: vi.fn(),
    retryRange: vi.fn(),
    refresh: vi.fn(),
  };
}

function makeActivitiesViewModel(
  overrides: Partial<ActivitiesViewModel> = {}
): ActivitiesViewModel {
  return {
    status: 'loading',
    activities: [],
    selectedActivity: undefined,
    errorMessage: undefined,
    shareStateWarning: false,
    retry: vi.fn(),
    selectActivity: vi.fn(),
    closeActivity: vi.fn(),
    ...overrides,
  };
}
