import type { NodeId } from './asset360Types';

export function isNodeId(value: unknown): value is NodeId {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'space' in value &&
    typeof value.space === 'string' &&
    'externalId' in value &&
    typeof value.externalId === 'string'
  );
}

export function nodeIdsEqual(
  first: NodeId,
  second: NodeId | null | undefined
): boolean {
  return (
    second !== null &&
    second !== undefined &&
    first.space === second.space &&
    first.externalId === second.externalId
  );
}

export function nodeKey(id: NodeId): string {
  return `${id.space}:${id.externalId}`;
}
