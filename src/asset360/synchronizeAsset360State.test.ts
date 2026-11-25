import { describe, expect, it, vi } from 'vitest';

import { MAX_SERIALIZED_STATE_LENGTH } from '../domain/asset360Validation';
import { createDefaultAsset360State } from '../state/asset360State';
import type { Asset360StateStorage } from '../state/Asset360StateProvider';

import type { HostStateSync } from './asset360ViewModelContext';
import { synchronizeAsset360State } from './synchronizeAsset360State';

describe(synchronizeAsset360State.name, () => {
  it('clears the warning and sends the complete serialized state', async () => {
    const state = {
      ...createDefaultAsset360State(),
      searchQuery: 'pump',
    };
    const { storage, setShareStateWarning } = makeStorage();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );

    synchronizeAsset360State({
      state,
      storage,
      hostStateSync: { syncInternalState },
    });
    await Promise.resolve();

    expect(syncInternalState).toHaveBeenCalledWith(JSON.stringify(state));
    expect(setShareStateWarning.mock.calls).toEqual([[false], [false]]);
  });

  it.each([
    ['host reports failure', () => Promise.resolve(false)],
    ['host rejects', () => Promise.reject(new Error('host unavailable'))],
  ])('sets the warning when the %s', async (_scenario, resultFactory) => {
    const { storage, setShareStateWarning } = makeStorage();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      resultFactory()
    );

    synchronizeAsset360State({
      state: createDefaultAsset360State(),
      storage,
      hostStateSync: { syncInternalState },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(setShareStateWarning).toHaveBeenLastCalledWith(true);
  });

  it('does not send state that is too large for a practical shared URL', () => {
    const { storage, setShareStateWarning } = makeStorage();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(() =>
      Promise.resolve(true)
    );

    synchronizeAsset360State({
      state: {
        ...createDefaultAsset360State(),
        searchQuery: 'a'.repeat(MAX_SERIALIZED_STATE_LENGTH),
      },
      storage,
      hostStateSync: { syncInternalState },
    });

    expect(syncInternalState).not.toHaveBeenCalled();
    expect(setShareStateWarning).toHaveBeenLastCalledWith(true);
  });
});

function makeStorage(): {
  storage: Asset360StateStorage;
  setShareStateWarning: ReturnType<typeof vi.fn<(value: boolean) => void>>;
} {
  const state = createDefaultAsset360State();
  const setShareStateWarning = vi.fn<(value: boolean) => void>();
  return {
    storage: {
      state,
      shareStateWarning: false,
      updateState: vi.fn(() => state),
      setShareStateWarning,
    },
    setShareStateWarning,
  };
}
