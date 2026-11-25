import type { ConnectToHostAppResult } from '@cognite/app-sdk';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const HostAppContext = createContext<ConnectToHostAppResult | null>(null);

type HostConnectionState =
  | { status: 'loading' }
  | { status: 'ready'; result: ConnectToHostAppResult }
  | { status: 'error' };

type HostAppProviderProps = {
  connection: Promise<ConnectToHostAppResult>;
  loadingFallback: ReactNode;
  errorFallback: ReactNode;
  children: ReactNode;
};

export function HostAppProvider({
  connection,
  loadingFallback,
  errorFallback,
  children,
}: HostAppProviderProps) {
  const [connectionState, setConnectionState] =
    useState<HostConnectionState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    void connection.then(
      (result) => {
        if (active) {
          setConnectionState({ status: 'ready', result });
        }
      },
      () => {
        if (active) {
          setConnectionState({ status: 'error' });
        }
      }
    );

    return () => {
      active = false;
    };
  }, [connection]);

  if (connectionState.status === 'loading') {
    return <>{loadingFallback}</>;
  }

  if (connectionState.status === 'error') {
    return <>{errorFallback}</>;
  }

  return (
    <HostAppContext.Provider value={connectionState.result}>
      {children}
    </HostAppContext.Provider>
  );
}

// The hook intentionally shares this module with its matching provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useHostApp(): ConnectToHostAppResult {
  const hostApp = useContext(HostAppContext);
  if (hostApp === null) {
    throw new Error('useHostApp must be used within HostAppProvider');
  }
  return hostApp;
}
