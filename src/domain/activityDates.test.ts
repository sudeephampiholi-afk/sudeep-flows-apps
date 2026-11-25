import { describe, expect, it } from 'vitest';

import { getActivityEffectiveDate } from './activityDates';
import type { Activity } from './asset360Types';

const BASE_ACTIVITY: Activity = {
  id: { space: 'activities', externalId: 'activity-1' },
  tags: [],
};

describe(getActivityEffectiveDate.name, () => {
  it('uses the first verified date in display and sorting precedence', () => {
    expect(
      getActivityEffectiveDate({
        ...BASE_ACTIVITY,
        endTime: '2026-03-12T12:00:00.000Z',
        scheduledEndTime: '2026-03-13T12:00:00.000Z',
        startTime: '2026-03-11T12:00:00.000Z',
        scheduledStartTime: '2026-03-10T12:00:00.000Z',
      })
    ).toBe('2026-03-12T12:00:00.000Z');
  });

  it('falls back through scheduled and start dates', () => {
    expect(
      getActivityEffectiveDate({
        ...BASE_ACTIVITY,
        startTime: '2026-03-11T12:00:00.000Z',
        scheduledStartTime: '2026-03-10T12:00:00.000Z',
      })
    ).toBe('2026-03-11T12:00:00.000Z');
    expect(getActivityEffectiveDate(BASE_ACTIVITY)).toBeUndefined();
  });
});
