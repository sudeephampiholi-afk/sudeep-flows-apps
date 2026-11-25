export const CDF_RETRY_MAX_ATTEMPTS = 4;

const INITIAL_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 4_000;
const MAX_RETRY_DELAY_MS = 30_000;
const JITTER_RATIO = 0.2;

export interface CdfRetryDependencies {
  sleep(milliseconds: number): Promise<void>;
  random(): number;
  now(): number;
}

const defaultDependencies: CdfRetryDependencies = {
  sleep: (milliseconds: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    }),
  random: () => Math.random(),
  now: () => Date.now(),
};

export async function withCdf429Retry<T>(
  operation: () => Promise<T>,
  dependencies: CdfRetryDependencies = defaultDependencies
): Promise<T> {
  for (let attempt = 1; attempt <= CDF_RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (
        getStatus(error) !== 429 ||
        attempt === CDF_RETRY_MAX_ATTEMPTS
      ) {
        throw error;
      }
      await dependencies.sleep(
        calculateDelay(error, attempt, dependencies)
      );
    }
  }

  throw new Error('CDF retry attempts were exhausted.');
}

function calculateDelay(
  error: unknown,
  failedAttempt: number,
  dependencies: CdfRetryDependencies
): number {
  const exponential = Math.min(
    INITIAL_BACKOFF_MS * 2 ** (failedAttempt - 1),
    MAX_BACKOFF_MS
  );
  const boundedRandom = Math.min(Math.max(dependencies.random(), 0), 1);
  const backoffWithJitter = Math.round(
    exponential + exponential * JITTER_RATIO * boundedRandom
  );
  const retryAfter = readRetryAfterMilliseconds(error, dependencies.now());
  return Math.min(
    Math.max(backoffWithJitter, retryAfter ?? 0),
    MAX_RETRY_DELAY_MS
  );
}

function readRetryAfterMilliseconds(
  error: unknown,
  now: number
): number | undefined {
  if (!isRecord(error)) return undefined;
  const direct = readRetryAfterHeader(error.headers);
  const nested = isRecord(error.response)
    ? readRetryAfterHeader(error.response.headers)
    : undefined;
  const value = direct ?? nested;
  if (value === undefined) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(date - now, 0) : undefined;
}

function readRetryAfterHeader(headers: unknown): string | undefined {
  if (isHeaderReader(headers)) {
    return (
      headers.get('Retry-After') ??
      headers.get('retry-after') ??
      undefined
    );
  }
  if (!isRecord(headers)) return undefined;
  const value = headers['retry-after'] ?? headers['Retry-After'];
  return typeof value === 'string' ? value : undefined;
}

function getStatus(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.status === 'number') return value.status;
  return isRecord(value.response) && typeof value.response.status === 'number'
    ? value.response.status
    : undefined;
}

type HeaderReader = {
  get(name: string): string | null;
};

function isHeaderReader(value: unknown): value is HeaderReader {
  return isRecord(value) && typeof value.get === 'function';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
