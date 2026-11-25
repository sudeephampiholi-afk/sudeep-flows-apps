import type {
  CogniteClient,
  NodeDefinition,
  PropertyValueGroupV3,
} from '@cognite/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createActivityService,
  type ActivityServiceClient,
} from './activityService';
import type { CdfRetryDependencies } from './cdf429Retry';
import { CdfServiceError } from './cdfErrors';

const ASSET_ID = { space: 'assets', externalId: 'asset-1' };
const ACTIVITY_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteActivity',
  version: 'v1',
};

describe('ActivityService', () => {
  let list: ReturnType<typeof vi.fn<CogniteClient['instances']['list']>>;
  let client: ActivityServiceClient;

  beforeEach(() => {
    list = vi.fn<CogniteClient['instances']['list']>();
    client = { instances: { list } };
  });

  it('lists every related activity page with the verified asset filter', async () => {
    list
      .mockResolvedValueOnce({
        items: [
          makeActivity('scheduled', {
            name: 'Scheduled work',
            scheduledEndTime: '2026-03-10T12:00:00.000Z',
          }),
        ],
        nextCursor: 'activity-page-2',
      })
      .mockResolvedValueOnce({
        items: [
          makeActivity('actual', {
            name: 'Completed work',
            description: 'Changed seal',
            tags: ['maintenance'],
            sourceId: 'SAP-100',
            sourceContext: 'SAP',
            source: { space: 'sources', externalId: 'sap' },
            sourceCreatedTime: '2026-03-01T00:00:00.000Z',
            sourceUpdatedTime: '2026-03-09T00:00:00.000Z',
            sourceCreatedUser: 'planner',
            sourceUpdatedUser: 'technician',
            endTime: '2026-03-11T12:00:00.000Z',
            scheduledEndTime: '2026-04-01T00:00:00.000Z',
            status: 'ignored',
          }),
        ],
      });

    const result = await createActivityService(client).listByAsset(ASSET_ID);

    expect(list).toHaveBeenNthCalledWith(1, {
      instanceType: 'node',
      sources: [{ source: ACTIVITY_VIEW }],
      filter: {
        containsAny: {
          property: ['cdf_cdm', 'CogniteActivity/v1', 'assets'],
          values: [ASSET_ID],
        },
      },
      limit: 1000,
    });
    expect(list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: 'activity-page-2' })
    );
    expect(result.map((activity) => activity.id.externalId)).toEqual([
      'actual',
      'scheduled',
    ]);
    expect(result[0]).toEqual({
      id: { space: 'activities', externalId: 'actual' },
      name: 'Completed work',
      description: 'Changed seal',
      tags: ['maintenance'],
      sourceId: 'SAP-100',
      sourceContext: 'SAP',
      source: { space: 'sources', externalId: 'sap' },
      sourceCreatedTime: '2026-03-01T00:00:00.000Z',
      sourceUpdatedTime: '2026-03-09T00:00:00.000Z',
      sourceCreatedUser: 'planner',
      sourceUpdatedUser: 'technician',
      endTime: '2026-03-11T12:00:00.000Z',
      scheduledEndTime: '2026-04-01T00:00:00.000Z',
    });
    expect(result[0]).not.toHaveProperty('status');
  });

  it('uses actual/scheduled date precedence and deterministic tie breaking', async () => {
    list.mockResolvedValue({
      items: [
        makeActivity('z-no-date', { name: 'No date' }),
        makeActivity('b-tie', {
          endTime: '2026-03-10T00:00:00.000Z',
        }),
        makeActivity('a-tie', {
          endTime: '2026-03-10T00:00:00.000Z',
        }),
        makeActivity('actual-start-wins', {
          startTime: '2026-03-11T00:00:00.000Z',
          scheduledStartTime: '2026-04-11T00:00:00.000Z',
        }),
      ],
    });

    const result = await createActivityService(client).listByAsset(ASSET_ID);

    expect(result.map((activity) => activity.id.externalId)).toEqual([
      'actual-start-wins',
      'a-tie',
      'b-tie',
      'z-no-date',
    ]);
  });

  it('returns an empty activities list', async () => {
    list.mockResolvedValue({ items: [] });

    await expect(
      createActivityService(client).listByAsset(ASSET_ID)
    ).resolves.toEqual([]);
  });

  it('retries a rate-limited page without changing its cursor request', async () => {
    list
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce({
        items: [],
        nextCursor: 'activity-page-2',
      })
      .mockResolvedValueOnce({ items: [] });
    const retryDependencies = makeRetryDependencies();

    await createActivityService(
      client,
      retryDependencies
    ).listByAsset(ASSET_ID);

    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls[0]?.[0]).toEqual(list.mock.calls[1]?.[0]);
    expect(list.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ cursor: 'activity-page-2' })
    );
    expect(retryDependencies.sleep).toHaveBeenCalledOnce();
  });

  it('distinguishes denied activity access from ordinary request failures', async () => {
    list
      .mockRejectedValueOnce({ status: 403, message: 'private detail' })
      .mockRejectedValueOnce(new Error('internal URL'));

    await expect(
      createActivityService(client).listByAsset(ASSET_ID)
    ).rejects.toEqual(
      new CdfServiceError('noAccess', 'You do not have access to activities.')
    );
    await expect(
      createActivityService(client).listByAsset(ASSET_ID)
    ).rejects.toEqual(
      new CdfServiceError('request', 'Activities could not be loaded.')
    );
  });
});

function makeActivity(
  externalId: string,
  properties: PropertyValueGroupV3
): NodeDefinition {
  return {
    instanceType: 'node',
    space: 'activities',
    externalId,
    version: 1,
    createdTime: 0,
    lastUpdatedTime: 0,
    properties: {
      cdf_cdm: {
        'CogniteActivity/v1': properties,
      },
    },
  };
}

function makeRetryDependencies(): CdfRetryDependencies {
  return {
    sleep: vi.fn(() => Promise.resolve()),
    random: () => 0,
    now: () => 0,
  };
}
