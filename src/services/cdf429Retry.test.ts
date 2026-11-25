import { describe, expect, it, vi } from 'vitest';

import {
  CDF_RETRY_MAX_ATTEMPTS,
  withCdf429Retry,
  type CdfRetryDependencies,
} from './cdf429Retry';

describe(withCdf429Retry.name, () => {
  it('retries 429 responses with bounded exponential jitter', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValue('done');
    const dependencies = makeDependencies({ random: () => 0.5 });

    await expect(
      withCdf429Retry(operation, dependencies)
    ).resolves.toBe('done');

    expect(operation).toHaveBeenCalledTimes(3);
    expect(dependencies.sleep).toHaveBeenNthCalledWith(1, 275);
    expect(dependencies.sleep).toHaveBeenNthCalledWith(2, 550);
  });

  it('honors Retry-After seconds and HTTP dates', async () => {
    const now = Date.parse('2026-11-24T09:00:00.000Z');
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({
        status: 429,
        headers: { 'retry-after': '2' },
      })
      .mockRejectedValueOnce({
        response: {
          status: 429,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === 'retry-after'
                ? 'Tue, 24 Nov 2026 09:00:05 GMT'
                : null,
          },
        },
      })
      .mockResolvedValue('done');
    const dependencies = makeDependencies({ now: () => now });

    await withCdf429Retry(operation, dependencies);

    expect(dependencies.sleep).toHaveBeenNthCalledWith(1, 2_000);
    expect(dependencies.sleep).toHaveBeenNthCalledWith(2, 5_000);
  });

  it('stops after the configured maximum number of attempts', async () => {
    const rateLimitError = { status: 429 };
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(rateLimitError);
    const dependencies = makeDependencies();

    await expect(
      withCdf429Retry(operation, dependencies)
    ).rejects.toBe(rateLimitError);

    expect(operation).toHaveBeenCalledTimes(CDF_RETRY_MAX_ATTEMPTS);
    expect(dependencies.sleep).toHaveBeenCalledTimes(
      CDF_RETRY_MAX_ATTEMPTS - 1
    );
  });

  it.each([400, 401, 403, 404])(
    'does not retry an ordinary %i response',
    async (status: number) => {
      const error = { status };
      const operation = vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(error);
      const dependencies = makeDependencies();

      await expect(
        withCdf429Retry(operation, dependencies)
      ).rejects.toBe(error);

      expect(operation).toHaveBeenCalledOnce();
      expect(dependencies.sleep).not.toHaveBeenCalled();
    }
  );
});

function makeDependencies(
  overrides: Partial<CdfRetryDependencies> = {}
): CdfRetryDependencies {
  return {
    sleep: vi.fn(() => Promise.resolve()),
    random: () => 0,
    now: () => 0,
    ...overrides,
  };
}
