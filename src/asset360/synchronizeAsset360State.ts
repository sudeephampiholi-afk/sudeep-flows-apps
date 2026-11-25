import { MAX_SERIALIZED_STATE_LENGTH } from '../domain/asset360Validation';
import type { Asset360State } from '../state/asset360State';
import type { Asset360StateStorage } from '../state/Asset360StateProvider';

import type { HostStateSync } from './asset360ViewModelContext';

type SynchronizeAsset360StateOptions = {
  state: Asset360State;
  storage: Asset360StateStorage;
  hostStateSync: HostStateSync;
};

export function synchronizeAsset360State({
  state,
  storage,
  hostStateSync,
}: SynchronizeAsset360StateOptions): void {
  storage.setShareStateWarning(false);
  const serializedState = JSON.stringify(state);
  if (serializedState.length > MAX_SERIALIZED_STATE_LENGTH) {
    storage.setShareStateWarning(true);
    return;
  }
  void hostStateSync.syncInternalState(serializedState).then(
    (synchronized: boolean) =>
      storage.setShareStateWarning(!synchronized),
    () => storage.setShareStateWarning(true)
  );
}
