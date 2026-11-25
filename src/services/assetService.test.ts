import type {
  CogniteClient,
  EdgeDefinition,
  NodeDefinition,
  PropertyValueGroupV3,
} from '@cognite/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAssetService,
  type AssetServiceClient,
} from './assetService';
import type { CdfRetryDependencies } from './cdf429Retry';
import { CdfServiceError } from './cdfErrors';

const ASSET_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteAsset',
  version: 'v1',
};

describe('AssetService', () => {
  let search: ReturnType<
    typeof vi.fn<CogniteClient['instances']['search']>
  >;
  let retrieve: ReturnType<
    typeof vi.fn<CogniteClient['instances']['retrieve']>
  >;
  let client: AssetServiceClient;

  beforeEach(() => {
    search = vi.fn<CogniteClient['instances']['search']>();
    retrieve = vi.fn<CogniteClient['instances']['retrieve']>();
    client = { instances: { search, retrieve } };
  });

  it('promotes exact tag and name matches while preserving rank within each group', async () => {
    search.mockResolvedValue({
      items: [
        makeNode('assets', 'backend-first', {
          name: 'Pump 23',
          tags: ['critical', 'water-injection'],
        }),
        makeNode('assets', 'exact-name', { name: '23-VA-9110' }),
        makeNode('assets', '23-va-9110', { name: 'Another exact match' }),
        makeNode('assets', 'backend-last', { name: 'Pump 23 backup' }),
      ],
    });

    const result = await createAssetService(client).search(' 23-VA-9110 ');

    expect(search).toHaveBeenCalledWith({
      view: ASSET_VIEW,
      instanceType: 'node',
      query: '23-VA-9110',
      operator: 'AND',
      limit: 25,
    });
    expect(result.map((asset) => asset.id.externalId)).toEqual([
      'exact-name',
      '23-va-9110',
      'backend-first',
      'backend-last',
    ]);
    expect(result[2]?.tags).toEqual(['critical', 'water-injection']);
  });

  it('returns an empty search result without making an SDK request', async () => {
    const result = await createAssetService(client).search('   ');

    expect(result).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it.each([
    ['an overlong query', 'a'.repeat(201)],
    ['a query with control characters', 'pump\u0000query'],
  ])('rejects %s before making an SDK request', async (_scenario, query) => {
    await expect(createAssetService(client).search(query)).rejects.toEqual(
      new CdfServiceError('request', 'Enter a valid search of 200 characters or fewer.')
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('retrieves and parses one exact asset from verified properties', async () => {
    retrieve.mockResolvedValue({
      items: [
        makeNode('assets', 'asset-1', {
          name: 'Main pump',
          description: 'Water injection pump',
          aliases: ['P-1'],
          tags: ['critical'],
          parent: { space: 'assets', externalId: 'parent-1' },
          type: { space: 'types', externalId: 'pump' },
          unverified: 'ignored',
        }),
      ],
    });

    const result = await createAssetService(client).retrieve({
      space: 'assets',
      externalId: 'asset-1',
    });

    expect(retrieve).toHaveBeenCalledWith({
      items: [
        {
          instanceType: 'node',
          space: 'assets',
          externalId: 'asset-1',
        },
      ],
      sources: [{ source: ASSET_VIEW }],
    });
    expect(result).toEqual({
      id: { space: 'assets', externalId: 'asset-1' },
      name: 'Main pump',
      description: 'Water injection pump',
      aliases: ['P-1'],
      tags: ['critical'],
      parent: { space: 'assets', externalId: 'parent-1' },
      type: { space: 'types', externalId: 'pump' },
    });
  });

  it('returns undefined when the exact asset is absent or malformed', async () => {
    retrieve.mockResolvedValue({
      items: [
        makeNode('assets', 'different'),
        makeEdge(),
      ],
    });

    const result = await createAssetService(client).retrieve({
      space: 'assets',
      externalId: 'missing',
    });

    expect(result).toBeUndefined();
  });

  it('retries rate-limited search and retrieve SDK requests', async () => {
    search
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue({ items: [] });
    retrieve
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue({ items: [] });
    const retryDependencies = makeRetryDependencies();
    const service = createAssetService(client, retryDependencies);

    await service.search('pump');
    await service.retrieve({ space: 'assets', externalId: 'asset-1' });

    expect(search).toHaveBeenCalledTimes(2);
    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(retryDependencies.sleep).toHaveBeenCalledTimes(2);
  });

  it('throws a safe no-access error for denied asset requests', async () => {
    search.mockRejectedValue({ status: 403, message: 'private detail' });

    await expect(createAssetService(client).search('pump')).rejects.toEqual(
      new CdfServiceError('noAccess', 'You do not have access to assets.')
    );
  });

  it('throws a safe request error for ordinary asset failures', async () => {
    retrieve.mockRejectedValue(new Error('socket detail'));

    await expect(
      createAssetService(client).retrieve({
        space: 'assets',
        externalId: 'asset-1',
      })
    ).rejects.toEqual(
      new CdfServiceError('request', 'The asset could not be loaded.')
    );
  });
});

function makeNode(
  space: string,
  externalId: string,
  properties: PropertyValueGroupV3 = {}
): NodeDefinition {
  return {
    instanceType: 'node',
    space,
    externalId,
    version: 1,
    createdTime: 0,
    lastUpdatedTime: 0,
    properties: {
      cdf_cdm: {
        'CogniteAsset/v1': properties,
      },
    },
  };
}

function makeEdge(): EdgeDefinition {
  return {
    instanceType: 'edge',
    space: 'assets',
    externalId: 'edge-1',
    version: 1,
    createdTime: 0,
    lastUpdatedTime: 0,
    type: { space: 'types', externalId: 'relatedTo' },
    startNode: { space: 'assets', externalId: 'start' },
    endNode: { space: 'assets', externalId: 'end' },
  };
}

function makeRetryDependencies(): CdfRetryDependencies {
  return {
    sleep: vi.fn(() => Promise.resolve()),
    random: () => 0,
    now: () => 0,
  };
}
