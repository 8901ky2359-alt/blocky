'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimesheetEntry, TimesheetUser } from '@/lib/timesheet/types';
import { listEntries, listUsers } from '@/lib/timesheet/api';
import { clearSession } from '@/lib/timesheet/auth';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';
import ApprovalCard from './ApprovalCard';
import WorkerManage from './WorkerManage';
import ExportPanel from './ExportPanel';

type Tab = 'pending' | 'approved' | 'workers';

export default function AdminHome({ user }: { user: TimesheetUser }) {
  const [tab, setTab] = useState<Tab>('pending');
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [users, setUsers] = useState<TimesheetUser[]>([]);
  const [mKey, setMKey] = useState(currentMonthKey());
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);

  const refresh = useCallback(async () => {
    const [e, u] = await Promise.all([listEntries({ month: mKey }), listUsers()]);
    setEntries(e.entries);
    setUsers(u.users);
    setLoading(false);
  }, [mKey]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const pending = useMemo(() => entries.filter((e) => e.status === 'pending'), [entries]);
  const approved = useMemo(() => entries.filter((e) => e.status === 'approved'), [entries]);
  const approvedTotal = useMemo(() => approved.reduce((s, e) => s + e.amount, 0), [approved]);
  const byWorker = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of approved) map.set(e.userName || '', (map.get(e.userName || '') || 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [approved]);

  const workers = users.filter((u) => u.role === 'worker');

  return (
    <div className="min-h-[100dvh] hud-bg">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-[520px] bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button onClick={() => setTab('pending')} className="flex items-center gap-2" aria-label="承認待ち一覧に戻る">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-primary text-xs font-black text-white">
              管
            </span>
            <span className="text-base font-bold tracking-tight text-brand-primary">作業日報（管理画面）</span>
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
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="rounded-lg px-3 py-1 text-lg">
              ‹
            </button>
            <h2 className="text-lg font-bold">{formatJpMonth(mKey)}</h2>
            <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="rounded-lg px-3 py-1 text-lg">
              ›
            </button>
          </div>

          <div className="mb-4 rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-black/50">全体合計（承認済み）</span>
              <span className="text-lg font-bold text-blue-600">{yen(approvedTotal)}</span>
            </div>
            {byWorker.length > 0 && (
              <div className="space-y-1 border-t border-slate-100 pt-2">
                {byWorker.map(([name, total]) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{name || '（不明）'}</span>
                    <span className="font-semibold text-slate-700">{yen(total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3 flex justify-center">
            <div className="flex overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-bold">
              <button
                onClick={() => setTab('pending')}
                className={`px-3 py-1.5 ${tab === 'pending' ? 'bg-brand-accent text-white' : 'text-slate-500'}`}
              >
                承認待ち {pending.length > 0 && `(${pending.length})`}
              </button>
              <button
                onClick={() => setTab('approved')}
                className={`border-l border-slate-200 px-3 py-1.5 ${tab === 'approved' ? 'bg-brand-accent text-white' : 'text-slate-500'}`}
              >
                承認済み
              </button>
              <button
                onClick={() => setTab('workers')}
                className={`border-l border-slate-200 px-3 py-1.5 ${tab === 'workers' ? 'bg-brand-accent text-white' : 'text-slate-500'}`}
              >
                作業員管理
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-20 text-center text-black/40">読み込み中…</p>
          ) : tab === 'workers' ? (
            <WorkerManage users={users} onChanged={refresh} />
          ) : (
            <div className="space-y-2">
              {(tab === 'pending' ? pending : approved).length === 0 ? (
                <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
                  {tab === 'pending' ? '承認待ちの記録はありません' : 'この月の承認済み記録はありません'}
                </p>
              ) : (
                (tab === 'pending' ? pending : approved).map((e) => (
                  <ApprovalCard key={e.id} entry={e} onChanged={refresh} />
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {showExport && <ExportPanel isAdmin workers={workers} onClose={() => setShowExport(false)} />}
    </div>
  );
}
