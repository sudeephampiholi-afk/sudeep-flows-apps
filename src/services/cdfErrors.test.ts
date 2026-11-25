import { describe, expect, it } from 'vitest';

import { CdfServiceError, classifyCdfError } from './cdfErrors';

describe(classifyCdfError.name, () => {
  it.each([401, 403])('classifies status %s as no access', (status: number) => {
    const result = classifyCdfError(
      { status, message: 'sensitive upstream detail' },
      'You do not have access to assets.',
      'Assets could not be loaded.'
    );

    expect(result).toEqual(
      new CdfServiceError('noAccess', 'You do not have access to assets.')
    );
    expect(result.message).not.toContain('sensitive');
  });

  it('recognizes an HTTP status nested in an SDK response', () => {
    const result = classifyCdfError(
      { response: { status: 403 }, message: 'private response body' },
      'You do not have access to time series.',
      'Time series could not be loaded.'
    );

    expect(result.kind).toBe('noAccess');
  });

  it('classifies ordinary failures without leaking upstream details', () => {
    const result = classifyCdfError(
      new Error('token and project details'),
      'No access.',
      'The CDF request failed.'
    );

    expect(result).toEqual(
      new CdfServiceError('request', 'The CDF request failed.')
    );
    expect(result.message).not.toContain('token');
  });
});
