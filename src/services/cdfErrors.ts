export type CdfErrorKind = 'noAccess' | 'request';

export class CdfServiceError extends Error {
  readonly kind: CdfErrorKind;

  constructor(kind: CdfErrorKind, message: string) {
    super(message);
    this.name = 'CdfServiceError';
    this.kind = kind;
  }
}

export function classifyCdfError(
  error: unknown,
  accessMessage: string,
  requestMessage: string
): CdfServiceError {
  const status = getStatus(error);
  return status === 401 || status === 403
    ? new CdfServiceError('noAccess', accessMessage)
    : new CdfServiceError('request', requestMessage);
}

function getStatus(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.status === 'number') return value.status;
  return isRecord(value.response) && typeof value.response.status === 'number'
    ? value.response.status
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
