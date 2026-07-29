'use client';

import { useCallback, useEffect, useState } from 'react';
import { SiteState } from './types';
import { loadAllStates, saveState } from './db';

const EMPTY: SiteState = { workNo: '', done: false, before: [], after: [], updatedAt: 0 };

export function useSites() {
  const [states, setStates] = useState<Record<string, SiteState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setStates(await loadAllStates());
      setLoading(false);
    })();
  }, []);

  const getState = useCallback(
    (workNo: string): SiteState => states[workNo] ?? { ...EMPTY, workNo },
    [states],
  );

  const update = useCallback(
    async (workNo: string, patch: Partial<SiteState>) => {
      const prev = states[workNo] ?? { ...EMPTY, workNo };
      const next: SiteState = { ...prev, ...patch, workNo, updatedAt: Date.now() };
      setStates((s) => ({ ...s, [workNo]: next }));
      await saveState(next);
    },
    [states],
  );

  return { states, loading, getState, update };
}
