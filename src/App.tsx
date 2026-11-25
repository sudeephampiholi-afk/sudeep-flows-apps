import type { ConnectToHostAppResult } from '@cognite/app-sdk';
import { CogniteSdkProvider } from '@cognite/app-sdk/react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cognite/aura/components/alert';
import { Card, CardContent } from '@cognite/aura/components/card';
import { Loader } from '@cognite/aura/components/loader';
import {
  useMemo,
  type ComponentProps,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import { AppErrorBoundary } from './app/AppErrorBoundary';
import { Asset360App } from './asset360/Asset360App';
import { HostAppProvider, useHostApp } from './host/HostAppContext';
import { Asset360StateProvider } from './state/Asset360StateProvider';

type CogniteSdkProviderDeps = NonNullable<
  ComponentProps<typeof CogniteSdkProvider>['deps']
>;

export type AppDependencies = {
  createClient: CogniteSdkProviderDeps['createClient'];
  reloadPage(): void;
  reportError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type AppProps = {
  hostConnection: Promise<ConnectToHostAppResult>;
  deps: AppDependencies;
};

function App({ hostConnection, deps }: AppProps) {
  const sdkDeps = useMemo<CogniteSdkProviderDeps>(
    () => ({
      connectToHostApp: () => hostConnection,
      createClient: deps.createClient,
    }),
    [deps.createClient, hostConnection]
  );

  return (
    <AppErrorBoundary
      reloadPage={deps.reloadPage}
      reportError={deps.reportError}
    >
      <HostAppProvider
        connection={hostConnection}
        loadingFallback={<LoadingState label="Connecting to Fusion host..." />}
        errorFallback={
          <ErrorState
            title="Failed to connect to Fusion host"
            description="Reload the app from Fusion and try again."
          />
        }
      >
        <CogniteSdkProvider
          loadingFallback={<LoadingState label="Loading CDF project..." />}
          errorFallback={
            <ErrorState
              title="Failed to authenticate with CDF"
              description="Check your project access, then reload the app."
            />
          }
          deps={sdkDeps}
        >
          <ConnectedApplication />
        </CogniteSdkProvider>
      </HostAppProvider>
    </AppErrorBoundary>
  );
}

function ConnectedApplication() {
  const { initialState } = useHostApp();
  return (
    <Asset360StateProvider initialState={initialState}>
      <Asset360App />
    </Asset360StateProvider>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <CenteredFrame>
      <Card aria-label={label} aria-live="polite">
        <CardContent>
          <div className="inline-flex items-center gap-3 text-muted-foreground">
            <Loader size={20} />
            <span>{label}</span>
          </div>
        </CardContent>
      </Card>
    </CenteredFrame>
  );
}

function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <CenteredFrame>
      <Alert variant="error">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </CenteredFrame>
  );
}

function CenteredFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-base-background text-base-foreground">
      <section className="mx-auto flex min-h-screen min-w-0 w-full max-w-lg flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}

export default App;
