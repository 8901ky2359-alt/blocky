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

  // 進捗のある現場（除草/シート/施工完了のいずれか）を「今週実施」に取り込む
  const markProgressThisWeek = useCallback(() => {
    setMap((cur) => {
      const next = { ...cur };
      let changed = false;
      for (const k of Object.keys(next)) {
        const p = next[k];
        const hasProgress = p.weeding !== 'none' || p.sheet !== 'none' || p.done;
        if (hasProgress && !p.thisWeek) {
          next[k] = { ...p, thisWeek: true, updatedAt: Date.now() };
          saveProgress(next[k]).catch(() => {});
          changed = true;
        }
      }
      return changed ? next : cur;
    });
  }, []);

  // 「今週実施」をすべて解除（報告を送ったあとに使う。ステータスは保持）
  const clearThisWeek = useCallback(() => {
    setMap((cur) => {
      const next = { ...cur };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (next[k].thisWeek) {
          next[k] = { ...next[k], thisWeek: false, updatedAt: Date.now() };
          saveProgress(next[k]).catch(() => {});
          changed = true;
        }
      }
      return changed ? next : cur;
    });
  }, []);

  return { map, loading, get, update, markProgressThisWeek, clearThisWeek };
}
