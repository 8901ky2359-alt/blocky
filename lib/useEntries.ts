'use client';

import { useCallback, useEffect, useState } from 'react';
import { Entry } from './types';
import { deleteEntry, listEntries, putEntry } from './db';
import { uid } from './format';
import { hasSync, syncNow } from './sync';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const rows = await listEntries();
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // クラウド同期して一覧を更新
  const sync = useCallback(async () => {
    if (!hasSync()) return { ok: false, error: 'no-space' as const };
    setSyncing(true);
    try {
      const r = await syncNow();
      await refresh();
      return r;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  // 起動時：まずローカル表示 → 同期があれば同期
  useEffect(() => {
    (async () => {
      await refresh();
      if (hasSync()) {
        setSyncing(true);
        try {
          await syncNow();
          await refresh();
        } finally {
          setSyncing(false);
        }
      }
    })();
  }, [refresh]);

  const save = useCallback(
    async (input: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const existing = input.id ? entries.find((e) => e.id === input.id) : undefined;
      const now = Date.now();
      const entry: Entry = {
        id: input.id ?? uid(),
        date: input.date,
        kind: input.kind,
        category: input.category,
        site: input.site,
        amount: input.amount,
        memo: input.memo,
        photos: input.photos,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        workType: input.workType,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await putEntry(entry);
      await refresh();
      // 保存後にバックグラウンドで同期（写真は送らない）
      if (hasSync()) {
        syncNow()
          .then(() => refresh())
          .catch(() => {});
      }
      return entry;
    },
    [entries, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteEntry(id);
      await refresh();
    },
    [refresh],
  );

  return { entries, loading, syncing, refresh, save, remove, sync };
}
