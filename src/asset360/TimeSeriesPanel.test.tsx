import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  mockNumericSeriesData,
  mockTimeSeries,
} from '../__mocks__/asset360';
import { MAX_SELECTED_TIME_SERIES } from '../domain/asset360Validation';
import { renderWithProviders } from '../test/renderWithProviders';

import { TimeSeriesPanel } from './TimeSeriesPanel';
import type { TimeSeriesViewModel } from './useTimeSeriesViewModel';

const STRING_SERIES = {
  id: { space: 'time-series-space', externalId: 'mode' },
  name: 'Operating mode',
  type: 'string' as const,
};
const RANGE = {
  start: '2026-03-07T14:39:43.480Z',
  end: '2026-03-14T14:39:43.480Z',
};

describe('TimeSeriesPanel', () => {
  it('renders linked loading, empty, no-access, and request errors', async () => {
    const retryLinked = vi.fn();
    const { rerender } = renderWithProviders(
      <TimeSeriesPanel
        viewModel={makeViewModel({ linkedStatus: 'loading', retryLinked })}
      />
    );
    expect(screen.getByText('Loading linked time series...')).toBeInTheDocument();

    rerender(
      <TimeSeriesPanel
        viewModel={makeViewModel({ linkedStatus: 'empty', retryLinked })}
      />
    );
    expect(screen.getByText('No linked time series')).toBeInTheDocument();

    rerender(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'noAccess',
          linkedErrorMessage: 'You do not have access to time series.',
          retryLinked,
        })}
      />
    );
    expect(
      screen.getByText('You do not have access to time series.')
    ).toBeInTheDocument();

    rerender(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'error',
          linkedErrorMessage: 'Time series could not be loaded.',
          retryLinked,
        })}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry linked series' })
    );
    expect(retryLinked).toHaveBeenCalledOnce();
  });

  it('lists every type, disables unsupported series, and changes selection', async () => {
    const toggleSeries = vi.fn();
    renderWithProviders(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries, STRING_SERIES],
          toggleSeries,
        })}
      />
    );

    const numeric = screen.getByRole('checkbox', {
      name: /Discharge pressure/,
    });
    const unsupported = screen.getByRole('checkbox', {
      name: /Operating mode/,
    });
    expect(numeric).toBeEnabled();
    expect(unsupported).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('String · unsupported')).toBeInTheDocument();

    await userEvent.click(numeric);
    expect(toggleSeries).toHaveBeenCalledWith(mockTimeSeries);
    expect(
      screen.getByText('Select a numeric series to chart')
    ).toBeInTheDocument();
  });

  it('disables additional series when the URL-safe selection limit is reached', () => {
    renderWithProviders(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries],
          selectedSeriesIds: Array.from(
            { length: MAX_SELECTED_TIME_SERIES },
            (_value, index) => ({
              space: 'time-series-space',
              externalId: `selected-${index}`,
            })
          ),
          hasReachedSelectionLimit: true,
        })}
      />
    );

    expect(
      screen.getByRole('checkbox', { name: /Discharge pressure/ })
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText(`Compare up to ${MAX_SELECTED_TIME_SERIES} series.`)
    ).toBeInTheDocument();
  });

  it('renders latest and range errors with independent retries', async () => {
    const retryLatest = vi.fn();
    const retryRange = vi.fn();
    const { rerender } = renderWithProviders(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries],
          selectedSeriesIds: [mockTimeSeries.id],
          latestStatus: 'error',
          latestErrorMessage: 'Latest datapoints could not be loaded.',
          retryLatest,
        })}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry latest datapoints' })
    );
    expect(retryLatest).toHaveBeenCalledOnce();

    rerender(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries],
          selectedSeriesIds: [mockTimeSeries.id],
          latestStatus: 'success',
          rangeStatus: 'error',
          rangeErrorMessage: 'Range datapoints could not be loaded.',
          range: RANGE,
          retryRange,
        })}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry chart data' })
    );
    expect(retryRange).toHaveBeenCalledOnce();
  });

  it('shows clear empty datapoint states', () => {
    const { rerender } = renderWithProviders(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries],
          selectedSeriesIds: [mockTimeSeries.id],
          latestStatus: 'empty',
        })}
      />
    );
    expect(
      screen.getByText('No datapoints were found for the selected series.')
    ).toBeInTheDocument();

    rerender(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries],
          selectedSeriesIds: [mockTimeSeries.id],
          latestStatus: 'success',
          rangeStatus: 'empty',
          range: RANGE,
        })}
      />
    );
    expect(
      screen.getByText('No datapoints were found in this time range.')
    ).toBeInTheDocument();
  });

  it('renders an accessible chart, summary, controls, and manual refresh', async () => {
    const setRangePreset = vi.fn();
    const refresh = vi.fn();
    renderWithProviders(
      <TimeSeriesPanel
        viewModel={makeViewModel({
          linkedStatus: 'success',
          linkedSeries: [mockTimeSeries],
          selectedSeriesIds: [mockTimeSeries.id],
          latestStatus: 'success',
          rangeStatus: 'success',
          range: RANGE,
          rangeDays: 7,
          seriesData: [mockNumericSeriesData],
          setRangePreset,
          refresh,
        })}
      />
    );

    // The chart is lazy-loaded, so it appears after a short loading state.
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'Numeric time-series chart' })
    ).toBeInTheDocument();
    expect(screen.getByText('Showing 1 datapoint across 1 series.')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Time-series data summary' })
    ).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: '1d' }));
    await userEvent.click(screen.getByRole('button', { name: 'Refresh data' }));
    expect(setRangePreset).toHaveBeenCalledWith(1);
    expect(refresh).toHaveBeenCalledOnce();
  });
});

function makeViewModel(
  overrides: Partial<TimeSeriesViewModel> = {}
): TimeSeriesViewModel {
  return {
    linkedStatus: 'loading',
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
    ...overrides,
  };
}
