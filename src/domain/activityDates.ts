import type { Activity } from './asset360Types';

export function getActivityEffectiveDate(
  activity: Activity
): string | undefined {
  return (
    activity.endTime ??
    activity.scheduledEndTime ??
    activity.startTime ??
    activity.scheduledStartTime
  );
}
