'use client';

import { useCallback, useEffect, useState } from 'react';
import { DayMarkKind, Holiday } from './holiday/types';
import { listHolidays, listHolidaysRaw, putHoliday } from './holiday/db';
import { hasSync, pushPull } from './sync';

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setHolidays(await listHolidays());
    } catch {
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // サーバ(D1)と同期して取り込む
  const syncNow = useCallback(async () => {
    const raw = await listHolidaysRaw();
    const server = await pushPull('holiday', raw);
    if (!server) return;
    const localMap = new Map(raw.map((r) => [r.id, r]));
    for (const s of server) {
      const rec = s as Holiday;
      if (!rec.id) continue;
      const l = localMap.get(rec.id);
      if (!l || (rec.updatedAt ?? 0) >= (l.updatedAt ?? -1)) {
        await putHoliday(rec);
      }
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    (async () => {
      await refresh();
      if (hasSync()) syncNow().catch(() => {});
    })();
  }, [refresh, syncNow]);

  // 日付マークの切り替え（休み／ー）。無ければ追加・同じ種類なら取り消し・
  // 違う種類が付いていれば種類を入れ替える（1日1件のみ）
  const toggle = useCallback(
    async (date: string, kind: DayMarkKind = 'off', memo?: string) => {
      const existing = holidays.find((h) => h.date === date);
      const now = Date.now();
      if (existing && existing.kind === kind) {
        await putHoliday({ ...existing, deleted: true, updatedAt: now });
      } else {
        await putHoliday({
          id: date,
          date,
          kind,
          memo: memo ?? existing?.memo,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        });
      }
      await refresh();
      if (hasSync()) syncNow().catch(() => {});
    },
    [holidays, refresh, syncNow],
  );

  return { holidays, loading, toggle, refresh };
}
