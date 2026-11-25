import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { AssetSummary, NodeId } from '../domain/asset360Types';
import { isValidAssetSearchQuery } from '../domain/asset360Validation';
import { CdfServiceError } from '../services/cdfErrors';

import { useAsset360ViewModelDependencies } from './asset360ViewModelContext';
import { synchronizeAsset360State } from './synchronizeAsset360State';

export type AssetSearchStatus =
  | 'prompt'
  | 'loading'
  | 'success'
  | 'empty'
  | 'noAccess'
  | 'error';

export type AssetSearchViewModel = {
  searchQuery: string;
  results: AssetSummary[];
  status: AssetSearchStatus;
  errorMessage: string | undefined;
  shareStateWarning: boolean;
  setSearchQuery(value: string): void;
  selectAsset(id: NodeId): void;
  retry(): void;
};

export function useAssetSearchViewModel(): AssetSearchViewModel {
  const {
    useAssetService,
    useAsset360StateStorage: useStateStorage,
    useHostStateSync,
    searchDelay,
  } = useAsset360ViewModelDependencies();
  const assetService = useAssetService();
  const storage = useStateStorage();
  const hostStateSync = useHostStateSync();
  const normalizedQuery = storage.state.searchQuery.trim();
  const canSearch = normalizedQuery.length >= 2;
  const search = useQuery({
    queryKey: ['asset-search', normalizedQuery],
    queryFn: async ({ signal }) => {
      await searchDelay(300, signal);
      return assetService.search(normalizedQuery);
    },
    enabled: canSearch,
    retry: false,
  });

  const setSearchQuery = useCallback(
    (value: string) => {
      if (!isValidAssetSearchQuery(value)) return;
      let changed = false;
      const next = storage.updateState((current) => {
        if (current.searchQuery === value) return current;
        changed = true;
        return { ...current, searchQuery: value };
      });
      if (changed) {
        synchronizeAsset360State({ state: next, storage, hostStateSync });
      }
    },
    [hostStateSync, storage]
  );

  const selectAsset = useCallback(
    (id: NodeId) => {
      const next = storage.updateState((current) => ({
        ...current,
        activeView: 'asset',
        selectedAssetId: id,
        selectedTimeSeriesIds: [],
        chartRange: null,
        selectedActivityId: null,
      }));
      synchronizeAsset360State({ state: next, storage, hostStateSync });
    },
    [hostStateSync, storage]
  );

  const retry = useCallback(() => {
    void search.refetch();
  }, [search]);

  const status = deriveStatus(
    canSearch,
    search.isPending || search.isFetching,
    search.data,
    search.error
  );

  return {
    searchQuery: storage.state.searchQuery,
    results: status === 'success' ? (search.data ?? []) : [],
    status,
    errorMessage:
      status === 'noAccess' || status === 'error'
        ? getErrorMessage(search.error)
        : undefined,
    shareStateWarning: storage.shareStateWarning,
    setSearchQuery,
    selectAsset,
    retry,
  };
}

function deriveStatus(
  canSearch: boolean,
  isLoading: boolean,
  results: AssetSummary[] | undefined,
  error: unknown
): AssetSearchStatus {
  if (!canSearch) return 'prompt';
  if (isLoading) return 'loading';
  if (error instanceof CdfServiceError) {
    return error.kind === 'noAccess' ? 'noAccess' : 'error';
  }
  if (error !== null) return 'error';
  return results === undefined || results.length === 0 ? 'empty' : 'success';
}

function getErrorMessage(error: unknown): string {
  return error instanceof CdfServiceError
    ? error.message
    : 'Assets could not be loaded.';
}

