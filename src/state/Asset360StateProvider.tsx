import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  parseAsset360InitialState,
  type Asset360State,
} from './asset360State';

export type Asset360StateStorage = {
  state: Asset360State;
  shareStateWarning: boolean;
  updateState(
    update: (current: Asset360State) => Asset360State
  ): Asset360State;
  setShareStateWarning(value: boolean): void;
};

const Asset360StateContext = createContext<Asset360StateStorage | null>(null);

type Asset360StateProviderProps = {
  children: ReactNode;
  initialState?: string;
};

export function Asset360StateProvider({
  children,
  initialState,
}: Asset360StateProviderProps) {
  const [state, setState] = useState<Asset360State>(() =>
    parseAsset360InitialState(initialState)
  );
  const stateRef = useRef(state);
  const [shareStateWarning, setShareStateWarning] = useState(false);
  const updateState = useCallback(
    (update: (current: Asset360State) => Asset360State) => {
      const next = update(stateRef.current);
      stateRef.current = next;
      setState(next);
      return next;
    },
    []
  );
  const storage = useMemo(
    () => ({
      state,
      shareStateWarning,
      updateState,
      setShareStateWarning,
    }),
    [shareStateWarning, state, updateState]
  );

  return (
    <Asset360StateContext.Provider value={storage}>
      {children}
    </Asset360StateContext.Provider>
  );
}

// The storage hook intentionally shares this module with its matching provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAsset360StateStorage(): Asset360StateStorage {
  const storage = useContext(Asset360StateContext);
  if (storage === null) {
    throw new Error(
      'useAsset360StateStorage must be used within Asset360StateProvider'
    );
  }
  return storage;
}
