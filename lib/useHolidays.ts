'use client';

import { useCallback, useEffect, useState } from 'react';
import { Holiday } from './holiday/types';
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

  // 休みの切り替え（無ければ追加・あれば取り消し）
  const toggle = useCallback(
    async (date: string, memo?: string) => {
      const existing = holidays.find((h) => h.date === date);
      const now = Date.now();
      if (existing) {
        await putHoliday({ ...existing, deleted: true, updatedAt: now });
      } else {
        await putHoliday({ id: date, date, memo, createdAt: now, updatedAt: now });
      }
      await refresh();
      if (hasSync()) syncNow().catch(() => {});
    },
    [holidays, refresh, syncNow],
  );

  return { holidays, loading, toggle, refresh };
}
