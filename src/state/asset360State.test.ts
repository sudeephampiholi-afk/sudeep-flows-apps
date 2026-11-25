import { describe, expect, it } from 'vitest';

import {
  MAX_SELECTED_TIME_SERIES,
  MAX_SERIALIZED_STATE_LENGTH,
} from '../domain/asset360Validation';

import {
  ASSET_360_STATE_VERSION,
  createDefaultAsset360State,
  parseAsset360InitialState,
} from './asset360State';

describe(parseAsset360InitialState.name, () => {
  it('returns the default search state when no saved state exists', () => {
    expect(parseAsset360InitialState(undefined)).toEqual(
      createDefaultAsset360State()
    );
  });

  it('restores a fully valid versioned state', () => {
    const initialState = JSON.stringify({
      version: ASSET_360_STATE_VERSION,
      activeView: 'asset',
      searchQuery: '23-VA',
      selectedAssetId: {
        space: 'valhall-assets',
        externalId: 'WMT:23-VA-9110-M01',
      },
      selectedTimeSeriesIds: [
        { space: 'valhall-tags', externalId: 'pi:160995' },
      ],
      chartRange: {
        start: '2026-03-07T14:39:43.480Z',
        end: '2026-03-14T14:39:43.480Z',
      },
      selectedActivityId: {
        space: 'valhall-maintenance-orders',
        externalId: 'activity-1',
      },
    });

    expect(parseAsset360InitialState(initialState)).toEqual({
      version: ASSET_360_STATE_VERSION,
      activeView: 'asset',
      searchQuery: '23-VA',
      selectedAssetId: {
        space: 'valhall-assets',
        externalId: 'WMT:23-VA-9110-M01',
      },
      selectedTimeSeriesIds: [
        { space: 'valhall-tags', externalId: 'pi:160995' },
      ],
      chartRange: {
        start: '2026-03-07T14:39:43.480Z',
        end: '2026-03-14T14:39:43.480Z',
      },
      selectedActivityId: {
        space: 'valhall-maintenance-orders',
        externalId: 'activity-1',
      },
    });
  });

  it.each([
    [
      'an asset view without a selected asset',
      {
        ...createDefaultAsset360State(),
        activeView: 'asset',
      },
    ],
    [
      'a search view retaining a selected asset',
      {
        ...createDefaultAsset360State(),
        selectedAssetId: { space: 'assets', externalId: 'asset-1' },
      },
    ],
    [
      'a search view retaining selected time series',
      {
        ...createDefaultAsset360State(),
        selectedTimeSeriesIds: [
          { space: 'series', externalId: 'series-1' },
        ],
      },
    ],
    [
      'a search view retaining a selected activity',
      {
        ...createDefaultAsset360State(),
        selectedActivityId: {
          space: 'activities',
          externalId: 'activity-1',
        },
      },
    ],
    [
      'a search view retaining a chart range',
      {
        ...createDefaultAsset360State(),
        chartRange: {
          start: '2026-03-07T14:39:43.480Z',
          end: '2026-03-14T14:39:43.480Z',
        },
      },
    ],
    [
      'an asset view with a chart range but no selected series',
      {
        ...createDefaultAsset360State(),
        activeView: 'asset',
        selectedAssetId: { space: 'assets', externalId: 'asset-1' },
        chartRange: {
          start: '2026-03-07T14:39:43.480Z',
          end: '2026-03-14T14:39:43.480Z',
        },
      },
    ],
  ])('falls back for cross-field-invalid state: %s', (_scenario, state) => {
    expect(parseAsset360InitialState(JSON.stringify(state))).toEqual(
      createDefaultAsset360State()
    );
  });

  it.each([
    ['malformed JSON', '{not-json'],
    [
      'an unsupported version',
      JSON.stringify({
        ...createDefaultAsset360State(),
        version: ASSET_360_STATE_VERSION + 1,
      }),
    ],
    [
      'an invalid nested node ID',
      JSON.stringify({
        ...createDefaultAsset360State(),
        selectedAssetId: { space: 'valhall-assets' },
      }),
    ],
    [
      'an invalid chart range',
      JSON.stringify({
        ...createDefaultAsset360State(),
        chartRange: { start: 123, end: '2026-03-14T14:39:43.480Z' },
      }),
    ],
    [
      'an unparseable chart range',
      JSON.stringify({
        ...createDefaultAsset360State(),
        chartRange: { start: 'not-a-date', end: 'also-not-a-date' },
      }),
    ],
    [
      'a reversed chart range',
      JSON.stringify({
        ...createDefaultAsset360State(),
        chartRange: {
          start: '2026-03-14T14:39:43.480Z',
          end: '2026-03-07T14:39:43.480Z',
        },
      }),
    ],
    [
      'an overlong search query',
      JSON.stringify({
        ...createDefaultAsset360State(),
        searchQuery: 'a'.repeat(201),
      }),
    ],
    [
      'a search query containing control characters',
      JSON.stringify({
        ...createDefaultAsset360State(),
        searchQuery: 'pump\u0000query',
      }),
    ],
    [
      'too many selected time series',
      JSON.stringify({
        ...createDefaultAsset360State(),
        selectedTimeSeriesIds: Array.from(
          { length: MAX_SELECTED_TIME_SERIES + 1 },
          (_value, index) => ({
            space: 'series',
            externalId: `series-${index}`,
          })
        ),
      }),
    ],
    [
      'an overlong node identifier',
      JSON.stringify({
        ...createDefaultAsset360State(),
        selectedAssetId: { space: 'assets', externalId: 'a'.repeat(257) },
      }),
    ],
  ])('falls back safely for %s', (_scenario: string, initialState: string) => {
    expect(parseAsset360InitialState(initialState)).toEqual(
      createDefaultAsset360State()
    );
  });

  it('rejects an oversized serialized state before parsing it', () => {
    const oversized = `{"padding":"${'a'.repeat(
      MAX_SERIALIZED_STATE_LENGTH + 1
    )}"}`;

    expect(parseAsset360InitialState(oversized)).toEqual(
      createDefaultAsset360State()
    );
  });
});
