'use client';

import { useCallback, useEffect, useState } from 'react';
import { Entry } from './types';
import { deleteEntry, listEntries, putEntry } from './db';
import { uid } from './format';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refresh();
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

  return { entries, loading, refresh, save, remove };
}
