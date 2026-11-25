import { useAsset360StateStorage } from '../state/Asset360StateProvider';

import { AssetDetailsView } from './AssetDetailsView';
import { AssetSearchView } from './AssetSearchView';
import { useActivitiesViewModel } from './useActivitiesViewModel';
import { useAssetDetailsViewModel } from './useAssetDetailsViewModel';
import { useAssetSearchViewModel } from './useAssetSearchViewModel';
import { useTimeSeriesViewModel } from './useTimeSeriesViewModel';

export function Asset360App() {
  const { state } = useAsset360StateStorage();

  return state.activeView === 'asset' ? (
    <ConnectedAssetDetails />
  ) : (
    <ConnectedAssetSearch />
  );
}

function ConnectedAssetSearch() {
  const viewModel = useAssetSearchViewModel();
  return <AssetSearchView viewModel={viewModel} />;
}

function ConnectedAssetDetails() {
  const viewModel = useAssetDetailsViewModel();
  const timeSeriesViewModel = useTimeSeriesViewModel();
  const activitiesViewModel = useActivitiesViewModel();

  return (
    <AssetDetailsView
      viewModel={viewModel}
      timeSeriesViewModel={timeSeriesViewModel}
      activitiesViewModel={activitiesViewModel}
    />
  );
}
