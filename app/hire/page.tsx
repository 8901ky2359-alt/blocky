'use client';

import { useCallback, useEffect, useState } from 'react';
import { HireRecord } from '@/lib/hire/types';
import { listHire, putHire, deleteHire } from '@/lib/hire/db';
import HireForm from '@/components/hire/HireForm';
import HireDoc from '@/components/hire/HireDoc';
import PasswordGate from '@/components/PasswordGate';

type View = { kind: 'list' } | { kind: 'form'; editing?: HireRecord | null } | { kind: 'doc'; rec: HireRecord };

export default function HirePage() {
  const [records, setRecords] = useState<HireRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: 'list' });

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
            <HireForm editing={view.editing} onSave={save} onCancel={() => setView({ kind: 'list' })} />
          ) : view.kind === 'doc' ? (
            <HireDoc
              rec={records.find((r) => r.id === view.rec.id) ?? view.rec}
              onEdit={() => setView({ kind: 'form', editing: view.rec })}
              onDelete={() => remove(view.rec.id)}
              onBack={() => setView({ kind: 'list' })}
            />
          ) : (
            <HireList records={records} onOpen={(rec) => setView({ kind: 'doc', rec })} onNew={() => setView({ kind: 'form', editing: null })} />
          )}
        </main>
      </div>
    </div>
   </PasswordGate>
  );
}

function HireList({
  records,
  onOpen,
  onNew,
}: {
  records: HireRecord[];
  onOpen: (rec: HireRecord) => void;
  onNew: () => void;
}) {
  if (records.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-black/50">作業依頼はまだありません。</p>
        <button onClick={onNew} className="mt-4 rounded-xl bg-brand-primary px-5 py-3 font-bold text-white">
          ＋ 作業依頼を作成
        </button>
        <p className="mx-auto mt-4 max-w-xs text-[11px] leading-relaxed text-black/40">
          作業者・作業内容は登録して繰り返し使えます。署名（発注者・作業者）も記録できます。
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {records.map((r) => (
        <button
          key={r.id}
          onClick={() => onOpen(r)}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-black text-brand-primary">
            {r.worker.slice(0, 1) || '作'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-800">{r.worker || '（作業者未記入）'}</span>
            <span className="block truncate text-xs text-slate-500">{r.workContent || '作業内容なし'}</span>
            <span className="block text-[11px] text-slate-400">
              {r.dateStart}
              {r.dateEnd && r.dateEnd !== r.dateStart ? ` 〜 ${r.dateEnd}` : ''}・{r.rate}
            </span>
          </span>
          <span className="shrink-0 text-2xl text-slate-300">›</span>
        </button>
      ))}
    </div>
  );
}
