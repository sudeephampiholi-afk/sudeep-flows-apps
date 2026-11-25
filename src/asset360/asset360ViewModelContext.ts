import type { HostAppAPI } from '@cognite/app-sdk';
import { useCogniteSdk } from '@cognite/app-sdk/react';
import { createContext, useContext, useMemo } from 'react';

import { useHostApp } from '../host/HostAppContext';
import {
  createActivityService,
  type ActivityService,
  type ActivityServiceClient,
} from '../services/activityService';
import {
  createAssetService,
  type AssetService,
  type AssetServiceClient,
} from '../services/assetService';
import {
  createTimeSeriesService,
  type TimeSeriesService,
  type TimeSeriesServiceClient,
} from '../services/timeSeriesService';
import {
  useAsset360StateStorage,
  type Asset360StateStorage,
} from '../state/Asset360StateProvider';

export type HostStateSync = Pick<HostAppAPI, 'syncInternalState'>;
export type Asset360ServiceClient = AssetServiceClient &
  TimeSeriesServiceClient &
  ActivityServiceClient;
export type SearchDelay = (
  milliseconds: number,
  signal: AbortSignal
) => Promise<void>;

export type Asset360ViewModelContextType = {
  useAssetService(): AssetService;
  useTimeSeriesService(): TimeSeriesService;
  useActivityService(): ActivityService;
  useAsset360StateStorage(): Asset360StateStorage;
  useHostStateSync(): HostStateSync;
  searchDelay: SearchDelay;
};

type DefaultContextDependencies = {
  useClient(): Asset360ServiceClient;
  useHostApi(): HostStateSync;
};

function useDefaultClient(): Asset360ServiceClient {
  return useCogniteSdk();
}

function useDefaultHostApi(): HostStateSync {
  return useHostApp().api;
}

const defaultContext = createAsset360ViewModelContext({
  useClient: useDefaultClient,
  useHostApi: useDefaultHostApi,
});

export const Asset360ViewModelContext =
  createContext<Asset360ViewModelContextType>(defaultContext);

export function useAsset360ViewModelDependencies(): Asset360ViewModelContextType {
  return useContext(Asset360ViewModelContext);
}

export function createAsset360ViewModelContext(
  dependencies: DefaultContextDependencies
): Asset360ViewModelContextType {
  function useAssetService(): AssetService {
    const client = dependencies.useClient();
    return useMemo(() => createAssetService(client), [client]);
  }

  function useTimeSeriesService(): TimeSeriesService {
    const client = dependencies.useClient();
    return useMemo(() => createTimeSeriesService(client), [client]);
  }

  function useActivityService(): ActivityService {
    const client = dependencies.useClient();
    return useMemo(() => createActivityService(client), [client]);
  }

  function useHostStateSync(): HostStateSync {
    const api = dependencies.useHostApi();
    return useMemo(
      () => ({
        syncInternalState: (state: string) => api.syncInternalState(state),
      }),
      [api]
    );
  }

  return {
    useAssetService,
    useTimeSeriesService,
    useActivityService,
    useAsset360StateStorage,
    useHostStateSync,
    searchDelay: abortableSearchDelay,
  };
}

export function abortableSearchDelay(
  milliseconds: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

function createAbortError(): Error {
  const error = new Error('Search delay aborted');
  error.name = 'AbortError';
  return error;
}
