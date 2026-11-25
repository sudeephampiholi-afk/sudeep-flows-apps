import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Activity, NodeId } from '../domain/asset360Types';
import { nodeIdsEqual } from '../domain/nodeId';
import { CdfServiceError } from '../services/cdfErrors';

import { useAsset360ViewModelDependencies } from './asset360ViewModelContext';
import { synchronizeAsset360State } from './synchronizeAsset360State';

export type ActivitiesStatus =
  | 'loading'
  | 'success'
  | 'empty'
  | 'noAccess'
  | 'error';

export type ActivitiesViewModel = {
  status: ActivitiesStatus;
  activities: Activity[];
  selectedActivity: Activity | undefined;
  errorMessage: string | undefined;
  shareStateWarning: boolean;
  retry(): void;
  selectActivity(id: NodeId): void;
  closeActivity(): void;
};

export function useActivitiesViewModel(): ActivitiesViewModel {
  const {
    useActivityService,
    useAsset360StateStorage: useStateStorage,
    useHostStateSync,
  } = useAsset360ViewModelDependencies();
  const service = useActivityService();
  const storage = useStateStorage();
  const hostStateSync = useHostStateSync();
  const assetId = storage.state.selectedAssetId;
  const selectedActivityId = storage.state.selectedActivityId;

  const activities = useQuery({
    queryKey: ['asset-activities', assetId?.space, assetId?.externalId],
    queryFn: () =>
      assetId === null ? Promise.resolve([]) : service.listByAsset(assetId),
    enabled: assetId !== null,
    retry: false,
  });

  const retry = useCallback(() => {
    void activities.refetch();
  }, [activities]);

  const selectActivity = useCallback(
    (id: NodeId) => {
      const next = storage.updateState((current) => ({
        ...current,
        selectedActivityId: id,
      }));
      synchronizeAsset360State({ state: next, storage, hostStateSync });
    },
    [hostStateSync, storage]
  );

  const closeActivity = useCallback(() => {
    const next = storage.updateState((current) => ({
      ...current,
      selectedActivityId: null,
    }));
    synchronizeAsset360State({ state: next, storage, hostStateSync });
  }, [hostStateSync, storage]);

  const status = deriveStatus(
    assetId !== null,
    activities.isPending || activities.isFetching,
    activities.data,
    activities.error
  );
  const activityItems = activities.data ?? [];

  return {
    status,
    activities: activityItems,
    selectedActivity: activityItems.find((activity: Activity) =>
      nodeIdsEqual(activity.id, selectedActivityId)
    ),
    errorMessage:
      status === 'noAccess' || status === 'error'
        ? errorMessage(activities.error)
        : undefined,
    shareStateWarning: storage.shareStateWarning,
    retry,
    selectActivity,
    closeActivity,
  };
}

function deriveStatus(
  enabled: boolean,
  loading: boolean,
  data: Activity[] | undefined,
  error: unknown
): ActivitiesStatus {
  if (!enabled) return 'empty';
  if (loading) return 'loading';
  if (error instanceof CdfServiceError) {
    return error.kind === 'noAccess' ? 'noAccess' : 'error';
  }
  if (error !== null) return 'error';
  return data === undefined || data.length === 0 ? 'empty' : 'success';
}

function errorMessage(error: unknown): string {
  return error instanceof CdfServiceError
    ? error.message
    : 'Activities could not be loaded.';
}

