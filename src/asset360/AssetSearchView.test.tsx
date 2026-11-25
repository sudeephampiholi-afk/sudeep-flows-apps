import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { mockAsset } from '../__mocks__/asset360';
import { renderWithProviders } from '../test/renderWithProviders';

import { AssetSearchView } from './AssetSearchView';
import type { AssetSearchViewModel } from './useAssetSearchViewModel';

describe('AssetSearchView', () => {
  it('renders controlled search and a ranked accessible result list', async () => {
    const setSearchQuery = vi.fn();
    const selectAsset = vi.fn();
    renderWithProviders(
      <AssetSearchView
        viewModel={makeViewModel({
          searchQuery: 'pump',
          status: 'success',
          results: [mockAsset],
          setSearchQuery,
          selectAsset,
        })}
      />
    );

    expect(screen.getByLabelText('Search assets')).toHaveValue('pump');
    expect(screen.getByLabelText('Search assets')).toHaveAttribute(
      'maxlength',
      '200'
    );
    expect(screen.getByText(mockAsset.id.externalId)).toBeInTheDocument();
    expect(screen.getByText('Main pump')).toBeInTheDocument();
    expect(screen.getByText('Water injection pump')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('Parent asset-space:parent-1')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search assets'), ' 23');
    expect(setSearchQuery).toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: /Open Main pump/ })
    );
    expect(selectAsset).toHaveBeenCalledWith(mockAsset.id);
  });

  it('renders prompt, loading, empty, error, and share warning states', () => {
    const { rerender } = renderWithProviders(
      <AssetSearchView viewModel={makeViewModel()} />
    );
    expect(screen.getByText(/Enter at least 2 characters/)).toBeInTheDocument();

    rerender(
      <AssetSearchView
        viewModel={makeViewModel({ status: 'loading', searchQuery: 'pu' })}
      />
    );
    expect(screen.getByText('Searching assets...')).toBeInTheDocument();

    rerender(
      <AssetSearchView
        viewModel={makeViewModel({ status: 'empty', searchQuery: 'unknown' })}
      />
    );
    expect(screen.getByText('No assets matched')).toBeInTheDocument();

    rerender(
      <AssetSearchView
        viewModel={makeViewModel({
          status: 'error',
          searchQuery: 'pump',
          errorMessage: 'Assets could not be loaded.',
          shareStateWarning: true,
        })}
      />
    );
    expect(screen.getByText('Assets could not be loaded.')).toBeInTheDocument();
    expect(screen.getByText(/shareable state/)).toBeInTheDocument();
  });
});

function makeViewModel(
  overrides: Partial<AssetSearchViewModel> = {}
): AssetSearchViewModel {
  return {
    searchQuery: '',
    results: [],
    status: 'prompt',
    errorMessage: undefined,
    shareStateWarning: false,
    setSearchQuery: vi.fn(),
    selectAsset: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}
