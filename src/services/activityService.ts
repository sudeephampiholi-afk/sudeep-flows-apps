import type { CogniteClient, NodeOrEdge } from '@cognite/sdk';

import { getActivityEffectiveDate } from '../domain/activityDates';
import type { Activity, NodeId } from '../domain/asset360Types';
import { isNodeId, nodeKey } from '../domain/nodeId';

import {
  withCdf429Retry,
  type CdfRetryDependencies,
} from './cdf429Retry';
import { classifyCdfError } from './cdfErrors';

const PAGE_LIMIT = 1000;
const ACTIVITY_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteActivity',
  version: 'v1',
} satisfies {
  type: 'view';
  space: string;
  externalId: string;
  version: string;
};

export interface ActivityServiceClient {
  instances: {
    list: CogniteClient['instances']['list'];
  };
}

export interface ActivityService {
  listByAsset(asset: NodeId): Promise<Activity[]>;
}

class CogniteActivityService implements ActivityService {
  constructor(
    private readonly client: ActivityServiceClient,
    private readonly retryDependencies?: CdfRetryDependencies
  ) {}

  async listByAsset(asset: NodeId): Promise<Activity[]> {
    try {
      const activities: Activity[] = [];
      let cursor: string | undefined;
      do {
        const response = await withCdf429Retry(
          () =>
            this.client.instances.list({
              instanceType: 'node',
              sources: [{ source: ACTIVITY_VIEW }],
              filter: relationFilter(asset),
              limit: PAGE_LIMIT,
              ...(cursor ? { cursor } : {}),
            }),
          this.retryDependencies
        );
        activities.push(...response.items.flatMap(parseActivity));
        cursor = response.nextCursor;
      } while (cursor);

      return activities.sort(compareActivities);
    } catch (error: unknown) {
      throw classifyCdfError(
        error,
        'You do not have access to activities.',
        'Activities could not be loaded.'
      );
    }
  }
}

export function createActivityService(
  client: ActivityServiceClient,
  retryDependencies?: CdfRetryDependencies
): ActivityService {
  return new CogniteActivityService(client, retryDependencies);
}

function relationFilter(asset: NodeId) {
  return {
    containsAny: {
      property: ['cdf_cdm', 'CogniteActivity/v1', 'assets'],
      values: [asset],
    },
  };
}

function parseActivity(item: NodeOrEdge): Activity[] {
  if (item.instanceType !== 'node') return [];
  const properties = getViewProperties(item);
  const activity: Activity = {
    id: { space: item.space, externalId: item.externalId },
    tags: readStringArray(properties, 'tags'),
    ...optionalString(properties, 'name'),
    ...optionalString(properties, 'description'),
    ...optionalString(properties, 'sourceId'),
    ...optionalString(properties, 'sourceContext'),
    ...optionalNodeId(properties, 'source'),
    ...optionalString(properties, 'sourceCreatedTime'),
    ...optionalString(properties, 'sourceUpdatedTime'),
    ...optionalString(properties, 'sourceCreatedUser'),
    ...optionalString(properties, 'sourceUpdatedUser'),
    ...optionalString(properties, 'startTime'),
    ...optionalString(properties, 'endTime'),
    ...optionalString(properties, 'scheduledStartTime'),
    ...optionalString(properties, 'scheduledEndTime'),
  };
  return [activity];
}

function compareActivities(left: Activity, right: Activity): number {
  const leftTime = activitySortTime(left);
  const rightTime = activitySortTime(right);
  if (leftTime !== rightTime) return rightTime - leftTime;
  return nodeKey(left.id).localeCompare(nodeKey(right.id));
}

function activitySortTime(activity: Activity): number {
  const effectiveDate = getActivityEffectiveDate(activity);
  if (effectiveDate === undefined) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(effectiveDate);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function getViewProperties(
  item: Extract<NodeOrEdge, { instanceType: 'node' }>
): Record<string, unknown> {
  const value = item.properties?.cdf_cdm?.['CogniteActivity/v1'];
  return isRecord(value) ? value : {};
}

function optionalString(
  properties: Record<string, unknown>,
  property: keyof Activity
): Partial<Activity> {
  const value = properties[property];
  return typeof value === 'string' ? { [property]: value } : {};
}

function optionalNodeId(
  properties: Record<string, unknown>,
  property: 'source'
): Partial<Activity> {
  const value = properties[property];
  return isNodeId(value) ? { [property]: value } : {};
}

function readStringArray(
  properties: Record<string, unknown>,
  property: string
): string[] {
  const value = properties[property];
  return Array.isArray(value)
    ? value.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
