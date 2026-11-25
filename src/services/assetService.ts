import type { CogniteClient, NodeOrEdge } from '@cognite/sdk';

import type {
  Asset,
  AssetSummary,
  NodeId,
} from '../domain/asset360Types';
import { isValidAssetSearchQuery } from '../domain/asset360Validation';
import { isNodeId } from '../domain/nodeId';

import {
  withCdf429Retry,
  type CdfRetryDependencies,
} from './cdf429Retry';
import { CdfServiceError, classifyCdfError } from './cdfErrors';

const ASSET_SEARCH_LIMIT = 25;
const ASSET_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteAsset',
  version: 'v1',
} satisfies {
  type: 'view';
  space: string;
  externalId: string;
  version: string;
};

export interface AssetServiceClient {
  instances: {
    search: CogniteClient['instances']['search'];
    retrieve: CogniteClient['instances']['retrieve'];
  };
}

export interface AssetService {
  search(query: string): Promise<AssetSummary[]>;
  retrieve(id: NodeId): Promise<Asset | undefined>;
}

class CogniteAssetService implements AssetService {
  constructor(
    private readonly client: AssetServiceClient,
    private readonly retryDependencies?: CdfRetryDependencies
  ) {}

  async search(query: string): Promise<AssetSummary[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    if (!isValidAssetSearchQuery(normalizedQuery)) {
      throw new CdfServiceError(
        'request',
        'Enter a valid search of 200 characters or fewer.'
      );
    }

    try {
      const response = await withCdf429Retry(
        () =>
          this.client.instances.search({
            view: ASSET_VIEW,
            instanceType: 'node',
            query: normalizedQuery,
            operator: 'AND',
            limit: ASSET_SEARCH_LIMIT,
          }),
        this.retryDependencies
      );
      return promoteExactMatches(
        response.items.flatMap(parseAssetSummary),
        normalizedQuery
      );
    } catch (error: unknown) {
      throw classifyCdfError(
        error,
        'You do not have access to assets.',
        'Assets could not be loaded.'
      );
    }
  }

  async retrieve(id: NodeId): Promise<Asset | undefined> {
    try {
      const response = await withCdf429Retry(
        () =>
          this.client.instances.retrieve({
            items: [{ instanceType: 'node', ...id }],
            sources: [{ source: ASSET_VIEW }],
          }),
        this.retryDependencies
      );
      return response.items
        .filter((item: NodeOrEdge) => sameNode(item, id))
        .flatMap(parseAsset)[0];
    } catch (error: unknown) {
      throw classifyCdfError(
        error,
        'You do not have access to assets.',
        'The asset could not be loaded.'
      );
    }
  }
}

export function createAssetService(
  client: AssetServiceClient,
  retryDependencies?: CdfRetryDependencies
): AssetService {
  return new CogniteAssetService(client, retryDependencies);
}

function parseAssetSummary(item: NodeOrEdge): AssetSummary[] {
  if (item.instanceType !== 'node') return [];
  const properties = getViewProperties(item, 'CogniteAsset');
  return [
    compactAssetSummary({
      id: toNodeId(item),
      name: readString(properties, 'name'),
      description: readString(properties, 'description'),
      tags: readStringArray(properties, 'tags'),
      parent: readNodeId(properties, 'parent'),
    }),
  ];
}

function promoteExactMatches(
  assets: AssetSummary[],
  query: string
): AssetSummary[] {
  const exact: AssetSummary[] = [];
  const other: AssetSummary[] = [];

  for (const asset of assets) {
    const isExact =
      normalizedEquals(asset.id.externalId, query) ||
      (asset.name !== undefined && normalizedEquals(asset.name, query));
    (isExact ? exact : other).push(asset);
  }

  return [...exact, ...other];
}

function normalizedEquals(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function parseAsset(item: NodeOrEdge): Asset[] {
  if (item.instanceType !== 'node') return [];
  const properties = getViewProperties(item, 'CogniteAsset');
  const summary = compactAssetSummary({
    id: toNodeId(item),
    name: readString(properties, 'name'),
    description: readString(properties, 'description'),
    tags: readStringArray(properties, 'tags'),
    parent: readNodeId(properties, 'parent'),
  });
  return [
    compactAsset({
      ...summary,
      aliases: readStringArray(properties, 'aliases'),
      tags: readStringArray(properties, 'tags'),
      type: readNodeId(properties, 'type'),
    }),
  ];
}

function compactAssetSummary(value: {
  id: NodeId;
  name: string | undefined;
  description: string | undefined;
  tags: string[];
  parent: NodeId | undefined;
}): AssetSummary {
  return {
    id: value.id,
    tags: value.tags,
    ...(value.name ? { name: value.name } : {}),
    ...(value.description ? { description: value.description } : {}),
    ...(value.parent ? { parent: value.parent } : {}),
  };
}

function compactAsset(value: Asset): Asset {
  return {
    id: value.id,
    aliases: value.aliases,
    tags: value.tags,
    ...(value.name ? { name: value.name } : {}),
    ...(value.description ? { description: value.description } : {}),
    ...(value.parent ? { parent: value.parent } : {}),
    ...(value.type ? { type: value.type } : {}),
  };
}

function sameNode(item: NodeOrEdge, id: NodeId): boolean {
  return (
    item.instanceType === 'node' &&
    item.space === id.space &&
    item.externalId === id.externalId
  );
}

function getViewProperties(
  item: Extract<NodeOrEdge, { instanceType: 'node' }>,
  viewExternalId: string
): Record<string, unknown> {
  const value = item.properties?.cdf_cdm?.[`${viewExternalId}/v1`];
  return isRecord(value) ? value : {};
}

function readString(
  value: Record<string, unknown>,
  property: string
): string | undefined {
  const candidate = value[property];
  return typeof candidate === 'string' ? candidate : undefined;
}

function readStringArray(
  value: Record<string, unknown>,
  property: string
): string[] {
  const candidate = value[property];
  return Array.isArray(candidate)
    ? candidate.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

function readNodeId(
  value: Record<string, unknown>,
  property: string
): NodeId | undefined {
  const candidate = value[property];
  return isNodeId(candidate) ? candidate : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNodeId(
  item: Extract<NodeOrEdge, { instanceType: 'node' }>
): NodeId {
  return { space: item.space, externalId: item.externalId };
}
