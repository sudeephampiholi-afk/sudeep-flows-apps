import type { CogniteClient, NodeOrEdge } from '@cognite/sdk';

import type {
  LatestNumericDatapoint,
  NodeId,
  NumericDatapoint,
  NumericSeriesData,
  TimeRange,
  TimeSeriesSummary,
  TimeSeriesType,
} from '../domain/asset360Types';
import { isNodeId, nodeKey } from '../domain/nodeId';

import {
  withCdf429Retry,
  type CdfRetryDependencies,
} from './cdf429Retry';
import { CdfServiceError, classifyCdfError } from './cdfErrors';

const INSTANCE_PAGE_LIMIT = 1000;
const DATAPOINT_BATCH_LIMIT = 100;
const DATAPOINT_PAGE_LIMIT = 10000;
const TIME_SERIES_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteTimeSeries',
  version: 'v1',
} satisfies {
  type: 'view';
  space: string;
  externalId: string;
  version: string;
};

export interface TimeSeriesServiceClient {
  instances: {
    list: CogniteClient['instances']['list'];
  };
  timeseries: {
    data: {
      retrieveLatest: CogniteClient['timeseries']['data']['retrieveLatest'];
      retrieve: CogniteClient['timeseries']['data']['retrieve'];
    };
  };
}

export interface TimeSeriesService {
  listByAsset(asset: NodeId): Promise<TimeSeriesSummary[]>;
  retrieveLatest(series: NodeId[]): Promise<LatestNumericDatapoint[]>;
  retrieveRange(
    series: NodeId[],
    range: TimeRange
  ): Promise<NumericSeriesData[]>;
}

class CogniteTimeSeriesService implements TimeSeriesService {
  constructor(
    private readonly client: TimeSeriesServiceClient,
    private readonly retryDependencies?: CdfRetryDependencies
  ) {}

  async listByAsset(asset: NodeId): Promise<TimeSeriesSummary[]> {
    try {
      const series: TimeSeriesSummary[] = [];
      let cursor: string | undefined;
      do {
        const response = await withCdf429Retry(
          () =>
            this.client.instances.list({
              instanceType: 'node',
              sources: [{ source: TIME_SERIES_VIEW }],
              filter: relationFilter(asset),
              limit: INSTANCE_PAGE_LIMIT,
              ...(cursor ? { cursor } : {}),
            }),
          this.retryDependencies
        );
        series.push(...response.items.flatMap(parseTimeSeries));
        cursor = response.nextCursor;
      } while (cursor);
      return series;
    } catch (error: unknown) {
      throw classifyCdfError(
        error,
        'You do not have access to time series.',
        'Time series could not be loaded.'
      );
    }
  }

  async retrieveLatest(
    series: NodeId[]
  ): Promise<LatestNumericDatapoint[]> {
    if (series.length === 0) return [];
    try {
      const latest: LatestNumericDatapoint[] = [];
      for (const batch of chunk(series, DATAPOINT_BATCH_LIMIT)) {
        const response = await withCdf429Retry(
          () =>
            this.client.timeseries.data.retrieveLatest(
              batch.map((id: NodeId) => ({
                instanceId: id,
                before: 'now',
              })),
              { ignoreUnknownIds: true }
            ),
          this.retryDependencies
        );
        latest.push(...parseLatestResponses(response));
      }
      return latest;
    } catch (error: unknown) {
      throw classifyCdfError(
        error,
        'You do not have access to time-series datapoints.',
        'Time-series datapoints could not be loaded.'
      );
    }
  }

  async retrieveRange(
    series: NodeId[],
    range: TimeRange
  ): Promise<NumericSeriesData[]> {
    if (series.length === 0) return [];
    const parsedRange = parseRange(range);
    try {
      const datapointsBySeries = new Map<string, NumericDatapoint[]>();
      for (const id of series) datapointsBySeries.set(nodeKey(id), []);

      for (const batch of chunk(series, DATAPOINT_BATCH_LIMIT)) {
        await this.retrieveRangeBatch(batch, parsedRange, datapointsBySeries);
      }

      return series.map((id: NodeId) => ({
        series: id,
        datapoints: datapointsBySeries.get(nodeKey(id)) ?? [],
      }));
    } catch (error: unknown) {
      if (error instanceof CdfServiceError) throw error;
      throw classifyCdfError(
        error,
        'You do not have access to time-series datapoints.',
        'Time-series datapoints could not be loaded.'
      );
    }
  }

  private async retrieveRangeBatch(
    series: NodeId[],
    range: ParsedRange,
    datapointsBySeries: Map<string, NumericDatapoint[]>
  ): Promise<void> {
    let requests = series.map((id: NodeId) => rangeRequest(id, range));
    while (requests.length > 0) {
      const response = await withCdf429Retry(
        () =>
          this.client.timeseries.data.retrieve({
            items: requests,
            ignoreUnknownIds: true,
          }),
        this.retryDependencies
      );
      const pages = parseRangeResponses(response);
      const nextRequests: RangeRequest[] = [];
      for (const page of pages) {
        const key = nodeKey(page.series);
        const existing = datapointsBySeries.get(key);
        if (existing) existing.push(...page.datapoints);
        if (page.nextCursor) {
          nextRequests.push(rangeRequest(page.series, range, page.nextCursor));
        }
      }
      requests = nextRequests;
    }
  }
}

export function createTimeSeriesService(
  client: TimeSeriesServiceClient,
  retryDependencies?: CdfRetryDependencies
): TimeSeriesService {
  return new CogniteTimeSeriesService(client, retryDependencies);
}

type ParsedRange = {
  start: Date;
  exclusiveEnd: Date;
};

type RangeRequest = {
  instanceId: NodeId;
  start: Date;
  end: Date;
  limit: number;
  cursor?: string;
};

type RangePage = NumericSeriesData & {
  nextCursor?: string;
};

function relationFilter(asset: NodeId) {
  return {
    containsAny: {
      property: ['cdf_cdm', 'CogniteTimeSeries/v1', 'assets'],
      values: [asset],
    },
  };
}

function parseTimeSeries(item: NodeOrEdge): TimeSeriesSummary[] {
  if (item.instanceType !== 'node') return [];
  const properties = getViewProperties(item);
  const type = parseTimeSeriesType(properties.type);
  return [
    {
      id: { space: item.space, externalId: item.externalId },
      type,
      ...optionalString(properties, 'name'),
      ...optionalString(properties, 'description'),
      ...optionalBoolean(properties, 'isStep'),
      ...optionalString(properties, 'sourceUnit'),
      ...optionalNodeId(properties, 'unit'),
    },
  ];
}

function parseLatestResponses(value: unknown): LatestNumericDatapoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!isRecord(item) || !isNodeId(item.instanceId)) return [];
    const datapoints = item.datapoints;
    if (!Array.isArray(datapoints) || datapoints.length === 0) return [];
    const datapoint = parseNumericDatapoint(datapoints[0]);
    return datapoint
      ? [{ series: item.instanceId, ...datapoint }]
      : [];
  });
}

function parseRangeResponses(value: unknown): RangePage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (!isRecord(item) || !isNodeId(item.instanceId)) return [];
    const values = Array.isArray(item.datapoints)
      ? item.datapoints.flatMap((datapoint: unknown) => {
          const parsed = parseNumericDatapoint(datapoint);
          return parsed ? [parsed] : [];
        })
      : [];
    return [
      {
        series: item.instanceId,
        datapoints: values,
        ...(typeof item.nextCursor === 'string'
          ? { nextCursor: item.nextCursor }
          : {}),
      },
    ];
  });
}

function parseNumericDatapoint(value: unknown): NumericDatapoint | undefined {
  if (!isRecord(value) || typeof value.value !== 'number') return undefined;
  const timestamp = toIsoTimestamp(value.timestamp);
  return timestamp ? { timestamp, value: value.value } : undefined;
}

function parseRange(range: TimeRange): ParsedRange {
  const start = new Date(range.start);
  const logicalEnd = new Date(range.end);
  const exclusiveEndMilliseconds = logicalEnd.getTime() + 1;
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(logicalEnd.getTime()) ||
    start.getTime() > logicalEnd.getTime() ||
    !Number.isFinite(exclusiveEndMilliseconds)
  ) {
    throw new CdfServiceError('request', 'The selected time range is invalid.');
  }
  return {
    start,
    exclusiveEnd: new Date(exclusiveEndMilliseconds),
  };
}

function rangeRequest(
  instanceId: NodeId,
  range: ParsedRange,
  cursor?: string
): RangeRequest {
  return {
    instanceId,
    start: range.start,
    end: range.exclusiveEnd,
    limit: DATAPOINT_PAGE_LIMIT,
    ...(cursor ? { cursor } : {}),
  };
}

function getViewProperties(
  item: Extract<NodeOrEdge, { instanceType: 'node' }>
): Record<string, unknown> {
  const value = item.properties?.cdf_cdm?.['CogniteTimeSeries/v1'];
  return isRecord(value) ? value : {};
}

function parseTimeSeriesType(value: unknown): TimeSeriesType {
  return value === 'numeric' || value === 'string' || value === 'state'
    ? value
    : 'unknown';
}

function optionalString(
  properties: Record<string, unknown>,
  property: 'name' | 'description' | 'sourceUnit'
): Partial<TimeSeriesSummary> {
  const value = properties[property];
  return typeof value === 'string' ? { [property]: value } : {};
}

function optionalBoolean(
  properties: Record<string, unknown>,
  property: 'isStep'
): Partial<TimeSeriesSummary> {
  const value = properties[property];
  return typeof value === 'boolean' ? { [property]: value } : {};
}

function optionalNodeId(
  properties: Record<string, unknown>,
  property: 'unit'
): Partial<TimeSeriesSummary> {
  const value = properties[property];
  return isNodeId(value) ? { [property]: value } : {};
}

function toIsoTimestamp(value: unknown): string | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

