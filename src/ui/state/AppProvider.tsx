import { useMemo, useReducer, type ReactNode } from 'react';
import { AppContext } from './context.ts';
import { initialState, reducer } from './reducer.ts';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
