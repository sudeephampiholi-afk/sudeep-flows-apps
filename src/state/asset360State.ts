import type { NodeId, TimeRange } from '../domain/asset360Types';
import {
  isValidAssetSearchQuery,
  isValidChartRangeValue,
  isValidNodeIdValue,
  MAX_SELECTED_TIME_SERIES,
  MAX_SERIALIZED_STATE_LENGTH,
} from '../domain/asset360Validation';

export const ASSET_360_STATE_VERSION = 1;

export type Asset360State = {
  version: typeof ASSET_360_STATE_VERSION;
  activeView: 'search' | 'asset';
  searchQuery: string;
  selectedAssetId: NodeId | null;
  selectedTimeSeriesIds: NodeId[];
  chartRange: TimeRange | null;
  selectedActivityId: NodeId | null;
};

export function createDefaultAsset360State(): Asset360State {
  return {
    version: ASSET_360_STATE_VERSION,
    activeView: 'search',
    searchQuery: '',
    selectedAssetId: null,
    selectedTimeSeriesIds: [],
    chartRange: null,
    selectedActivityId: null,
  };
}

export function parseAsset360InitialState(
  initialState: string | undefined
): Asset360State {
  if (initialState === undefined) {
    return createDefaultAsset360State();
  }
  if (initialState.length > MAX_SERIALIZED_STATE_LENGTH) {
    return createDefaultAsset360State();
  }

  try {
    const value: unknown = JSON.parse(initialState);
    return isAsset360State(value)
      ? value
      : createDefaultAsset360State();
  } catch {
    return createDefaultAsset360State();
  }
}

function isAsset360State(value: unknown): value is Asset360State {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === ASSET_360_STATE_VERSION &&
    (value.activeView === 'search' || value.activeView === 'asset') &&
    isValidAssetSearchQuery(value.searchQuery) &&
    isNullableNodeId(value.selectedAssetId) &&
    Array.isArray(value.selectedTimeSeriesIds) &&
    value.selectedTimeSeriesIds.length <= MAX_SELECTED_TIME_SERIES &&
    value.selectedTimeSeriesIds.every(isValidNodeIdValue) &&
    (value.chartRange === null || isValidChartRangeValue(value.chartRange)) &&
    isNullableNodeId(value.selectedActivityId) &&
    hasConsistentSelections(value)
  );
}

function hasConsistentSelections(value: Record<string, unknown>): boolean {
  if (value.activeView === 'search') {
    return (
      value.selectedAssetId === null &&
      Array.isArray(value.selectedTimeSeriesIds) &&
      value.selectedTimeSeriesIds.length === 0 &&
      value.chartRange === null &&
      value.selectedActivityId === null
    );
  }

  return (
    value.activeView === 'asset' &&
    isValidNodeIdValue(value.selectedAssetId) &&
    Array.isArray(value.selectedTimeSeriesIds) &&
    (value.selectedTimeSeriesIds.length > 0 || value.chartRange === null)
  );
}

function isNullableNodeId(value: unknown): value is NodeId | null {
  return value === null || isValidNodeIdValue(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
