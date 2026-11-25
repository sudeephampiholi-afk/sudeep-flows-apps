import type { CogniteClient } from '@cognite/sdk';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  abortableSearchDelay,
  createAsset360ViewModelContext,
  type Asset360ServiceClient,
  type HostStateSync,
} from './asset360ViewModelContext';

describe('asset360ViewModelContext defaults', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('wires service factories and adapts host synchronization without module mocks', async () => {
    const client = makeClient();
    const syncInternalState = vi.fn<HostStateSync['syncInternalState']>(
      () => Promise.resolve(true)
    );
    const context = createAsset360ViewModelContext({
      useClient: () => client,
      useHostApi: () => ({ syncInternalState }),
    });

    const { result } = renderHook(() => ({
      asset: context.useAssetService(),
      timeSeries: context.useTimeSeriesService(),
      activity: context.useActivityService(),
      host: context.useHostStateSync(),
    }));

    await result.current.asset.search('');
    await result.current.timeSeries.retrieveLatest([]);
    await result.current.activity.listByAsset({
      space: 'assets',
      externalId: 'asset-1',
    });
    await result.current.host.syncInternalState('{"version":1}');

    expect(result.current.asset.retrieve).toEqual(expect.any(Function));
    expect(result.current.timeSeries.retrieveRange).toEqual(
      expect.any(Function)
    );
    expect(client.instances.list).toHaveBeenCalledOnce();
    expect(syncInternalState).toHaveBeenCalledWith('{"version":1}');
  });

  it('clears the default debounce timer when cancellation aborts it', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const delay = abortableSearchDelay(300, controller.signal);
    const rejection = expect(delay).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(vi.getTimerCount()).toBe(1);
    controller.abort();
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resolves the default debounce only after 300ms', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const resolved = vi.fn();
    const delay = abortableSearchDelay(300, controller.signal).then(resolved);

    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(resolved).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    await delay;
    expect(resolved).toHaveBeenCalledOnce();
  });
});

function makeClient(): Asset360ServiceClient {
  return {
    instances: {
      search: vi.fn<CogniteClient['instances']['search']>(),
      retrieve: vi.fn<CogniteClient['instances']['retrieve']>(),
      list: vi
        .fn<CogniteClient['instances']['list']>()
        .mockResolvedValue({ items: [] }),
    },
    timeseries: {
      data: {
        retrieveLatest:
          vi.fn<CogniteClient['timeseries']['data']['retrieveLatest']>(),
        retrieve: vi.fn<CogniteClient['timeseries']['data']['retrieve']>(),
      },
    },
  };
}
