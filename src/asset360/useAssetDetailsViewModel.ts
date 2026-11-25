import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Asset } from '../domain/asset360Types';
import { CdfServiceError } from '../services/cdfErrors';

import { useAsset360ViewModelDependencies } from './asset360ViewModelContext';
import { synchronizeAsset360State } from './synchronizeAsset360State';

export type AssetDetailsStatus =
  | 'loading'
  | 'success'
  | 'empty'
  | 'noAccess'
  | 'error';

export type AssetDetailsViewModel = {
  status: AssetDetailsStatus;
  asset: Asset | undefined;
  errorMessage: string | undefined;
  shareStateWarning: boolean;
  retry(): void;
  backToSearch(): void;
};

export function useAssetDetailsViewModel(): AssetDetailsViewModel {
  const {
    useAssetService,
    useAsset360StateStorage: useStateStorage,
    useHostStateSync,
  } = useAsset360ViewModelDependencies();
  const assetService = useAssetService();
  const storage = useStateStorage();
  const hostStateSync = useHostStateSync();
  const selectedAssetId = storage.state.selectedAssetId;
  const asset = useQuery({
    queryKey: [
      'asset-details',
      selectedAssetId?.space,
      selectedAssetId?.externalId,
    ],
    queryFn: () =>
      selectedAssetId === null
        ? Promise.resolve(null)
        : assetService
            .retrieve(selectedAssetId)
            .then((retrievedAsset: Asset | undefined) => retrievedAsset ?? null),
    enabled: selectedAssetId !== null,
    retry: false,
  });

  const retry = useCallback(() => {
    void asset.refetch();
  }, [asset]);

  const backToSearch = useCallback(() => {
    const next = storage.updateState((current) => ({
      ...current,
      activeView: 'search',
      selectedAssetId: null,
      selectedTimeSeriesIds: [],
      chartRange: null,
      selectedActivityId: null,
    }));
    synchronizeAsset360State({ state: next, storage, hostStateSync });
  }, [hostStateSync, storage]);

  const status = deriveStatus(
    selectedAssetId !== null,
    asset.isPending || asset.isFetching,
    asset.data,
    asset.error
  );

  return {
    status,
    asset:
      status === 'success' && asset.data !== null ? asset.data : undefined,
    errorMessage:
      status === 'noAccess' || status === 'error'
        ? getErrorMessage(asset.error)
        : undefined,
    shareStateWarning: storage.shareStateWarning,
    retry,
    backToSearch,
  };
}

function deriveStatus(
  hasSelection: boolean,
  isLoading: boolean,
  asset: Asset | null | undefined,
  error: unknown
): AssetDetailsStatus {
  if (!hasSelection) return 'empty';
  if (isLoading) return 'loading';
  if (error instanceof CdfServiceError) {
    return error.kind === 'noAccess' ? 'noAccess' : 'error';
  }
  if (error !== null) return 'error';
  return asset === undefined || asset === null ? 'empty' : 'success';
}

function getErrorMessage(error: unknown): string {
  return error instanceof CdfServiceError
    ? error.message
    : 'The asset could not be loaded.';
}

