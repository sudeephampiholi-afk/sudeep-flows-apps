import {
  Alert,
  AlertActions,
  AlertButton,
  AlertDescription,
  AlertTitle,
} from '@cognite/aura/components/alert';
import { Button } from '@cognite/aura/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeaderCenter,
  CardTitle,
} from '@cognite/aura/components/card';
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@cognite/aura/components/empty-state';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@cognite/aura/components/item';
import { IconChevronRight, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { getActivityEffectiveDate } from '../domain/activityDates';
import type { Activity } from '../domain/asset360Types';
import { nodeKey } from '../domain/nodeId';

import { LoadingSkeleton } from './LoadingSkeleton';
import type { ActivitiesViewModel } from './useActivitiesViewModel';

const ACTIVITY_PAGE_SIZE = 25;

type ActivitiesPanelProps = {
  viewModel: ActivitiesViewModel;
};

export function ActivitiesPanel({ viewModel }: ActivitiesPanelProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardHeaderCenter>
          <CardTitle as="h2">Work orders / activities</CardTitle>
          <CardDescription>
            Review activities linked to this asset without leaving the 360 view.
          </CardDescription>
        </CardHeaderCenter>
      </CardHeader>
      <CardContent className="min-w-0">
        <ActivitiesContent viewModel={viewModel} />
      </CardContent>
    </Card>
  );
}

function ActivitiesContent({ viewModel }: ActivitiesPanelProps) {
  if (viewModel.status === 'loading') {
    return <LoadingMessage />;
  }
  if (viewModel.status === 'empty') {
    return (
      <EmptyState variant="compact">
        <EmptyStateTitle as="h3">No related activities</EmptyStateTitle>
        <EmptyStateDescription>
          This asset has no linked work orders or activities.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  if (viewModel.status === 'noAccess' || viewModel.status === 'error') {
    return (
      <Alert variant={viewModel.status === 'noAccess' ? 'warning' : 'error'}>
        <AlertTitle>
          {viewModel.status === 'noAccess'
            ? 'Activity access unavailable'
            : 'Activity request failed'}
        </AlertTitle>
        <AlertDescription>
          {viewModel.errorMessage ?? 'Activities could not be loaded.'}
        </AlertDescription>
        <AlertActions>
          <AlertButton onClick={viewModel.retry}>Retry activities</AlertButton>
        </AlertActions>
      </Alert>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ActivityList viewModel={viewModel} />
      {viewModel.selectedActivity !== undefined && (
        <ActivityDetails
          activity={viewModel.selectedActivity}
          close={viewModel.closeActivity}
        />
      )}
    </div>
  );
}

function ActivityList({ viewModel }: ActivitiesPanelProps) {
  // Transient disclosure state: it only limits how many rows are rendered.
  const [visibleCount, setVisibleCount] = useState(ACTIVITY_PAGE_SIZE);
  const total = viewModel.activities.length;
  const visibleActivities = viewModel.activities.slice(0, visibleCount);
  const hasMore = visibleCount < total;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
        <p>{activityCountLabel(total)}</p>
        {hasMore && (
          <p aria-live="polite">{`Showing ${visibleActivities.length} of ${total}`}</p>
        )}
      </div>
      <ItemGroup aria-label="Work orders / activities">
        {visibleActivities.map((activity: Activity) => {
          const selected =
            viewModel.selectedActivity !== undefined &&
            activityKey(viewModel.selectedActivity) === activityKey(activity);
          return (
            <Item key={activityKey(activity)} selected={selected}>
              <Button
                variant="ghost"
                className="h-auto w-full min-w-0 flex-1 justify-start whitespace-normal p-2 text-left"
                aria-label={`Open activity details for ${activity.id.externalId}`}
                aria-pressed={selected}
                onClick={() => viewModel.selectActivity(activity.id)}
              >
                <ItemContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ActivityListField
                    label="External ID"
                    value={activity.id.externalId}
                    title
                  />
                  <ActivityListField
                    label="Name"
                    value={
                      activity.name ??
                      activity.description ??
                      'Unnamed activity'
                    }
                  />
                  <ActivityListField
                    label="Effective date"
                    value={formatDate(getActivityEffectiveDate(activity))}
                  />
                  <ActivityListField
                    label="Source"
                    value={sourceSummary(activity)}
                  />
                </ItemContent>
                <IconChevronRight
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                />
              </Button>
            </Item>
          );
        })}
      </ItemGroup>
      {hasMore && (
        <div>
          <Button
            variant="outline"
            onClick={() =>
              setVisibleCount((count: number) => count + ACTIVITY_PAGE_SIZE)
            }
          >
            Show more activities
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivityListField({
  label,
  value,
  title = false,
}: {
  label: string;
  value: string;
  title?: boolean;
}) {
  return (
    <div className="min-w-0">
      <ItemDescription>{label}</ItemDescription>
      {title ? (
        <ItemTitle className="whitespace-normal wrap-break-word">
          {value}
        </ItemTitle>
      ) : (
        <p className="wrap-break-word text-sm text-medium-foreground">
          {value}
        </p>
      )}
    </div>
  );
}

function ActivityDetails({
  activity,
  close,
}: {
  activity: Activity;
  close(): void;
}) {
  const values = detailValues(activity);
  return (
    <section
      aria-labelledby="activity-details-title"
      className="min-w-0 rounded-xl bg-medium-background p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id="activity-details-title" className="text-base font-medium">
          Activity details
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close activity details"
          onClick={close}
        >
          <IconX aria-hidden="true" />
        </Button>
      </div>
      <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
        {values.map(({ label, value }: DetailValue) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LoadingMessage() {
  return <LoadingSkeleton label="Loading work orders / activities..." rows={4} />;
}

type DetailValue = {
  label: string;
  value: string;
};

function detailValues(activity: Activity): DetailValue[] {
  return [
    { label: 'External ID', value: activity.id.externalId },
    activity.name === undefined
      ? undefined
      : { label: 'Name', value: activity.name },
    activity.description === undefined
      ? undefined
      : { label: 'Description', value: activity.description },
    activity.tags.length === 0
      ? undefined
      : { label: 'Tags', value: activity.tags.join(', ') },
    optionalDetail('Source ID', activity.sourceId),
    optionalDetail('Source context', activity.sourceContext),
    activity.source === undefined
      ? undefined
      : { label: 'Source relation', value: nodeKey(activity.source) },
    optionalDateDetail('Source created', activity.sourceCreatedTime),
    optionalDateDetail('Source updated', activity.sourceUpdatedTime),
    optionalDetail('Source created by', activity.sourceCreatedUser),
    optionalDetail('Source updated by', activity.sourceUpdatedUser),
    optionalDateDetail('Start', activity.startTime),
    optionalDateDetail('End', activity.endTime),
    optionalDateDetail('Scheduled start', activity.scheduledStartTime),
    optionalDateDetail('Scheduled end', activity.scheduledEndTime),
  ].filter((value: DetailValue | undefined): value is DetailValue =>
    value !== undefined
  );
}

function optionalDetail(
  label: string,
  value: string | undefined
): DetailValue | undefined {
  return value === undefined ? undefined : { label, value };
}

function optionalDateDetail(
  label: string,
  value: string | undefined
): DetailValue | undefined {
  return value === undefined ? undefined : { label, value: formatDate(value) };
}

function sourceSummary(activity: Activity): string {
  if (activity.sourceId !== undefined) return activity.sourceId;
  if (activity.sourceContext !== undefined) return activity.sourceContext;
  if (activity.source !== undefined) return nodeKey(activity.source);
  return '—';
}

function formatDate(value: string | undefined): string {
  if (value === undefined) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function activityKey(activity: Activity): string {
  return nodeKey(activity.id);
}

function activityCountLabel(count: number): string {
  return `${count} related ${count === 1 ? 'activity' : 'activities'}`;
}

