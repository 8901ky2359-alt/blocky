'use client';

import { useCallback, useEffect, useState } from 'react';
import { SiteProgress, EMPTY_PROGRESS } from './types';
import { loadAll, saveProgress } from './db';

export function useReport() {
  const [map, setMap] = useState<Record<string, SiteProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setMap(await loadAll());
      setLoading(false);
    })();
  }, []);

  const get = useCallback(
    (workNo: string): SiteProgress => map[workNo] ?? { ...EMPTY_PROGRESS, workNo },
    [map],
  );

  const update = useCallback(
    (workNo: string, patch: Partial<SiteProgress>) => {
      setMap((cur) => {
        const prev = cur[workNo] ?? { ...EMPTY_PROGRESS, workNo };
        const next: SiteProgress = { ...prev, ...patch, workNo, updatedAt: Date.now() };
        saveProgress(next).catch(() => {});
        return { ...cur, [workNo]: next };
      });
    },
    [],
  );

  return { map, loading, get, update };
}
