import { createContext, useContext, type Dispatch } from 'react';
import type { Action, AppState } from './types.ts';

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp outside <AppProvider>');
  return v;
}
