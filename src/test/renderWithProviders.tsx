import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import { useMemo, type ReactElement, type ReactNode } from 'react';

import {
  Asset360ViewModelContext,
  type Asset360ViewModelContextType,
} from '../asset360/asset360ViewModelContext';
import { Asset360StateProvider } from '../state/Asset360StateProvider';

export type TestProvidersProps = {
  children: ReactNode;
  asset360InitialState?: string;
  viewModelContext?: Asset360ViewModelContextType;
  queryClient?: QueryClient;
};

export function TestProviders({
  children,
  asset360InitialState,
  viewModelContext,
  queryClient: providedQueryClient,
}: TestProvidersProps) {
  const defaultQueryClient = useMemo(() => createTestQueryClient(), []);
  const content = (
    <Asset360StateProvider initialState={asset360InitialState}>
      {children}
    </Asset360StateProvider>
  );

  return (
    <QueryClientProvider client={providedQueryClient ?? defaultQueryClient}>
      {viewModelContext === undefined ? (
        content
      ) : (
        <Asset360ViewModelContext.Provider value={viewModelContext}>
          {content}
        </Asset360ViewModelContext.Provider>
      )}
    </QueryClientProvider>
  );
}

type ProviderRenderOptions = Omit<RenderOptions, 'wrapper'> &
  Omit<TestProvidersProps, 'children'>;

// Test utilities intentionally share the provider component used by renderHook.
// eslint-disable-next-line react-refresh/only-export-components
export function renderWithProviders(
  ui: ReactElement,
  options: ProviderRenderOptions = {}
): RenderResult {
  const {
    asset360InitialState,
    viewModelContext,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestProviders
        asset360InitialState={asset360InitialState}
        viewModelContext={viewModelContext}
        queryClient={queryClient}
      >
        {children}
      </TestProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}
