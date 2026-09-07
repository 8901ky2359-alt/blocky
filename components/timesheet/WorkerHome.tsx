'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimesheetEntry, TimesheetUser } from '@/lib/timesheet/types';
import { createEntry, deleteEntry, listEntries, updateEntry, ApiError } from '@/lib/timesheet/api';
import { clearSession } from '@/lib/timesheet/auth';
import EntryCalendar from './EntryCalendar';
import EntryForm from './EntryForm';
import ExportPanel from './ExportPanel';

// 使った順（新しい方が先）で重複を除いた値の一覧を作る
function recentUnique<T>(entries: TimesheetEntry[], pick: (e: TimesheetEntry) => T | null | undefined): T[] {
  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const seen = new Set<T>();
  const out: T[] = [];
  for (const e of sorted) {
    const v = pick(e);
    if (v == null || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

type View = { kind: 'calendar' } | { kind: 'form'; editing?: TimesheetEntry | null; date: string } | { kind: 'detail'; entry: TimesheetEntry };

export default function WorkerHome({ user }: { user: TimesheetUser }) {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ kind: 'calendar' });
  const [showExport, setShowExport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { entries } = await listEntries();
      setEntries(entries);
    } catch {
      setErr('読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 現場名・作業内容・金額は、自分の過去の入力から候補を作る（新しく使った順）
  const knownSites = useMemo(() => recentUnique(entries, (e) => e.site || null), [entries]);
  const knownWorkContents = useMemo(() => recentUnique(entries, (e) => e.workContent || null), [entries]);
  const knownAmounts = useMemo(() => recentUnique(entries, (e) => (e.amount > 0 ? e.amount : null)), [entries]);

  async function save(input: Parameters<typeof createEntry>[0]) {
    setBusy(true);
    setErr('');
    try {
      if (view.kind === 'form' && view.editing) {
        await updateEntry(view.editing.id, input);
      } else {
        await createEntry(input);
      }
      await refresh();
      setView({ kind: 'calendar' });
    } catch (e) {
      setErr(e instanceof ApiError && e.code === 'forbidden' ? '承認済みのため編集できません' : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: TimesheetEntry) {
    if (!confirm('この記録を削除しますか？')) return;
    try {
      await deleteEntry(entry.id);
      await refresh();
      setView({ kind: 'calendar' });
    } catch {
      setErr(entry.status === 'approved' ? '承認済みのため削除できません' : '削除に失敗しました');
    }
  }

  return (
    <div className="min-h-[100dvh] hud-bg">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[520px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setView({ kind: 'calendar' })}
            className="flex items-center gap-2"
            aria-label="カレンダーに戻る"
          >
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-primary text-xs font-black text-white">
              日
            </span>
            <span className="text-base font-bold tracking-tight text-brand-primary">作業日報</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{user.name} さん</span>
            <button onClick={() => setShowExport(true)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
              📄 出力
            </button>
            <button
              onClick={() => {
                clearSession();
                location.reload();
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
            >
              ログアウト
            </button>
          </div>
        </header>

        <main className="w-full px-4 pb-16 pt-4">
          {err && <p className="mb-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-500">{err}</p>}
          {loading ? (
            <p className="py-20 text-center text-black/40">読み込み中…</p>
          ) : view.kind === 'form' ? (
            <EntryForm
              editing={view.editing}
              defaultDate={view.date}
              knownSites={knownSites}
              knownWorkContents={knownWorkContents}
              knownAmounts={knownAmounts}
              onSave={save}
              onCancel={() => setView({ kind: 'calendar' })}
              busy={busy}
            />
          ) : view.kind === 'detail' ? (
            <EntryDetail
              entry={view.entry}
              onEdit={() => setView({ kind: 'form', editing: view.entry, date: view.entry.date })}
              onDelete={() => remove(view.entry)}
              onBack={() => setView({ kind: 'calendar' })}
            />
          ) : (
            <EntryCalendar
              entries={entries}
              onAddOnDate={(date) => setView({ kind: 'form', editing: null, date })}
              onOpen={(entry) => setView({ kind: 'detail', entry })}
            />
          )}
        </main>
      </div>

      {showExport && <ExportPanel isAdmin={false} onClose={() => setShowExport(false)} />}
    </div>
  );
}

function EntryDetail({
  entry,
  onEdit,
  onDelete,
  onBack,
}: {
  entry: TimesheetEntry;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm text-slate-400">
        ‹ カレンダーへ戻る
      </button>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <span
          className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
            entry.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {entry.status === 'approved' ? '承認済み' : '承認待ち'}
        </span>
        <h2 className="text-lg font-bold text-slate-800">{entry.site}</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.workContent || '（作業内容なし）'}</p>
        <p className="mt-2 text-xl font-bold text-blue-600">¥{entry.amount.toLocaleString('ja-JP')}</p>
        {entry.memo && <p className="mt-2 text-xs text-slate-500">メモ: {entry.memo}</p>}
        {entry.editedByAdmin && entry.adminMemo && (
          <p className="mt-2 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-700">
            ✎ 管理者による修正: {entry.adminMemo}
          </p>
        )}
      </div>
      {entry.status === 'pending' ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onEdit} className="rounded-xl border border-slate-300 py-3 font-semibold text-slate-600">
            編集する
          </button>
          <button onClick={onDelete} className="rounded-xl border border-red-200 py-3 font-semibold text-red-500">
            削除する
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-slate-400">承認済みの記録は編集・削除できません</p>
      )}
    </div>
  );
}
