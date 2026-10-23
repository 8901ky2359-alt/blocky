'use client';

import { useCallback, useEffect, useState } from 'react';
import { SiteProgress, EMPTY_PROGRESS, normalizeProgress } from './types';
import { loadAll, saveProgress } from './db';
import { pushPull } from '../sync';
import { seedProgress } from './seed';

export function useReport() {
  const [map, setMap] = useState<Record<string, SiteProgress>>({});
  const [loading, setLoading] = useState(true);

  // LINE報告の進捗を、それより古い記録しかない現場にだけ反映してサーバへ送る
  const applySeed = useCallback(() => {
    setMap((cur) => {
      const changed: SiteProgress[] = [];
      const next = { ...cur };
      for (const s of seedProgress()) {
        const local = next[s.workNo];
        if (local && local.updatedAt >= s.updatedAt) continue;
        next[s.workNo] = { ...(local ?? {}), ...s, nextWeek: local?.nextWeek ?? false, siteType: local?.siteType };
        changed.push(next[s.workNo]);
      }
      if (changed.length === 0) return cur;
      for (const p of changed) saveProgress(p).catch(() => {});
      pushPull('report', changed.map((p) => ({ ...p, id: p.workNo }))).catch(() => {});
      return next;
    });
  }, []);

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
      // 起動時に同期し、そのあとLINE報告の進捗を反映（電波が無くても端末内には反映）
      syncNow(local).finally(applySeed);
    })();
  }, [syncNow, applySeed]);

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
