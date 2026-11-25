import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import type {
  NodeId,
  NumericSeriesData,
  TimeRange,
  TimeSeriesSummary,
} from '../domain/asset360Types';
import { MAX_SELECTED_TIME_SERIES } from '../domain/asset360Validation';
import { nodeIdsEqual, nodeKey } from '../domain/nodeId';
import { CdfServiceError } from '../services/cdfErrors';

import { useAsset360ViewModelDependencies } from './asset360ViewModelContext';
import { synchronizeAsset360State } from './synchronizeAsset360State';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 7;
type ManualQueryOptions = Pick<
  UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
  | 'retry'
  | 'staleTime'
  | 'refetchInterval'
  | 'refetchOnMount'
  | 'refetchOnReconnect'
  | 'refetchOnWindowFocus'
>;
const MANUAL_QUERY_OPTIONS = {
  retry: false,
  staleTime: Number.POSITIVE_INFINITY,
  refetchInterval: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
} satisfies ManualQueryOptions;

export type TimeSeriesOperationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'noAccess'
  | 'error';

export type TimeRangePreset = 1 | 7 | 30;

export type TimeSeriesViewModel = {
  linkedStatus: TimeSeriesOperationStatus;
  linkedSeries: TimeSeriesSummary[];
  linkedErrorMessage: string | undefined;
  selectedSeriesIds: NodeId[];
  hasReachedSelectionLimit: boolean;
  latestStatus: TimeSeriesOperationStatus;
  latestErrorMessage: string | undefined;
  rangeStatus: TimeSeriesOperationStatus;
  rangeErrorMessage: string | undefined;
  range: TimeRange | null;
  rangeDays: TimeRangePreset | undefined;
  seriesData: NumericSeriesData[];
  isRefreshing: boolean;
  shareStateWarning: boolean;
  toggleSeries(series: TimeSeriesSummary): void;
  setRangePreset(days: TimeRangePreset): void;
  retryLinked(): void;
  retryLatest(): void;
  retryRange(): void;
  refresh(): void;
};

export function useTimeSeriesViewModel(): TimeSeriesViewModel {
  const {
    useTimeSeriesService,
    useAsset360StateStorage: useStateStorage,
    useHostStateSync,
  } = useAsset360ViewModelDependencies();
  const service = useTimeSeriesService();
  const storage = useStateStorage();
  const hostStateSync = useHostStateSync();
  const assetId = storage.state.selectedAssetId;
  const selectedSeriesIds = storage.state.selectedTimeSeriesIds;
  const range = storage.state.chartRange;

  const linked = useQuery({
    queryKey: ['asset-time-series', assetId?.space, assetId?.externalId],
    queryFn: () =>
      assetId === null ? Promise.resolve([]) : service.listByAsset(assetId),
    enabled: assetId !== null,
    ...MANUAL_QUERY_OPTIONS,
  });

  const needsLatest = selectedSeriesIds.length > 0 && range === null;
  const latest = useQuery({
    queryKey: [
      'time-series-latest',
      ...selectedSeriesIds.map(nodeKey),
    ],
    queryFn: () => service.retrieveLatest(selectedSeriesIds),
    enabled: needsLatest,
    ...MANUAL_QUERY_OPTIONS,
  });

  useEffect(() => {
    if (
      !needsLatest ||
      latest.data === undefined ||
      latest.data.length === 0
    ) {
      return;
    }
    const nextRange = rangeEndingAtLatest(
      latest.data.map((datapoint) => datapoint.timestamp),
      DEFAULT_RANGE_DAYS
    );
    if (nextRange === null) return;
    const next = storage.updateState((current) => ({
      ...current,
      chartRange: nextRange,
    }));
    synchronizeAsset360State({ state: next, storage, hostStateSync });
  }, [hostStateSync, latest.data, needsLatest, storage]);

  const rangeRequest =
    selectedSeriesIds.length > 0 && range !== null
      ? { series: selectedSeriesIds, range }
      : null;
  const rangeData = useQuery({
    queryKey: [
      'time-series-range',
      ...selectedSeriesIds.map(nodeKey),
      range?.start,
      range?.end,
    ],
    queryFn: () =>
      rangeRequest === null
        ? Promise.resolve([])
        : service.retrieveRange(rangeRequest.series, rangeRequest.range),
    enabled: rangeRequest !== null,
    ...MANUAL_QUERY_OPTIONS,
  });

  const toggleSeries = useCallback(
    (series: TimeSeriesSummary) => {
      if (series.type !== 'numeric') return;
      let changed = false;
      const next = storage.updateState((current) => {
        const selected = current.selectedTimeSeriesIds.some((id) =>
          nodeIdsEqual(id, series.id)
        );
        if (
          !selected &&
          current.selectedTimeSeriesIds.length >= MAX_SELECTED_TIME_SERIES
        ) {
          return current;
        }
        changed = true;
        return {
          ...current,
          selectedTimeSeriesIds: selected
            ? current.selectedTimeSeriesIds.filter(
                (id) => !nodeIdsEqual(id, series.id)
              )
            : [...current.selectedTimeSeriesIds, series.id],
          chartRange: null,
        };
      });
      if (changed) {
        synchronizeAsset360State({ state: next, storage, hostStateSync });
      }
    },
    [hostStateSync, storage]
  );

  const setRangePreset = useCallback(
    (days: TimeRangePreset) => {
      const currentRange = storage.state.chartRange;
      if (currentRange === null) return;
      const nextRange = rangeEndingAt(currentRange.end, days);
      if (nextRange === null) return;
      const next = storage.updateState((current) => ({
        ...current,
        chartRange: nextRange,
      }));
      synchronizeAsset360State({ state: next, storage, hostStateSync });
    },
    [hostStateSync, storage]
  );

  const retryLinked = useCallback(() => {
    void linked.refetch();
  }, [linked]);
  const retryLatest = useCallback(() => {
    void latest.refetch();
  }, [latest]);
  const retryRange = useCallback(() => {
    void rangeData.refetch();
  }, [rangeData]);
  const refresh = useCallback(() => {
    if (selectedSeriesIds.length > 0 && range !== null) {
      void rangeData.refetch();
    }
  }, [range, rangeData, selectedSeriesIds.length]);

  const linkedStatus = deriveListStatus(
    assetId !== null,
    linked.isPending || linked.isFetching,
    linked.data,
    linked.error
  );
  const latestStatus = deriveLatestStatus(
    selectedSeriesIds.length > 0,
    range !== null,
    latest.isPending || latest.isFetching,
    latest.data,
    latest.error
  );
  const rangeStatus = deriveRangeStatus(
    rangeRequest !== null,
    rangeData.isPending,
    rangeData.data,
    rangeData.error
  );

  return {
    linkedStatus,
    linkedSeries: linked.data ?? [],
    linkedErrorMessage: isErrorStatus(linkedStatus)
      ? errorMessage(linked.error, 'Time series could not be loaded.')
      : undefined,
    selectedSeriesIds,
    hasReachedSelectionLimit:
      selectedSeriesIds.length >= MAX_SELECTED_TIME_SERIES,
    latestStatus,
    latestErrorMessage: isErrorStatus(latestStatus)
      ? errorMessage(
          latest.error,
          'Latest time-series datapoints could not be loaded.'
        )
      : undefined,
    rangeStatus,
    rangeErrorMessage: isErrorStatus(rangeStatus)
      ? errorMessage(
          rangeData.error,
          'Time-series datapoints could not be loaded.'
        )
      : undefined,
    range,
    rangeDays: range === null ? undefined : getRangePreset(range),
    seriesData: rangeStatus === 'success' ? rangeData.data ?? [] : [],
    isRefreshing:
      rangeRequest !== null && rangeData.isFetching && !rangeData.isPending,
    shareStateWarning: storage.shareStateWarning,
    toggleSeries,
    setRangePreset,
    retryLinked,
    retryLatest,
    retryRange,
    refresh,
  };
}

function deriveListStatus(
  enabled: boolean,
  loading: boolean,
  data: TimeSeriesSummary[] | undefined,
  error: unknown
): TimeSeriesOperationStatus {
  if (!enabled) return 'empty';
  if (loading) return 'loading';
  const errorStatus = deriveErrorStatus(error);
  if (errorStatus !== undefined) return errorStatus;
  return data === undefined || data.length === 0 ? 'empty' : 'success';
}

function deriveLatestStatus(
  hasSelection: boolean,
  hasRange: boolean,
  loading: boolean,
  data: { timestamp: string }[] | undefined,
  error: unknown
): TimeSeriesOperationStatus {
  if (!hasSelection) return 'idle';
  if (hasRange) return 'success';
  if (loading) return 'loading';
  const errorStatus = deriveErrorStatus(error);
  if (errorStatus !== undefined) return errorStatus;
  return data === undefined || data.length === 0 ? 'empty' : 'success';
}

function deriveRangeStatus(
  enabled: boolean,
  loading: boolean,
  data: NumericSeriesData[] | undefined,
  error: unknown
): TimeSeriesOperationStatus {
  if (!enabled) return 'idle';
  if (loading) return 'loading';
  const errorStatus = deriveErrorStatus(error);
  if (errorStatus !== undefined) return errorStatus;
  const datapointCount =
    data?.reduce(
      (count: number, series: NumericSeriesData) =>
        count + series.datapoints.length,
      0
    ) ?? 0;
  return datapointCount === 0 ? 'empty' : 'success';
}

function deriveErrorStatus(
  error: unknown
): 'noAccess' | 'error' | undefined {
  if (error instanceof CdfServiceError) {
    return error.kind === 'noAccess' ? 'noAccess' : 'error';
  }
  return error === null ? undefined : 'error';
}

function isErrorStatus(
  status: TimeSeriesOperationStatus
): status is 'noAccess' | 'error' {
  return status === 'noAccess' || status === 'error';
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof CdfServiceError ? error.message : fallback;
}

function rangeEndingAtLatest(
  timestamps: string[],
  days: TimeRangePreset
): TimeRange | null {
  const validTimes = timestamps
    .map((timestamp: string) => new Date(timestamp).getTime())
    .filter((timestamp: number) => Number.isFinite(timestamp));
  if (validTimes.length === 0) return null;
  return rangeEndingAt(new Date(Math.max(...validTimes)).toISOString(), days);
}

function rangeEndingAt(end: string, days: TimeRangePreset): TimeRange | null {
  const endMilliseconds = new Date(end).getTime();
  if (!Number.isFinite(endMilliseconds)) return null;
  return {
    start: new Date(
      endMilliseconds - days * DAY_IN_MILLISECONDS
    ).toISOString(),
    end: new Date(endMilliseconds).toISOString(),
  };
}

function getRangePreset(range: TimeRange): TimeRangePreset | undefined {
  const difference =
    new Date(range.end).getTime() - new Date(range.start).getTime();
  if (difference === DAY_IN_MILLISECONDS) return 1;
  if (difference === 7 * DAY_IN_MILLISECONDS) return 7;
  if (difference === 30 * DAY_IN_MILLISECONDS) return 30;
  return undefined;
}

