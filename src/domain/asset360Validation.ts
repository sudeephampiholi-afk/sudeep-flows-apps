import type { NodeId, TimeRange } from './asset360Types';

export const MAX_ASSET_SEARCH_QUERY_LENGTH = 200;
export const MAX_NODE_ID_COMPONENT_LENGTH = 256;
export const MAX_SELECTED_TIME_SERIES = 5;
export const MAX_SERIALIZED_STATE_LENGTH = 2_000;

const MAX_CHART_RANGE_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export function isValidAssetSearchQuery(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_ASSET_SEARCH_QUERY_LENGTH &&
    !hasControlCharacters(value)
  );
}

export function isValidNodeIdValue(value: unknown): value is NodeId {
  return (
    isRecord(value) &&
    isValidIdentifierComponent(value.space) &&
    isValidIdentifierComponent(value.externalId)
  );
}

export function isValidChartRangeValue(value: unknown): value is TimeRange {
  if (
    !isRecord(value) ||
    !isCanonicalIsoTimestamp(value.start) ||
    !isCanonicalIsoTimestamp(value.end)
  ) {
    return false;
  }

  const start = Date.parse(value.start);
  const end = Date.parse(value.end);
  return start <= end && end - start <= MAX_CHART_RANGE_MILLISECONDS;
}

function isValidIdentifierComponent(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_NODE_ID_COMPONENT_LENGTH &&
    !hasControlCharacters(value)
  );
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character: string) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
