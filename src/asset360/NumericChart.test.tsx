import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockNumericSeriesData, mockTimeSeries } from '../__mocks__/asset360';
import type {
  NumericSeriesData,
  TimeSeriesSummary,
} from '../domain/asset360Types';
import { renderWithProviders } from '../test/renderWithProviders';

import { NumericChart } from './NumericChart';

const SECOND_SERIES: TimeSeriesSummary = {
  id: { space: 'time-series-space', externalId: 'temperature' },
  name: undefined,
  type: 'numeric',
  isStep: true,
};

describe('NumericChart', () => {
  it('describes a single datapoint and series in the summary', () => {
    renderWithProviders(
      <NumericChart
        series={[mockNumericSeriesData]}
        metadata={[mockTimeSeries]}
      />
    );

    expect(
      screen.getByRole('img', { name: 'Numeric time-series chart' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Showing 1 datapoint across 1 series.')
    ).toBeInTheDocument();
  });

  it('lists the latest value of every series in the accessible summary table', () => {
    // Arrange
    const secondData: NumericSeriesData = {
      series: SECOND_SERIES.id,
      datapoints: [
        { timestamp: '2026-03-14T10:00:00.000Z', value: 1 },
        { timestamp: '2026-03-14T12:00:00.000Z', value: 7 },
        { timestamp: 'not-a-date', value: 99 },
      ],
    };

    // Act
    renderWithProviders(
      <NumericChart
        series={[mockNumericSeriesData, secondData]}
        metadata={[mockTimeSeries, SECOND_SERIES]}
      />
    );

    // Assert
    const table = screen.getByRole('table', {
      name: 'Time-series data summary',
    });
    expect(
      screen.getByText('Showing 4 datapoints across 2 series.')
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('rowheader', { name: 'Discharge pressure' })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('rowheader', { name: 'temperature' })
    ).toBeInTheDocument();
    expect(within(table).getByText('42')).toBeInTheDocument();
    // The latest valid datapoint wins; the invalid timestamp is ignored.
    expect(within(table).getByText('7')).toBeInTheDocument();
    expect(within(table).queryByText('99')).not.toBeInTheDocument();
  });

  it('reports a series without datapoints', () => {
    renderWithProviders(
      <NumericChart
        series={[{ series: mockTimeSeries.id, datapoints: [] }]}
        metadata={[mockTimeSeries]}
      />
    );

    expect(screen.getByText('No datapoints')).toBeInTheDocument();
    expect(screen.getByText('No value')).toBeInTheDocument();
  });
});
