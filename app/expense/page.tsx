'use client';

import { useEffect, useState } from 'react';
import { useEntries } from '@/lib/useEntries';
import { Entry } from '@/lib/types';
import { todayStr } from '@/lib/format';
import ExpenseCalendar from '@/components/expense/ExpenseCalendar';
import ExpenseAddView from '@/components/expense/ExpenseAddView';
import ExpenseReport from '@/components/expense/ExpenseReport';

type View = 'calendar' | 'report' | 'add';

export default function ExpensePage() {
  const { entries, loading, save, remove } = useEntries();
  const [view, setView] = useState<View>('calendar');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [addDate, setAddDate] = useState<string>(todayStr());

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  function goAdd(date?: string) {
    setEditing(null);
    setAddDate(date ?? todayStr());
    setView('add');
  }
  function goEdit(e: Entry) {
    setEditing(e);
    setView('add');
  }
  function afterSave() {
    setEditing(null);
    setView('calendar');
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-100 to-slate-300">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[520px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <a href="/" className="flex items-center gap-2" aria-label="ホームに戻る">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-red-600 text-xs font-black text-white">
              経
            </span>
            <span className="text-base font-bold tracking-tight text-brand-primary">経費</span>
            <span className="text-xs text-slate-400">／ホーム</span>
          </a>
        </header>

        <main className="w-full px-4 pb-28 pt-4">
          {loading ? (
            <p className="py-20 text-center text-black/40">読み込み中…</p>
          ) : view === 'add' ? (
            <ExpenseAddView
              editing={editing}
              defaultDate={addDate}
              onSave={save}
              onSaved={afterSave}
              onCancel={afterSave}
            />
          ) : view === 'report' ? (
            <ExpenseReport entries={entries} />
          ) : (
            <ExpenseCalendar entries={entries} onAddOnDate={goAdd} onEdit={goEdit} onDelete={remove} />
          )}
        </main>

        {/* 追加ボタン（＋） */}
        {view !== 'add' && (
          <div className="pointer-events-none fixed inset-0 z-20">
            <div className="relative mx-auto h-full max-w-[520px]">
              <button
                onClick={() => goAdd()}
                aria-label="経費を記録"
                className="pointer-events-auto absolute bottom-[76px] right-4 grid h-14 w-14 place-items-center rounded-full bg-red-600 text-3xl leading-none text-white shadow-lg"
              >
                ＋
              </button>
            </div>
          </div>
        )}

        {/* 下部ナビ */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur">
          <div className="mx-auto grid max-w-[520px] grid-cols-2">
            {([
              { key: 'calendar', label: 'カレンダー', icon: '📅' },
              { key: 'report', label: '報告', icon: '📄' },
            ] as { key: View; label: string; icon: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  view === t.key ? 'text-brand-primary' : 'text-black/50'
                }`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full text-lg ${view === t.key ? 'bg-brand-soft' : ''}`}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
