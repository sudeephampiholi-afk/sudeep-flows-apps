import { connectToHostApp } from '@cognite/app-sdk';
import { CogniteClient, type ClientOptions } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App, { type AppDependencies } from './App.tsx';

import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('The root element is missing');
}

const hostConnection = connectToHostApp({ applicationName: 'asset-360' });
const appDependencies: AppDependencies = {
  createClient: (config: ClientOptions) => new CogniteClient(config),
  reloadPage: () => window.location.reload(),
};

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App hostConnection={hostConnection} deps={appDependencies} />
    </QueryClientProvider>
  </React.StrictMode>
);
