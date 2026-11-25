import {
  Alert,
  AlertActions,
  AlertButton,
  AlertDescription,
  AlertTitle,
} from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
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
  CheckboxGroup,
  CheckboxItem,
  CheckboxItemControl,
  CheckboxItemDescription,
  CheckboxItemLabel,
} from '@cognite/aura/components/checkbox';
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@cognite/aura/components/empty-state';
import {
  SegmentedControl,
  SegmentedControlButton,
  SegmentedControlList,
} from '@cognite/aura/components/segmented-control';
import { IconRefresh } from '@tabler/icons-react';
import { lazy, Suspense } from 'react';

import type { TimeSeriesSummary } from '../domain/asset360Types';
import { MAX_SELECTED_TIME_SERIES } from '../domain/asset360Validation';
import { nodeIdsEqual, nodeKey } from '../domain/nodeId';

import { LoadingSkeleton } from './LoadingSkeleton';
import type {
  TimeRangePreset,
  TimeSeriesViewModel,
} from './useTimeSeriesViewModel';

// The chart pulls in Recharts, so it loads on demand to keep the first paint small.
const NumericChart = lazy(() =>
  import('./NumericChart').then((module) => ({ default: module.NumericChart }))
);

type TimeSeriesPanelProps = {
  viewModel: TimeSeriesViewModel;
};

export function TimeSeriesPanel({ viewModel }: TimeSeriesPanelProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardHeaderCenter>
          <CardTitle as="h2">Time series</CardTitle>
          <CardDescription>
            Select numeric series and compare recent datapoints.
          </CardDescription>
        </CardHeaderCenter>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="flex min-w-0 flex-col gap-6">
          <LinkedSeriesContent viewModel={viewModel} />
          {viewModel.linkedStatus === 'success' && (
            <ChartContent viewModel={viewModel} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkedSeriesContent({ viewModel }: TimeSeriesPanelProps) {
  if (viewModel.linkedStatus === 'loading') {
    return <LoadingMessage label="Loading linked time series..." />;
  }
  if (viewModel.linkedStatus === 'empty') {
    return (
      <EmptyState variant="compact">
        <EmptyStateTitle as="h3">No linked time series</EmptyStateTitle>
        <EmptyStateDescription>
          This asset has no related time series.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  if (
    viewModel.linkedStatus === 'noAccess' ||
    viewModel.linkedStatus === 'error'
  ) {
    return (
      <OperationError
        status={viewModel.linkedStatus}
        noAccessTitle="Time-series access unavailable"
        errorTitle="Linked series request failed"
        message={
          viewModel.linkedErrorMessage ?? 'Time series could not be loaded.'
        }
        retryLabel="Retry linked series"
        retry={viewModel.retryLinked}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Linked series</p>
      <CheckboxGroup aria-label="Linked time series">
        {viewModel.linkedSeries.map((series: TimeSeriesSummary) => {
          const supported = series.type === 'numeric';
          const selected = viewModel.selectedSeriesIds.some((id) =>
            nodeIdsEqual(id, series.id)
          );
          const selectionLimitReached =
            viewModel.hasReachedSelectionLimit && !selected;
          return (
            <CheckboxItem key={nodeKey(series.id)}>
              <CheckboxItemControl
                checked={selected}
                disabled={!supported || selectionLimitReached}
                onCheckedChange={() => viewModel.toggleSeries(series)}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <CheckboxItemLabel>
                  {series.name ?? series.id.externalId}
                </CheckboxItemLabel>
                <CheckboxItemDescription className="wrap-break-word">
                  {series.id.externalId}
                </CheckboxItemDescription>
              </span>
              <Badge
                className="shrink-0"
                variant={supported ? 'secondary' : 'warning'}
              >
                {supported
                  ? 'Numeric'
                  : `${capitalize(series.type)} · unsupported`}
              </Badge>
            </CheckboxItem>
          );
        })}
      </CheckboxGroup>
      <p className="text-sm text-muted-foreground">
        Compare up to {MAX_SELECTED_TIME_SERIES} series.
      </p>
    </div>
  );
}

function ChartContent({ viewModel }: TimeSeriesPanelProps) {
  if (viewModel.selectedSeriesIds.length === 0) {
    return (
      <EmptyState variant="compact">
        <EmptyStateTitle as="h3">
          Select a numeric series to chart
        </EmptyStateTitle>
        <EmptyStateDescription>
          No series is plotted until you make a selection.
        </EmptyStateDescription>
      </EmptyState>
    );
  }

  if (viewModel.latestStatus === 'loading') {
    return <LoadingMessage label="Finding latest datapoints..." />;
  }
  if (viewModel.latestStatus === 'empty') {
    return (
      <EmptyState variant="compact">
        <EmptyStateTitle as="h3">No datapoints found</EmptyStateTitle>
        <EmptyStateDescription>
          No datapoints were found for the selected series.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  if (
    viewModel.latestStatus === 'noAccess' ||
    viewModel.latestStatus === 'error'
  ) {
    return (
      <OperationError
        status={viewModel.latestStatus}
        noAccessTitle="Datapoint access unavailable"
        errorTitle="Latest datapoint request failed"
        message={
          viewModel.latestErrorMessage ??
          'Latest time-series datapoints could not be loaded.'
        }
        retryLabel="Retry latest datapoints"
        retry={viewModel.retryLatest}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {viewModel.range !== null && <ChartControls viewModel={viewModel} />}
      <RangeContent viewModel={viewModel} />
    </div>
  );
}

function ChartControls({ viewModel }: TimeSeriesPanelProps) {
  const selectedValue =
    viewModel.rangeDays === undefined ? '' : String(viewModel.rangeDays);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        value={selectedValue}
        onValueChange={(value: string) => {
          const preset = parseRangePreset(value);
          if (preset !== undefined) viewModel.setRangePreset(preset);
        }}
      >
        <SegmentedControlList aria-label="Time range">
          <SegmentedControlButton value="1" tabContent="label-only">
            1d
          </SegmentedControlButton>
          <SegmentedControlButton value="7" tabContent="label-only">
            7d
          </SegmentedControlButton>
          <SegmentedControlButton value="30" tabContent="label-only">
            30d
          </SegmentedControlButton>
        </SegmentedControlList>
      </SegmentedControl>
      <Button
        variant="secondary"
        size="sm"
        disabled={viewModel.isRefreshing}
        onClick={viewModel.refresh}
      >
        <IconRefresh aria-hidden="true" />
        {viewModel.isRefreshing ? 'Refreshing...' : 'Refresh data'}
      </Button>
    </div>
  );
}

function RangeContent({ viewModel }: TimeSeriesPanelProps) {
  if (viewModel.rangeStatus === 'loading') {
    return <LoadingMessage label="Loading chart data..." />;
  }
  if (viewModel.rangeStatus === 'empty') {
    return (
      <EmptyState variant="compact">
        <EmptyStateTitle as="h3">No datapoints in range</EmptyStateTitle>
        <EmptyStateDescription>
          No datapoints were found in this time range.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  if (
    viewModel.rangeStatus === 'noAccess' ||
    viewModel.rangeStatus === 'error'
  ) {
    return (
      <OperationError
        status={viewModel.rangeStatus}
        noAccessTitle="Chart data access unavailable"
        errorTitle="Chart data request failed"
        message={
          viewModel.rangeErrorMessage ??
          'Time-series datapoints could not be loaded.'
        }
        retryLabel="Retry chart data"
        retry={viewModel.retryRange}
      />
    );
  }
  if (viewModel.rangeStatus !== 'success') return null;

  return (
    <Suspense fallback={<LoadingMessage label="Loading chart..." />}>
      <NumericChart
        series={viewModel.seriesData}
        metadata={viewModel.linkedSeries}
      />
    </Suspense>
  );
}

function OperationError({
  status,
  noAccessTitle,
  errorTitle,
  message,
  retryLabel,
  retry,
}: {
  status: 'noAccess' | 'error';
  noAccessTitle: string;
  errorTitle: string;
  message: string;
  retryLabel: string;
  retry(): void;
}) {
  return (
    <Alert variant={status === 'noAccess' ? 'warning' : 'error'}>
      <AlertTitle>
        {status === 'noAccess' ? noAccessTitle : errorTitle}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <AlertActions>
        <AlertButton onClick={retry}>{retryLabel}</AlertButton>
      </AlertActions>
    </Alert>
  );
}

function LoadingMessage({ label }: { label: string }) {
  return <LoadingSkeleton label={label} rows={2} />;
}

function parseRangePreset(value: string): TimeRangePreset | undefined {
  if (value === '1') return 1;
  if (value === '7') return 7;
  if (value === '30') return 30;
  return undefined;
}

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

