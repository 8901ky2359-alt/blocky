'use client';

import { useMemo, useState } from 'react';
import { SITES } from '@/lib/list/data';
import { useSites } from '@/lib/list/useSites';
import SiteCard from './SiteCard';
import SiteMap from './SiteMap';

type Filter = 'all' | 'todo' | 'done' | 'priority';

export default function SiteListView() {
  const { loading, getState, update } = useSites();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<'list' | 'map'>('list');

  const doneCount = useMemo(
    () => SITES.filter((s) => getState(s.workNo).done).length,
    [getState],
  );

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return SITES.filter((s) => {
      const st = getState(s.workNo);
      if (filter === 'todo' && st.done) return false;
      if (filter === 'done' && !st.done) return false;
      if (filter === 'priority' && !s.priority) return false;
      if (!kw) return true;
      return (
        s.workNo.toLowerCase().includes(kw) ||
        s.name.toLowerCase().includes(kw) ||
        s.address.toLowerCase().includes(kw)
      );
    });
  }, [q, filter, getState]);

  function toggleDone(workNo: string) {
    const st = getState(workNo);
    update(workNo, { done: !st.done, doneAt: !st.done ? Date.now() : undefined });
  }

  function addPhoto(workNo: string, side: 'before' | 'after', url: string) {
    const st = getState(workNo);
    update(workNo, { [side]: [...st[side], url] });
  }

  function removePhoto(workNo: string, side: 'before' | 'after', index: number) {
    const st = getState(workNo);
    update(workNo, { [side]: st[side].filter((_, i) => i !== index) });
  }

  const pct = Math.round((doneCount / SITES.length) * 100);

  // 地図のピン再描画キー（完了状態・表示件数が変わったら更新）
  const renderKey = useMemo(
    () => shown.map((s) => s.workNo + (getState(s.workNo).done ? '1' : '0')).join(','),
    [shown, getState],
  );

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: `すべて ${SITES.length}` },
    { key: 'todo', label: `未完了 ${SITES.length - doneCount}` },
    { key: 'done', label: `完了 ${doneCount}` },
    { key: 'priority', label: '優先' },
  ];

  return (
    <div className="space-y-3 pb-4">
      {/* 進捗 */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold text-slate-800">防草シート施工リスト</h2>
          <span className="text-sm font-bold text-emerald-600">
            {doneCount}
            <span className="text-slate-400"> / {SITES.length} 完了</span>
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 検索 */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="工番・物件名・住所で検索"
          className="input pl-9"
          inputMode="search"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-label="クリア"
          >
            ×
          </button>
        )}
      </div>

      {/* フィルタ＋リスト/地図切替 */}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                filter === c.key
                  ? 'bg-brand-primary text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
          <button
            onClick={() => setMode('list')}
            className={`px-2.5 py-1.5 text-xs font-bold ${mode === 'list' ? 'bg-brand-primary text-white' : 'text-slate-500'}`}
          >
            一覧
          </button>
          <button
            onClick={() => setMode('map')}
            className={`px-2.5 py-1.5 text-xs font-bold ${mode === 'map' ? 'bg-brand-primary text-white' : 'text-slate-500'}`}
          >
            地図
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-black/40">読み込み中…</p>
      ) : mode === 'map' ? (
        <SiteMap sites={shown} isDone={(w) => getState(w).done} renderKey={renderKey} />
      ) : (
        <>
          <p className="text-xs text-slate-400">{shown.length}件を表示</p>
          <div className="space-y-2">
            {shown.map((s) => (
              <SiteCard
                key={s.workNo}
                site={s}
                state={getState(s.workNo)}
                onToggleDone={() => toggleDone(s.workNo)}
                onAddPhoto={(side, url) => addPhoto(s.workNo, side, url)}
                onRemovePhoto={(side, i) => removePhoto(s.workNo, side, i)}
              />
            ))}
            {shown.length === 0 && (
              <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50">
                該当する現場がありません。
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
