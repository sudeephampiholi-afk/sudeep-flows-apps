import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ASSET_360_STATE_VERSION } from './asset360State';
import {
  Asset360StateProvider,
  useAsset360StateStorage,
} from './Asset360StateProvider';

describe('Asset360StateProvider', () => {
  it('makes restored state available on the first meaningful render', () => {
    const initialState = JSON.stringify({
      version: ASSET_360_STATE_VERSION,
      activeView: 'asset',
      searchQuery: '23-VA',
      selectedAssetId: {
        space: 'valhall-assets',
        externalId: 'WMT:23-VA-9110-M01',
      },
      selectedTimeSeriesIds: [],
      chartRange: null,
      selectedActivityId: null,
    });

    render(
      <Asset360StateProvider initialState={initialState}>
        <StateReader label="first" />
      </Asset360StateProvider>
    );

    expect(screen.getByTestId('first-view')).toHaveTextContent('asset');
    expect(screen.getByTestId('first-query')).toHaveTextContent('23-VA');
  });

  it('shares one storage value across consumers', async () => {
    render(
      <Asset360StateProvider>
        <StateReader label="first" />
        <StateReader label="second" />
      </Asset360StateProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Update query' }));

    expect(screen.getByTestId('first-query')).toHaveTextContent('pump');
    expect(screen.getByTestId('second-query')).toHaveTextContent('pump');
  });

  it('applies rapid updates to the latest state snapshot', async () => {
    render(
      <Asset360StateProvider>
        <RapidStateUpdater />
      </Asset360StateProvider>
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Apply rapid updates' })
    );

    expect(screen.getByTestId('rapid-query')).toHaveTextContent('pump');
    expect(screen.getByTestId('rapid-view')).toHaveTextContent('asset');
  });
});

function StateReader({ label }: { label: string }) {
  const { state, updateState } = useAsset360StateStorage();
  return (
    <section>
      <span data-testid={`${label}-view`}>{state.activeView}</span>
      <span data-testid={`${label}-query`}>{state.searchQuery}</span>
      {label === 'first' && (
        <button
          type="button"
          onClick={() =>
            updateState((current) => ({ ...current, searchQuery: 'pump' }))
          }
        >
          Update query
        </button>
      )}
    </section>
  );
}

function RapidStateUpdater() {
  const { state, updateState } = useAsset360StateStorage();
  return (
    <section>
      <span data-testid="rapid-query">{state.searchQuery}</span>
      <span data-testid="rapid-view">{state.activeView}</span>
      <button
        type="button"
        onClick={() => {
          updateState((current) => ({ ...current, searchQuery: 'pump' }));
          updateState((current) => ({ ...current, activeView: 'asset' }));
        }}
      >
        Apply rapid updates
      </button>
    </section>
  );
}
