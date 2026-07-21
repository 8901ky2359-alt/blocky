'use client';

import { useMemo, useState } from 'react';
import { useEntries } from '@/lib/useEntries';
import { exportJson, importJson } from '@/lib/db';
import { Entry } from '@/lib/types';
import { todayStr } from '@/lib/format';
import { generateCode, getSpace, setSpace, type SyncResult } from '@/lib/sync';
import BottomNav, { Tab } from '@/components/BottomNav';
import SideNav from '@/components/SideNav';
import CalendarView from '@/components/CalendarView';
import AddView from '@/components/AddView';
import SummaryView from '@/components/SummaryView';
import MapView from '@/components/MapView';
import ReportView from '@/components/ReportView';

type View = Tab | 'add';

export default function Home() {
  const { entries, loading, syncing, save, remove, sync } = useEntries();
  const [view, setView] = useState<View>('calendar');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [addDate, setAddDate] = useState<string>(todayStr());
  const [showBackup, setShowBackup] = useState(false);

  // 現場名の候補（最近使った順・住所つき）
  const knownSites = useMemo(() => {
    const map = new Map<
      string,
      { site: string; address?: string; lat?: number; lng?: number; t: number; addrT: number }
    >();
    for (const e of entries) {
      if (!e.site) continue;
      const t = e.updatedAt ?? e.createdAt ?? 0;
      const cur = map.get(e.site) ?? { site: e.site, t: -1, addrT: -1 };
      if (t > cur.t) cur.t = t; // 並び順は最新の使用時刻
      // 住所は「住所が入っている最も新しい記録」から採用
      if (e.address && t > cur.addrT) {
        cur.address = e.address;
        cur.lat = e.lat;
        cur.lng = e.lng;
        cur.addrT = t;
      }
      map.set(e.site, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.t - a.t)
      .map(({ site, address, lat, lng }) => ({ site, address, lat, lng }));
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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-emerald-50 via-neutral-100 to-neutral-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px]">
        {/* PC用サイドナビ（スマホでは非表示） */}
        <SideNav
          tab={view}
          onChange={(t) => setView(t)}
          onAdd={() => goAdd()}
          onBackup={() => setShowBackup(true)}
        />

        {/* アプリ本体（スマホ幅のカード。PCでは中央にフローティング） */}
        <div className="relative mx-auto min-h-screen w-full max-w-[520px] overflow-x-hidden bg-brand-bg shadow-xl md:my-8 md:min-h-[calc(100vh-4rem)] md:self-start md:rounded-3xl md:shadow-2xl md:ring-1 md:ring-black/5">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-brand-bg/95 px-4 py-3 backdrop-blur md:hidden">
            <h1 className="text-base font-bold text-brand-primary">🌿 現場家計簿</h1>
            <button onClick={() => setShowBackup(true)} className="text-xl" aria-label="バックアップ">
              ⚙
            </button>
          </header>

          <main className="w-full px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-7">
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
      </div>

      {/* 記録追加のフローティングボタン（＋）＝スマホのみ */}
      {view !== 'add' && (
        <div className="pointer-events-none fixed inset-0 z-20 md:hidden">
          <div className="relative mx-auto h-full max-w-[520px]">
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

      {showBackup && (
        <BackupPanel
          onClose={() => setShowBackup(false)}
          onImported={() => location.reload()}
          onSync={sync}
          syncing={syncing}
        />
      )}
    </div>
  );
}

function BackupPanel({
  onClose,
  onImported,
  onSync,
  syncing,
}: {
  onClose: () => void;
  onImported: () => void;
  onSync: () => Promise<SyncResult>;
  syncing: boolean;
}) {
  const [code, setCode] = useState(getSpace());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  function applyCode() {
    setSpace(code.trim());
    setSyncMsg(code.trim() ? '同期コードを設定しました' : '同期をオフにしました');
  }

  async function doSyncNow() {
    setSpace(code.trim());
    if (!code.trim()) {
      setSyncMsg('同期コードを入力してください');
      return;
    }
    const r = await onSync();
    if (r.ok) setSyncMsg(`同期しました（${r.count}件）`);
    else if (r.error === 'offline') setSyncMsg('ネットに接続できませんでした');
    else setSyncMsg('同期できませんでした');
  }

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

        {/* クラウド同期 */}
        <h3 className="mb-1 text-lg font-bold">☁ クラウド同期（スマホ⇔PC）</h3>
        <p className="mb-2 text-sm text-black/50">
          同じ「同期コード」を各端末に設定すると、記録が自動で共有されます（写真は各端末に残ります）。
        </p>
        <div className="mb-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="同期コード（例: genba-ab12cd）"
            className="input flex-1"
          />
          <button
            onClick={() => setCode(generateCode())}
            className="shrink-0 rounded-xl border border-black/15 px-3 text-sm font-semibold text-black/60"
          >
            新規作成
          </button>
        </div>
        <div className="mb-1 grid grid-cols-2 gap-2">
          <button onClick={applyCode} className="rounded-xl border border-black/15 py-2.5 text-sm font-semibold">
            コードを設定
          </button>
          <button
            onClick={doSyncNow}
            disabled={syncing}
            className="rounded-xl bg-brand-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {syncing ? '同期中…' : '今すぐ同期'}
          </button>
        </div>
        {syncMsg && <p className="mb-1 text-center text-xs text-brand-primary">{syncMsg}</p>}
        <p className="mb-4 text-[11px] leading-relaxed text-black/40">
          ※ 他の端末では、同じコードを入れて「今すぐ同期」すると同じデータが表示されます。コードは他人に教えないでください。
        </p>

        <div className="my-3 border-t border-black/10" />

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
