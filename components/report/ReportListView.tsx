'use client';

import { useMemo, useState } from 'react';
import { SITES } from '@/lib/report/data';
import { useReport } from '@/lib/report/useReport';
import { overallOf } from '@/lib/report/status';
import SiteRow from './SiteRow';
import ReportMap from './ReportMap';
import ReportSheet from './ReportSheet';

type Filter = 'all' | 'none' | 'wip' | 'done' | 'week' | 'next';

export default function ReportListView() {
  const { loading, get, update } = useReport();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [area, setArea] = useState<string>('all');
  const [showSheet, setShowSheet] = useState(false);

  const areas = useMemo(() => Array.from(new Set(SITES.map((s) => s.area))), []);
  const doneCount = useMemo(() => SITES.filter((s) => get(s.workNo).done).length, [get]);

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return SITES.filter((s) => {
      if (area !== 'all' && s.area !== area) return false;
      const p = get(s.workNo);
      const ov = overallOf(p);
      if (filter === 'none' && ov !== 'none') return false;
      if (filter === 'wip' && !(ov === 'wip' || ov === 'weeded' || ov === 'sheet')) return false;
      if (filter === 'done' && !p.done) return false;
      if (filter === 'week' && !p.thisWeek) return false;
      if (filter === 'next' && !p.nextWeek) return false;
      if (!kw) return true;
      return (
        s.workNo.toLowerCase().includes(kw) ||
        s.name.toLowerCase().includes(kw) ||
        s.address.toLowerCase().includes(kw)
      );
    });
  }, [q, filter, area, get]);

  const renderKey = useMemo(
    () =>
      shown
        .map((s) => {
          const p = get(s.workNo);
          return s.workNo + p.weeding + p.sheet + (p.done ? '1' : '0');
        })
        .join(','),
    [shown, get],
  );

  const pct = Math.round((doneCount / SITES.length) * 100);
  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: `すべて ${SITES.length}` },
    { key: 'none', label: '未着手' },
    { key: 'wip', label: '作業中' },
    { key: 'done', label: `施工完了 ${doneCount}` },
    { key: 'week', label: '今週' },
    { key: 'next', label: '次週' },
  ];

  return (
    <div className="space-y-3 pb-24">
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
          placeholder="工番・記号(WEST-L-641)・住所で検索"
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

      {/* エリア */}
      <div className="flex items-center gap-2">
        <select value={area} onChange={(e) => setArea(e.target.value)} className="input flex-1 py-2 text-sm">
          <option value="all">エリア（すべて）</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
          <button
            onClick={() => setMode('list')}
            className={`px-3 py-2 text-xs font-bold ${mode === 'list' ? 'bg-brand-primary text-white' : 'text-slate-500'}`}
          >
            一覧
          </button>
          <button
            onClick={() => setMode('map')}
            className={`px-3 py-2 text-xs font-bold ${mode === 'map' ? 'bg-brand-primary text-white' : 'text-slate-500'}`}
          >
            地図
          </button>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === c.key ? 'bg-brand-primary text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-black/40">読み込み中…</p>
      ) : mode === 'map' ? (
        <ReportMap sites={shown} get={get} renderKey={renderKey} />
      ) : (
        <>
          <p className="text-xs text-slate-400">{shown.length}件を表示</p>
          <div className="space-y-2">
            {shown.map((s) => (
              <SiteRow key={s.workNo} site={s} p={get(s.workNo)} onChange={(patch) => update(s.workNo, patch)} />
            ))}
            {shown.length === 0 && (
              <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50">
                該当する現場がありません。
              </p>
            )}
          </div>
        </>
      )}

      {/* 報告作成（固定ボタン） */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-[560px] px-4 pb-4">
          <button
            onClick={() => setShowSheet(true)}
            className="pointer-events-auto w-full rounded-xl bg-brand-accent py-3.5 text-sm font-black text-white shadow-lg shadow-brand-accent/30"
          >
            📋 今週の報告を作成（LINE共有）
          </button>
        </div>
      </div>

      {showSheet && <ReportSheet sites={SITES} get={get} onClose={() => setShowSheet(false)} />}
    </div>
  );
}
