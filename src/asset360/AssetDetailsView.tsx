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
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@cognite/aura/components/empty-state';
import { IconArrowLeft } from '@tabler/icons-react';

import type { Asset } from '../domain/asset360Types';

import { ActivitiesPanel } from './ActivitiesPanel';
import { LoadingSkeleton } from './LoadingSkeleton';
import { TimeSeriesPanel } from './TimeSeriesPanel';
import type { ActivitiesViewModel } from './useActivitiesViewModel';
import type { AssetDetailsViewModel } from './useAssetDetailsViewModel';
import type { TimeSeriesViewModel } from './useTimeSeriesViewModel';

type AssetDetailsViewProps = {
  viewModel: AssetDetailsViewModel;
  timeSeriesViewModel: TimeSeriesViewModel;
  activitiesViewModel: ActivitiesViewModel;
};

export function AssetDetailsView({
  viewModel,
  timeSeriesViewModel,
  activitiesViewModel,
}: AssetDetailsViewProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-base-background text-base-foreground">
      <section className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <Button variant="ghost" onClick={viewModel.backToSearch}>
            <IconArrowLeft aria-hidden="true" />
            Back to asset search
          </Button>
        </div>

        {viewModel.shareStateWarning && <ShareStateWarning />}

        <AssetDetailsContent
          viewModel={viewModel}
          timeSeriesViewModel={timeSeriesViewModel}
          activitiesViewModel={activitiesViewModel}
        />
      </section>
    </main>
  );
}

function AssetDetailsContent({
  viewModel,
  timeSeriesViewModel,
  activitiesViewModel,
}: AssetDetailsViewProps) {
  if (viewModel.status === 'loading') {
    return <LoadingSkeleton label="Loading asset..." rows={2} />;
  }

  if (viewModel.status === 'empty') {
    return (
      <EmptyState variant="full" type="not-found">
        <EmptyStateTitle>Asset not found</EmptyStateTitle>
        <EmptyStateDescription>
          The selected asset may have been removed or is no longer available.
        </EmptyStateDescription>
        <EmptyStateActions>
          <Button variant="secondary" onClick={viewModel.backToSearch}>
            Back to asset search
          </Button>
        </EmptyStateActions>
      </EmptyState>
    );
  }

  if (viewModel.status === 'noAccess' || viewModel.status === 'error') {
    return (
      <Alert variant={viewModel.status === 'noAccess' ? 'warning' : 'error'}>
        <AlertTitle>
          {viewModel.status === 'noAccess'
            ? 'Asset access unavailable'
            : 'Asset request failed'}
        </AlertTitle>
        <AlertDescription>{viewModel.errorMessage}</AlertDescription>
        <AlertActions>
          <AlertButton onClick={viewModel.retry}>Retry</AlertButton>
        </AlertActions>
      </Alert>
    );
  }

  return (
    <LoadedAssetDetails
      asset={viewModel.asset}
      timeSeriesViewModel={timeSeriesViewModel}
      activitiesViewModel={activitiesViewModel}
    />
  );
}

function LoadedAssetDetails({
  asset,
  timeSeriesViewModel,
  activitiesViewModel,
}: {
  asset: Asset | undefined;
  timeSeriesViewModel: TimeSeriesViewModel;
  activitiesViewModel: ActivitiesViewModel;
}) {
  if (asset === undefined) return null;

  return (
    <>
      <Card className="min-w-0">
        <CardHeader>
          <CardHeaderCenter>
            <CardTitle as="h1">{asset.name ?? asset.id.externalId}</CardTitle>
            <CardDescription className="wrap-break-word">
              {asset.id.externalId}
            </CardDescription>
          </CardHeaderCenter>
        </CardHeader>
        <CardContent>
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
            {asset.description !== undefined && (
              <DetailValue label="Description" value={asset.description} />
            )}
            {asset.type !== undefined && (
              <DetailValue
                label="Type relation"
                value={`${asset.type.space}:${asset.type.externalId}`}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-6">
        <TimeSeriesPanel viewModel={timeSeriesViewModel} />
        <ActivitiesPanel viewModel={activitiesViewModel} />
      </div>
    </>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word">{value}</dd>
    </div>
  );
}

function ShareStateWarning() {
  return (
    <Alert variant="warning" alertStyle="strip">
      <AlertTitle>Sharing is temporarily unavailable</AlertTitle>
      <AlertDescription>
        Your view is updated, but its shareable state could not be saved.
      </AlertDescription>
    </Alert>
  );
}
