import type {
  CogniteClient,
  Datapoints,
  NodeDefinition,
  PropertyValueGroupV3,
} from '@cognite/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeId } from '../domain/asset360Types';

import type { CdfRetryDependencies } from './cdf429Retry';
import { CdfServiceError } from './cdfErrors';
import {
  createTimeSeriesService,
  type TimeSeriesServiceClient,
} from './timeSeriesService';

const ASSET_ID = { space: 'assets', externalId: 'asset-1' };
const TIME_SERIES_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteTimeSeries',
  version: 'v1',
};

describe('TimeSeriesService', () => {
  let list: ReturnType<typeof vi.fn<CogniteClient['instances']['list']>>;
  let retrieveLatest: ReturnType<
    typeof vi.fn<CogniteClient['timeseries']['data']['retrieveLatest']>
  >;
  let retrieve: ReturnType<
    typeof vi.fn<CogniteClient['timeseries']['data']['retrieve']>
  >;
  let client: TimeSeriesServiceClient;

  beforeEach(() => {
    list = vi.fn<CogniteClient['instances']['list']>();
    retrieveLatest =
      vi.fn<CogniteClient['timeseries']['data']['retrieveLatest']>();
    retrieve = vi.fn<CogniteClient['timeseries']['data']['retrieve']>();
    client = {
      instances: { list },
      timeseries: { data: { retrieveLatest, retrieve } },
    };
  });

  it('lists all related series with the verified filter and cursor', async () => {
    list
      .mockResolvedValueOnce({
        items: [
          makeSeriesNode('numeric', {
            name: 'Pressure',
            description: 'Discharge pressure',
            type: 'numeric',
            isStep: false,
            sourceUnit: 'bar',
            unit: { space: 'units', externalId: 'pressure:bar' },
          }),
          makeSeriesNode('string', { type: 'string' }),
        ],
        nextCursor: 'next-page',
      })
      .mockResolvedValueOnce({
        items: [
          makeSeriesNode('state', { type: 'state' }),
          makeSeriesNode('unknown', { type: 'future-type' }),
        ],
      });

    const result = await createTimeSeriesService(client).listByAsset(ASSET_ID);

    expect(list).toHaveBeenNthCalledWith(1, {
      instanceType: 'node',
      sources: [{ source: TIME_SERIES_VIEW }],
      filter: {
        containsAny: {
          property: ['cdf_cdm', 'CogniteTimeSeries/v1', 'assets'],
          values: [ASSET_ID],
        },
      },
      limit: 1000,
    });
    expect(list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: 'next-page' })
    );
    expect(result.map((series) => series.type)).toEqual([
      'numeric',
      'string',
      'state',
      'unknown',
    ]);
    expect(result[0]).toEqual({
      id: { space: 'series', externalId: 'numeric' },
      name: 'Pressure',
      description: 'Discharge pressure',
      type: 'numeric',
      isStep: false,
      sourceUnit: 'bar',
      unit: { space: 'units', externalId: 'pressure:bar' },
    });
  });

  it('returns an empty related-series list', async () => {
    list.mockResolvedValue({ items: [] });

    await expect(
      createTimeSeriesService(client).listByAsset(ASSET_ID)
    ).resolves.toEqual([]);
  });

  it('retrieves latest numeric datapoints in batches of at most 100', async () => {
    const ids = makeIds(205);
    retrieveLatest
      .mockResolvedValueOnce(ids.slice(0, 100).map(makeLatestResponse))
      .mockResolvedValueOnce(ids.slice(100, 200).map(makeLatestResponse))
      .mockResolvedValueOnce(ids.slice(200).map(makeLatestResponse));

    const result = await createTimeSeriesService(client).retrieveLatest(ids);

    expect(retrieveLatest).toHaveBeenCalledTimes(3);
    for (const call of retrieveLatest.mock.calls) {
      expect(call[0]).toHaveLength(call === retrieveLatest.mock.calls[2] ? 5 : 100);
      expect(call[1]).toEqual({ ignoreUnknownIds: true });
    }
    expect(result).toHaveLength(205);
    expect(result[0]).toEqual({
      series: ids[0],
      timestamp: '2026-03-14T14:39:43.480Z',
      value: 10,
    });
  });

  it('returns no latest datapoints for an empty selection', async () => {
    const result = await createTimeSeriesService(client).retrieveLatest([]);

    expect(result).toEqual([]);
    expect(retrieveLatest).not.toHaveBeenCalled();
  });

  it('retrieves an inclusive logical range and follows each series cursor independently', async () => {
    const first = { space: 'series', externalId: 'first' };
    const second = { space: 'series', externalId: 'second' };
    retrieve
      .mockResolvedValueOnce([
        makeRangeResponse(first, [1], 'first-cursor'),
        makeRangeResponse(second, [2]),
      ])
      .mockResolvedValueOnce([
        makeRangeResponse(first, [3], 'first-cursor-2'),
      ])
      .mockResolvedValueOnce([makeRangeResponse(first, [4])]);

    const result = await createTimeSeriesService(client).retrieveRange(
      [first, second],
      {
        start: '2026-03-07T00:00:00.000Z',
        end: '2026-03-14T00:00:00.000Z',
      }
    );

    expect(retrieve).toHaveBeenNthCalledWith(1, {
      items: [
        {
          instanceId: first,
          start: new Date('2026-03-07T00:00:00.000Z'),
          end: new Date('2026-03-14T00:00:00.001Z'),
          limit: 10000,
        },
        {
          instanceId: second,
          start: new Date('2026-03-07T00:00:00.000Z'),
          end: new Date('2026-03-14T00:00:00.001Z'),
          limit: 10000,
        },
      ],
      ignoreUnknownIds: true,
    });
    expect(retrieve).toHaveBeenNthCalledWith(2, {
      items: [
        {
          instanceId: first,
          start: new Date('2026-03-07T00:00:00.000Z'),
          end: new Date('2026-03-14T00:00:00.001Z'),
          limit: 10000,
          cursor: 'first-cursor',
        },
      ],
      ignoreUnknownIds: true,
    });
    expect(retrieve).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        items: [expect.objectContaining({ cursor: 'first-cursor-2' })],
      })
    );
    expect(result).toEqual([
      {
        series: first,
        datapoints: [
          { timestamp: '2026-03-08T00:00:00.000Z', value: 1 },
          { timestamp: '2026-03-08T00:00:00.000Z', value: 3 },
          { timestamp: '2026-03-08T00:00:00.000Z', value: 4 },
        ],
      },
      {
        series: second,
        datapoints: [
          { timestamp: '2026-03-08T00:00:00.000Z', value: 2 },
        ],
      },
    ]);
  });

  it('rejects invalid ranges before calling CDF', async () => {
    await expect(
      createTimeSeriesService(client).retrieveRange(
        [{ space: 'series', externalId: 'one' }],
        { start: 'not-a-date', end: '2026-03-14T00:00:00.000Z' }
      )
    ).rejects.toEqual(
      new CdfServiceError('request', 'The selected time range is invalid.')
    );
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('retries every rate-limited time-series SDK request', async () => {
    const id = { space: 'series', externalId: 'one' };
    list
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ items: [] });
    retrieveLatest
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce([]);
    retrieve
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce([]);
    const retryDependencies = makeRetryDependencies();
    const service = createTimeSeriesService(client, retryDependencies);

    await service.listByAsset(ASSET_ID);
    await service.retrieveLatest([id]);
    await service.retrieveRange([id], {
      start: '2026-03-07T00:00:00.000Z',
      end: '2026-03-14T00:00:00.000Z',
    });

    expect(list).toHaveBeenCalledTimes(2);
    expect(retrieveLatest).toHaveBeenCalledTimes(2);
    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(retryDependencies.sleep).toHaveBeenCalledTimes(3);
  });

  it('classifies denied metadata and datapoint requests safely', async () => {
    list.mockRejectedValue({ response: { status: 401 }, message: 'secret' });
    retrieveLatest.mockRejectedValue(new Error('private endpoint detail'));

    await expect(
      createTimeSeriesService(client).listByAsset(ASSET_ID)
    ).rejects.toEqual(
      new CdfServiceError('noAccess', 'You do not have access to time series.')
    );
    await expect(
      createTimeSeriesService(client).retrieveLatest([
        { space: 'series', externalId: 'one' },
      ])
    ).rejects.toEqual(
      new CdfServiceError('request', 'Time-series datapoints could not be loaded.')
    );
  });
});

function makeSeriesNode(
  externalId: string,
  properties: PropertyValueGroupV3
): NodeDefinition {
  return {
    instanceType: 'node',
    space: 'series',
    externalId,
    version: 1,
    createdTime: 0,
    lastUpdatedTime: 0,
    properties: {
      cdf_cdm: {
        'CogniteTimeSeries/v1': properties,
      },
    },
  };
}

function makeIds(count: number): NodeId[] {
  return Array.from({ length: count }, (_value: unknown, index: number) => ({
    space: 'series',
    externalId: `series-${index}`,
  }));
}

function makeLatestResponse(id: NodeId): Datapoints {
  return {
    id: 1,
    instanceId: id,
    isString: false,
    type: 'numeric',
    datapoints: [
      {
        timestamp: new Date('2026-03-14T14:39:43.480Z'),
        value: 10,
      },
    ],
  };
}

function makeRangeResponse(
  id: NodeId,
  values: number[],
  nextCursor?: string
): Datapoints {
  return {
    id: 1,
    instanceId: id,
    isString: false,
    type: 'numeric',
    nextCursor,
    datapoints: values.map((value: number) => ({
      timestamp: new Date('2026-03-08T00:00:00.000Z'),
      value,
    })),
  };
}

function makeRetryDependencies(): CdfRetryDependencies {
  return {
    sleep: vi.fn(() => Promise.resolve()),
    random: () => 0,
    now: () => 0,
  };
}
