'use client';

import { useCallback, useEffect, useState } from 'react';
import { SiteProgress, EMPTY_PROGRESS, normalizeProgress } from './types';
import { loadAll, saveProgress } from './db';
import { pushPull } from '../sync';

export function useReport() {
  const [map, setMap] = useState<Record<string, SiteProgress>>({});
  const [loading, setLoading] = useState(true);

  // サーバ(D1)と同期して取り込む
  const syncNow = useCallback(async (current: Record<string, SiteProgress>) => {
    const rows = Object.values(current).map((p) => ({ ...p, id: p.workNo }));
    const server = await pushPull('report', rows);
    if (!server) return;
    setMap((cur) => {
      const next = { ...cur };
      let changed = false;
      for (const raw of server) {
        const p = normalizeProgress(raw);
        const workNo = p.workNo || raw?.id;
        if (!workNo) continue;
        p.workNo = workNo;
        const local = next[workNo];
        if (!local || (p.updatedAt ?? 0) >= (local.updatedAt ?? -1)) {
          next[workNo] = p;
          saveProgress(p).catch(() => {});
          changed = true;
        }
      }
      return changed ? next : cur;
    });
  }, []);

  useEffect(() => {
    (async () => {
      const local = await loadAll();
      setMap(local);
      setLoading(false);
      syncNow(local); // 起動時に同期
    })();
  }, [syncNow]);

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
        // 変更分をサーバへ送信（バックグラウンド）
        pushPull('report', [{ ...next, id: next.workNo }]).catch(() => {});
        return { ...cur, [workNo]: next };
      });
    },
    [],
  );

  return { map, loading, get, update };
}
