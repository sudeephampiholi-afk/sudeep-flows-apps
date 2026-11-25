import { describe, expect, it } from 'vitest';

import { isNodeId, nodeIdsEqual, nodeKey } from './nodeId';

describe('node ID utilities', () => {
  it('recognizes node IDs from unknown external data', () => {
    expect(isNodeId({ space: 'assets', externalId: 'asset-1' })).toBe(true);
    expect(isNodeId({ space: 'assets' })).toBe(false);
    expect(isNodeId(null)).toBe(false);
  });

  it('compares complete node IDs and handles absent selections', () => {
    const id = { space: 'assets', externalId: 'asset-1' };

    expect(nodeIdsEqual(id, { ...id })).toBe(true);
    expect(
      nodeIdsEqual(id, { space: 'other-space', externalId: 'asset-1' })
    ).toBe(false);
    expect(nodeIdsEqual(id, null)).toBe(false);
  });

  it('creates a deterministic key from both identifier components', () => {
    expect(nodeKey({ space: 'assets', externalId: 'asset-1' })).toBe(
      'assets:asset-1'
    );
  });
});
