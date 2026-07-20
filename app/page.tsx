'use client';

import { useMemo, useState } from 'react';
import { useEntries } from '@/lib/useEntries';
import { exportJson, importJson } from '@/lib/db';
import { Entry } from '@/lib/types';
import { todayStr } from '@/lib/format';
import BottomNav, { Tab } from '@/components/BottomNav';
import CalendarView from '@/components/CalendarView';
import AddView from '@/components/AddView';
import SummaryView from '@/components/SummaryView';
import MapView from '@/components/MapView';
import ReportView from '@/components/ReportView';

type View = Tab | 'add';

export default function Home() {
  const { entries, loading, save, remove } = useEntries();
  const [view, setView] = useState<View>('calendar');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [addDate, setAddDate] = useState<string>(todayStr());
  const [showBackup, setShowBackup] = useState(false);

  const knownSites = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.site) set.add(e.site);
    return [...set];
  }, [entries]);

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
    <div className="min-h-screen bg-neutral-200">
      {/* モバイル固定フレーム（PCでも中央にスマホ幅で表示） */}
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-brand-bg shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-brand-bg/95 px-4 py-3 backdrop-blur">
          <h1 className="text-base font-bold text-brand-primary">🌿 現場家計簿</h1>
          <button onClick={() => setShowBackup(true)} className="text-xl" aria-label="バックアップ">
            ⚙
          </button>
        </header>

        <main className="w-full px-4 pb-28 pt-4">
          {loading ? (
            <p className="py-20 text-center text-black/40">読み込み中…</p>
          ) : (
            <>
              {view === 'calendar' && (
                <CalendarView entries={entries} onAddOnDate={goAdd} onEdit={goEdit} onDelete={remove} />
              )}
              {view === 'summary' && <SummaryView entries={entries} />}
              {view === 'add' && (
                <AddView
                  editing={editing}
                  defaultDate={addDate}
                  knownSites={knownSites}
                  onSave={save}
                  onSaved={afterSave}
                  onCancel={afterSave}
                />
              )}
              {view === 'map' && <MapView entries={entries} />}
              {view === 'report' && <ReportView entries={entries} />}
            </>
          )}
        </main>
      </div>

      {/* 記録追加のフローティングボタン（＋） */}
      {view !== 'add' && (
        <div className="pointer-events-none fixed inset-0 z-20">
          <div className="relative mx-auto h-full max-w-[480px]">
            <button
              onClick={() => goAdd()}
              aria-label="記録する"
              className="pointer-events-auto absolute bottom-[76px] right-4 grid h-14 w-14 place-items-center rounded-full bg-brand-primary text-3xl leading-none text-white shadow-lg"
            >
              ＋
            </button>
          </div>
        </div>
      )}

      <BottomNav tab={view} onChange={(t) => setView(t)} />

      {showBackup && <BackupPanel onClose={() => setShowBackup(false)} onImported={() => location.reload()} />}
    </div>
  );
}

function BackupPanel({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  async function doExport() {
    const json = await exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genba-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    const text = await file.text();
    try {
      const n = await importJson(text);
      alert(`${n}件を読み込みました`);
      onImported();
    } catch {
      alert('読み込みに失敗しました');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] rounded-t-2xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/20" />
        <h3 className="mb-1 text-lg font-bold">バックアップ / 復元</h3>
        <p className="mb-4 text-sm text-black/50">
          データはこの端末内に保存されています。機種変更や万一に備え、ファイルに書き出して保管できます。
        </p>
        <button
          onClick={doExport}
          className="mb-2 w-full rounded-xl bg-brand-primary py-3 font-semibold text-white"
        >
          ⬇ バックアップを保存
        </button>
        <label className="block w-full rounded-xl border border-black/15 py-3 text-center font-semibold">
          ⬆ バックアップから復元
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
        </label>
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-black/50">
          閉じる
        </button>
      </div>
    </div>
  );
}
