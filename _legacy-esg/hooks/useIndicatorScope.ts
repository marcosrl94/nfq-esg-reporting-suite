import { useCallback, useEffect, useState } from 'react';
import type { DataOrigin } from '../types';
import { StandardType } from '../types';
import {
  defaultScopeEntry,
  loadScopeStore,
  saveScopeStore,
  type IndicatorScopeEntry
} from '../services/indicatorScopeStore';

export function useIndicatorScope() {
  const [store, setStore] = useState<Record<string, IndicatorScopeEntry>>(loadScopeStore);

  useEffect(() => {
    saveScopeStore(store);
  }, [store]);

  const getEntry = useCallback(
    (datapointId: string): IndicatorScopeEntry => store[datapointId] ?? defaultScopeEntry(),
    [store]
  );

  const isInScope = useCallback(
    (datapointId: string) => getEntry(datapointId).inScope !== false,
    [getEntry]
  );

  const setInScope = useCallback((datapointId: string, inScope: boolean) => {
    setStore((prev) => {
      const cur = prev[datapointId] ?? defaultScopeEntry();
      return { ...prev, [datapointId]: { ...cur, inScope } };
    });
  }, []);

  const setOrigins = useCallback((datapointId: string, origins: DataOrigin[]) => {
    setStore((prev) => {
      const cur = prev[datapointId] ?? defaultScopeEntry();
      return { ...prev, [datapointId]: { ...cur, origins } };
    });
  }, []);

  const toggleOrigin = useCallback((datapointId: string, origin: DataOrigin) => {
    setStore((prev) => {
      const cur = { ...(prev[datapointId] ?? defaultScopeEntry()) };
      const next = new Set(cur.origins);
      if (next.has(origin)) next.delete(origin);
      else next.add(origin);
      cur.origins = [...next];
      return { ...prev, [datapointId]: cur };
    });
  }, []);

  const setPrimaryStandard = useCallback((datapointId: string, primaryStandard: StandardType | undefined) => {
    setStore((prev) => {
      const cur = prev[datapointId] ?? defaultScopeEntry();
      return { ...prev, [datapointId]: { ...cur, primaryStandard } };
    });
  }, []);

  const seedNewDatapoint = useCallback(
    (datapointId: string, origins: DataOrigin[], primaryStandard: StandardType = StandardType.ESRS) => {
      setStore((prev) => ({
        ...prev,
        [datapointId]: {
          inScope: true,
          origins,
          primaryStandard
        }
      }));
    },
    []
  );

  return {
    store,
    getEntry,
    isInScope,
    setInScope,
    setOrigins,
    toggleOrigin,
    setPrimaryStandard,
    seedNewDatapoint
  };
}
