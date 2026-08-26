'use client';

import { useCallback, useEffect, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { listHire, putHire, deleteHire } from '@/lib/hire/db';
import { todayStr } from '@/lib/format';
import HireForm from '@/components/hire/HireForm';
import HireDoc from '@/components/hire/HireDoc';
import HireCalendar from '@/components/hire/HireCalendar';
import HireByName from '@/components/hire/HireByName';
import PasswordGate from '@/components/PasswordGate';

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

  useEffect(() => {
    refresh();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [refresh]);

  async function save(rec: HireRecord) {
    await putHire(rec);
    await refresh();
    setView({ kind: 'doc', rec });
  }
  async function remove(id: string) {
    await deleteHire(id);
    await refresh();
    setView({ kind: 'list' });
  }

  return (
   <PasswordGate title="雇用・作業依頼">
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-100 to-slate-300">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[520px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <a href="/" className="flex items-center gap-2" aria-label="ホームに戻る">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-black text-white">
              雇
            </span>
            <span className="text-base font-bold tracking-tight text-brand-primary">雇用・作業依頼</span>
            <span className="text-xs text-slate-400">／ホーム</span>
          </a>
          {view.kind === 'list' && (
            <button
              onClick={() => setView({ kind: 'form', editing: null })}
              className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-bold text-white"
            >
              ＋作成
            </button>
          )}
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
   </PasswordGate>
  );
}
