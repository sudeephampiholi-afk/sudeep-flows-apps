import type {
  Activity,
  Asset,
  NumericSeriesData,
  TimeSeriesSummary,
} from '../domain/asset360Types';

export const mockAsset: Asset = {
  id: {
    space: 'asset-space',
    externalId: 'asset-1',
  },
  name: 'Main pump',
  description: 'Water injection pump',
  aliases: ['P-1'],
  tags: ['critical'],
  parent: {
    space: 'asset-space',
    externalId: 'parent-1',
  },
  type: {
    space: 'type-space',
    externalId: 'pump',
  },
};

export const mockTimeSeries: TimeSeriesSummary = {
  id: {
    space: 'time-series-space',
    externalId: 'pressure',
  },
  name: 'Discharge pressure',
  type: 'numeric',
  isStep: false,
  sourceUnit: 'bar',
};

export const mockNumericSeriesData: NumericSeriesData = {
  series: mockTimeSeries.id,
  datapoints: [
    {
      timestamp: '2026-03-14T14:39:43.480Z',
      value: 42,
    },
  ],
};

export const mockActivity: Activity = {
  id: {
    space: 'activity-space',
    externalId: 'activity-1',
  },
  name: 'Inspect pump seal',
  description: 'Routine inspection',
  tags: ['maintenance'],
  endTime: '2026-03-14T12:00:00.000Z',
};
