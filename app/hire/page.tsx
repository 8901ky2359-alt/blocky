'use client';

import { useCallback, useEffect, useState } from 'react';
import { HireRecord, normalizeHire } from '@/lib/hire/types';
import { listHire, putHire, listHireRaw } from '@/lib/hire/db';
import { pushPull } from '@/lib/sync';
import { todayStr } from '@/lib/format';
import HireForm from '@/components/hire/HireForm';
import HireDoc from '@/components/hire/HireDoc';
import HireCalendar from '@/components/hire/HireCalendar';
import HireByName from '@/components/hire/HireByName';
import AppMenu from '@/components/AppMenu';

type View =
  | { kind: 'list' }
  | { kind: 'form'; editing?: HireRecord | null; date?: string }
  | { kind: 'doc'; rec: HireRecord };

export default function HirePage() {
  const [records, setRecords] = useState<HireRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [listMode, setListMode] = useState<'calendar' | 'name'>('calendar');

  const refresh = useCallback(async () => {
    setRecords(await listHire());
    setLoading(false);
  }, []);

  // サーバ(D1)と同期して取り込む
  const syncNow = useCallback(async () => {
    const raw = await listHireRaw();
    const server = await pushPull('hire', raw);
    if (!server) return;
    const localMap = new Map(raw.map((r) => [r.id, r]));
    for (const s of server) {
      const rec = normalizeHire(s);
      if (!rec.id) continue;
      const l = localMap.get(rec.id);
      if (!l || (rec.updatedAt ?? 0) >= (l.updatedAt ?? -1)) {
        await putHire(rec);
      }
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    (async () => {
      await refresh();
      syncNow();
    })();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [refresh, syncNow]);

  async function save(rec: HireRecord) {
    await putHire(rec);
    await refresh();
    pushPull('hire', [rec]).catch(() => {});
    setView({ kind: 'doc', rec });
  }
  async function remove(id: string) {
    // 同期のため物理削除ではなく墓標を残す
    const target = records.find((r) => r.id === id);
    const tomb: HireRecord = target
      ? { ...target, deleted: true, updatedAt: Date.now() }
      : { id, date: '', name: '', site: '', amount: 0, deleted: true, createdAt: Date.now(), updatedAt: Date.now() };
    await putHire(tomb);
    await refresh();
    pushPull('hire', [tomb]).catch(() => {});
    setView({ kind: 'list' });
  }

  return (
    <div className="min-h-[100dvh] hud-bg">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[520px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <a href="/" className="flex items-center gap-2" aria-label="ホームに戻る">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-black text-white">
              雇
            </span>
            <span className="text-base font-bold tracking-tight text-brand-primary">雇用・作業依頼</span>
            <span className="text-xs text-slate-400">／ホーム</span>
          </a>
          <div className="flex items-center gap-2">
            {view.kind === 'list' && (
              <button
                onClick={() => setView({ kind: 'form', editing: null })}
                className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-bold text-white"
              >
                ＋作成
              </button>
            )}
            <AppMenu />
          </div>
        </header>

        <main className="w-full px-4 pb-16 pt-4">
          {loading ? (
            <p className="py-20 text-center text-black/40">読み込み中…</p>
          ) : view.kind === 'form' ? (
            <HireForm editing={view.editing} defaultDate={view.date} onSave={save} onCancel={() => setView({ kind: 'list' })} />
          ) : view.kind === 'doc' ? (
            <HireDoc
              rec={records.find((r) => r.id === view.rec.id) ?? view.rec}
              onEdit={() => setView({ kind: 'form', editing: view.rec })}
              onDelete={() => remove(view.rec.id)}
              onBack={() => setView({ kind: 'list' })}
            />
          ) : (
            <>
              {/* カレンダー / 名前別 切替 */}
              <div className="mb-3 flex justify-center">
                <div className="flex overflow-hidden rounded-full border border-slate-200 bg-white">
                  <button
                    onClick={() => setListMode('calendar')}
                    className={`px-4 py-1.5 text-xs font-bold ${listMode === 'calendar' ? 'bg-brand-primary text-white' : 'text-slate-500'}`}
                  >
                    📅 カレンダー
                  </button>
                  <button
                    onClick={() => setListMode('name')}
                    className={`px-4 py-1.5 text-xs font-bold ${listMode === 'name' ? 'bg-brand-primary text-white' : 'text-slate-500'}`}
                  >
                    👤 名前別
                  </button>
                </div>
              </div>
              {listMode === 'calendar' ? (
                <HireCalendar
                  records={records}
                  onOpen={(rec) => setView({ kind: 'doc', rec })}
                  onAddOnDate={(date) => setView({ kind: 'form', editing: null, date })}
                />
              ) : (
                <HireByName records={records} onOpen={(rec) => setView({ kind: 'doc', rec })} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
