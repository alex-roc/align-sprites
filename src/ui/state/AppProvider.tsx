import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { saveJSON } from '../persist.ts';
import { AppContext } from './context.ts';
import { EXPORT_KEY, GLOBAL_KEY } from './defaults.ts';
import { initialState, reducer } from './reducer.ts';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  // Global settings and the export engine survive reloads.
  useEffect(() => saveJSON(GLOBAL_KEY, state.global), [state.global]);
  useEffect(() => saveJSON(EXPORT_KEY, { engine: state.exportEngine, all: state.exportAll }), [state.exportEngine, state.exportAll]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
