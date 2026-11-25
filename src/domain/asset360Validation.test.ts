import { describe, expect, it } from 'vitest';

import {
  isValidAssetSearchQuery,
  isValidNodeIdValue,
  MAX_ASSET_SEARCH_QUERY_LENGTH,
} from './asset360Validation';

describe(isValidAssetSearchQuery.name, () => {
  it('accepts ordinary user-entered search text', () => {
    expect(isValidAssetSearchQuery('23-VA-9110 pump')).toBe(true);
  });

  it('rejects overlong and control-character input', () => {
    expect(
      isValidAssetSearchQuery('a'.repeat(MAX_ASSET_SEARCH_QUERY_LENGTH + 1))
    ).toBe(false);
    expect(isValidAssetSearchQuery('pump\u0000query')).toBe(false);
  });
});

describe(isValidNodeIdValue.name, () => {
  it('accepts a bounded node identifier', () => {
    expect(
      isValidNodeIdValue({ space: 'assets', externalId: 'asset-1' })
    ).toBe(true);
  });

  it('rejects empty, overlong, and control-character components', () => {
    expect(isValidNodeIdValue({ space: '', externalId: 'asset-1' })).toBe(
      false
    );
    expect(
      isValidNodeIdValue({ space: 'assets', externalId: 'a'.repeat(257) })
    ).toBe(false);
    expect(
      isValidNodeIdValue({ space: 'assets', externalId: 'asset\u00001' })
    ).toBe(false);
  });
});
