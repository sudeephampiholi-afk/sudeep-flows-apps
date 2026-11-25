import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  chartSeriesColor,
  type ChartConfig,
} from '@cognite/aura/chart';
import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import type {
  NumericDatapoint,
  NumericSeriesData,
  TimeSeriesSummary,
} from '../domain/asset360Types';
import { nodeIdsEqual } from '../domain/nodeId';

export function NumericChart({
  series,
  metadata,
}: {
  series: NumericSeriesData[];
  metadata: TimeSeriesSummary[];
}) {
  const visuals = series.map(
    (data: NumericSeriesData, index: number): SeriesVisual => {
      const details = metadata.find((item: TimeSeriesSummary) =>
        nodeIdsEqual(item.id, data.series)
      );
      return {
        key: `series${index + 1}`,
        color: chartSeriesColor(index + 1),
        label: details?.name ?? data.series.externalId,
        isStep: details?.isStep ?? false,
        data,
      };
    }
  );
  const config: ChartConfig = {};
  for (const visual of visuals) {
    config[visual.key] = {
      label: visual.label,
      color: visual.color,
    };
  }
  const rows = createChartRows(visuals);
  const pointCount = series.reduce(
    (count: number, item: NumericSeriesData) =>
      count + item.datapoints.length,
    0
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {pointCount} {pointCount === 1 ? 'datapoint' : 'datapoints'}{' '}
        across {series.length} {series.length === 1 ? 'series' : 'series'}.
      </p>
      <ChartContainer
        aria-label="Numeric time-series chart"
        className="min-w-0 w-full"
        config={config}
      >
        <LineChart data={rows}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatShortTimestamp}
          />
          <YAxis />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={formatTooltipTimestamp}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {visuals.map((visual: SeriesVisual) => (
            <Line
              key={visual.key}
              dataKey={visual.key}
              name={visual.key}
              type={visual.isStep ? 'stepAfter' : 'monotone'}
              stroke={visual.color}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <SeriesSummaryTable visuals={visuals} />
    </div>
  );
}

function SeriesSummaryTable({ visuals }: { visuals: SeriesVisual[] }) {
  return (
    <table className="sr-only">
      <caption>Time-series data summary</caption>
      <thead>
        <tr>
          <th scope="col">Series</th>
          <th scope="col">Datapoints</th>
          <th scope="col">Latest timestamp</th>
          <th scope="col">Latest value</th>
        </tr>
      </thead>
      <tbody>
        {visuals.map((visual: SeriesVisual) => {
          const latest = latestDatapoint(visual.data.datapoints);
          return (
            <tr key={visual.key}>
              <th scope="row">{visual.label}</th>
              <td>{visual.data.datapoints.length}</td>
              <td>
                {latest === undefined
                  ? 'No datapoints'
                  : formatFullTimestamp(latest.timestamp)}
              </td>
              <td>{latest?.value ?? 'No value'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type SeriesVisual = {
  key: string;
  color: string;
  label: string;
  isStep: boolean;
  data: NumericSeriesData;
};

type ChartRow = {
  timestamp: number;
  [key: string]: number;
};

function createChartRows(visuals: SeriesVisual[]): ChartRow[] {
  const byTimestamp = new Map<number, ChartRow>();
  for (const visual of visuals) {
    for (const datapoint of visual.data.datapoints) {
      const timestamp = new Date(datapoint.timestamp).getTime();
      if (!Number.isFinite(timestamp)) continue;
      const row = byTimestamp.get(timestamp) ?? { timestamp };
      row[visual.key] = datapoint.value;
      byTimestamp.set(timestamp, row);
    }
  }
  return [...byTimestamp.values()].sort(
    (first: ChartRow, second: ChartRow) =>
      first.timestamp - second.timestamp
  );
}

function latestDatapoint(
  datapoints: NumericDatapoint[]
): NumericDatapoint | undefined {
  return datapoints.reduce<NumericDatapoint | undefined>(
    (
      latest: NumericDatapoint | undefined,
      datapoint: NumericDatapoint
    ) =>
      latest === undefined ||
      new Date(datapoint.timestamp).getTime() >
        new Date(latest.timestamp).getTime()
        ? datapoint
        : latest,
    undefined
  );
}

function formatShortTimestamp(value: number): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatTooltipTimestamp(value: ReactNode): ReactNode {
  return typeof value === 'number' || typeof value === 'string'
    ? formatFullTimestamp(value)
    : value;
}

function formatFullTimestamp(value: string | number): string {
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime())
    ? timestamp.toLocaleString()
    : 'Unknown time';
}
