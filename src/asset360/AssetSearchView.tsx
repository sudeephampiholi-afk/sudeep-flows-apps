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
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from '@cognite/aura/components/empty-state';
import {
  Item,
  ItemContent,
  ItemGroup,
} from '@cognite/aura/components/item';
import { Label } from '@cognite/aura/components/label';
import { Search } from '@cognite/aura/components/search';
import type { ChangeEvent } from 'react';

import type { AssetSummary } from '../domain/asset360Types';
import { MAX_ASSET_SEARCH_QUERY_LENGTH } from '../domain/asset360Validation';

import { LoadingSkeleton } from './LoadingSkeleton';
import type { AssetSearchViewModel } from './useAssetSearchViewModel';

type AssetSearchViewProps = {
  viewModel: AssetSearchViewModel;
};

export function AssetSearchView({ viewModel }: AssetSearchViewProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-base-background text-base-foreground">
      <section className="mx-auto flex min-w-0 w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-4xl font-medium">Asset 360</h1>
          <p className="text-muted-foreground">
            Find an asset by tag, name, or description.
          </p>
        </header>

        {viewModel.shareStateWarning && <ShareStateWarning />}

        <div className="flex max-w-2xl flex-col">
          <Label htmlFor="asset-search">Search assets</Label>
          <Search
            id="asset-search"
            value={viewModel.searchQuery}
            placeholder="Search assets"
            autoComplete="off"
            maxLength={MAX_ASSET_SEARCH_QUERY_LENGTH}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              viewModel.setSearchQuery(event.currentTarget.value)
            }
            onClear={() => viewModel.setSearchQuery('')}
          />
        </div>

        <div aria-live="polite">
          <SearchResults viewModel={viewModel} />
        </div>
      </section>
    </main>
  );
}

function SearchResults({ viewModel }: AssetSearchViewProps) {
  if (viewModel.status === 'prompt') {
    return (
      <EmptyState variant="compact" type="unknown">
        <EmptyStateTitle>Search for an asset</EmptyStateTitle>
        <EmptyStateDescription>
          Enter at least 2 characters to search tags, names, and descriptions.
        </EmptyStateDescription>
      </EmptyState>
    );
  }

  if (viewModel.status === 'loading') {
    return <LoadingSkeleton label="Searching assets..." rows={4} />;
  }

  if (viewModel.status === 'empty') {
    return (
      <EmptyState variant="compact" type="no-results">
        <EmptyStateTitle>No assets matched</EmptyStateTitle>
        <EmptyStateDescription>
          Check the tag or try a broader name or description.
        </EmptyStateDescription>
      </EmptyState>
    );
  }

  if (viewModel.status === 'noAccess' || viewModel.status === 'error') {
    return (
      <Alert variant={viewModel.status === 'noAccess' ? 'warning' : 'error'}>
        <AlertTitle>
          {viewModel.status === 'noAccess'
            ? 'Asset access unavailable'
            : 'Asset search failed'}
        </AlertTitle>
        <AlertDescription>{viewModel.errorMessage}</AlertDescription>
        <AlertActions>
          <AlertButton onClick={viewModel.retry}>Retry</AlertButton>
        </AlertActions>
      </Alert>
    );
  }

  return (
    <ItemGroup aria-label="Asset search results">
      {viewModel.results.map((asset: AssetSummary) => (
        <Item key={`${asset.id.space}:${asset.id.externalId}`}>
          <ItemContent>
            <Button
              variant="ghost"
              className="h-auto min-w-0 w-full justify-start whitespace-normal"
              aria-label={`Open ${asset.name ?? asset.id.externalId}`}
              onClick={() => viewModel.selectAsset(asset.id)}
            >
              <span className="flex min-w-0 flex-col items-start gap-1 text-left">
                <span className="font-mono text-sm">
                  {asset.id.externalId}
                </span>
                {asset.name !== undefined && (
                  <span className="font-medium">{asset.name}</span>
                )}
                {asset.description !== undefined && (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {asset.description}
                  </span>
                )}
                {asset.parent !== undefined && (
                  <span className="wrap-break-word text-sm text-muted-foreground">
                    Parent {asset.parent.space}:{asset.parent.externalId}
                  </span>
                )}
                {asset.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1">
                    {asset.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                )}
              </span>
            </Button>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
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
