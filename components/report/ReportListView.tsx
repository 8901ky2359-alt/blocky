'use client';

import { useCallback, useMemo, useState } from 'react';
import { SITES } from '@/lib/report/data';
import { useReport } from '@/lib/report/useReport';
import {
  LAND_LABELS,
  LandRange,
  SORT_LABELS,
  SortKey,
  buildSiteShare,
  byProgress,
  inLandRange,
  isReportTarget,
  leadNames,
  sorterOf,
  typeOf,
} from '@/lib/report/status';
import { INSTRUCTION_PDFS } from '@/lib/report/instructionPdfs';
import { stageOf } from '@/lib/report/types';
import SiteRow from './SiteRow';
import ReportMap from './ReportMap';
import ReportSheet from './ReportSheet';

type Filter = 'all' | 'none' | 'target' | 'done' | 'next';
type Flag = 'priority' | 'key' | 'pdf' | 'sheet' | 'weedOnly';
const FLAG_LABELS: Record<Flag, string> = {
  priority: '優先',
  key: '鍵あり',
  pdf: '資料あり',
  sheet: 'シートあり',
  weedOnly: '除草のみ',
};

export default function ReportListView() {
  const { loading, get, update } = useReport();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [area, setArea] = useState<string>('all');
  const [lead, setLead] = useState<string>('all'); // 担当者で絞り込み
  const [sort, setSort] = useState<SortKey>('progress');
  const [land, setLand] = useState<LandRange>('all');
  // その他の条件（押すたびに付け外し）
  const [flags, setFlags] = useState<Flag[]>([]);
  const toggleFlag = (f: Flag) => setFlags((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));
  const narrowed = area !== 'all' || lead !== 'all' || land !== 'all' || flags.length > 0 || sort !== 'progress';
  const resetNarrow = () => {
    setArea('all');
    setLead('all');
    setLand('all');
    setFlags([]);
    setSort('progress');
  };
  const [showSheet, setShowSheet] = useState(false);
  // LINEで共有する現場（◯で選ぶ）。絞り込みを変えても選んだままにする
  const [picked, setPicked] = useState<string[]>([]);
  const [showShare, setShowShare] = useState(false);
  const togglePick = (workNo: string) =>
    setPicked((p) => (p.includes(workNo) ? p.filter((w) => w !== workNo) : [...p, workNo]));
  // 選んだ現場（一覧と同じ並び順）
  const pickedSites = useMemo(() => SITES.filter((s) => picked.includes(s.workNo)).sort(byProgress(get)), [picked, get]);
  const buildShare = useCallback(
    () => buildSiteShare(pickedSites, get, (w) => (INSTRUCTION_PDFS[w] ? window.location.origin + INSTRUCTION_PDFS[w] : undefined)),
    [pickedSites, get],
  );

  const areas = useMemo(() => Array.from(new Set(SITES.map((s) => s.area))), []);
  const leads = useMemo(() => leadNames(SITES, get), [get]);
  const doneCount = useMemo(() => SITES.filter((s) => get(s.workNo).done).length, [get]);
  const targetCount = useMemo(() => SITES.filter((s) => isReportTarget(get(s.workNo))).length, [get]);

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return SITES.filter((s) => {
      if (area !== 'all' && s.area !== area) return false;
      const p = get(s.workNo);
      if (lead !== 'all' && p.weedLead !== lead && p.sheetLead !== lead) return false;
      if (!inLandRange(s, land)) return false;
      if (flags.includes('priority') && !s.priority) return false;
      if (flags.includes('key') && !s.hasKey) return false;
      if (flags.includes('pdf') && !INSTRUCTION_PDFS[s.workNo]) return false;
      if (flags.includes('sheet') && typeOf(s, p) !== 'シートあり') return false;
      if (flags.includes('weedOnly') && typeOf(s, p) !== '除草のみ') return false;
      if (filter === 'none' && stageOf(p) !== 'none') return false;
      if (filter === 'target' && !isReportTarget(p)) return false;
      if (filter === 'done' && !p.done) return false;
      if (filter === 'next' && !p.nextWeek) return false;
      if (!kw) return true;
      return (
        s.workNo.toLowerCase().includes(kw) ||
        s.name.toLowerCase().includes(kw) ||
        s.address.toLowerCase().includes(kw) ||
        !!p.weedLead?.toLowerCase().includes(kw) ||
        !!p.sheetLead?.toLowerCase().includes(kw)
      );
    }).sort(sorterOf(sort, get));
  }, [q, filter, area, lead, land, flags, sort, get]);
  // 表示中の広さの合計（不明は数に入れず、件数だけ出す）
  const shownLand = shown.reduce((n, s) => n + (s.land > 0 ? s.land : 0), 0);
  const unknownLand = shown.filter((s) => !(s.land > 0)).length;

  const renderKey = useMemo(
    () =>
      shown
        .map((s) => {
          const p = get(s.workNo);
          return s.workNo + stageOf(p) + (p.siteType ?? '');
        })
        .join(','),
    [shown, get],
  );

  const pct = Math.round((doneCount / SITES.length) * 100);
  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: `すべて ${SITES.length}` },
    { key: 'none', label: '未着手' },
    { key: 'target', label: `報告対象 ${targetCount}` },
    { key: 'done', label: `完工 ${doneCount}` },
    { key: 'next', label: '次週予定' },
  ];

  return (
    <div className={`space-y-3 ${picked.length > 0 ? 'pb-40' : 'pb-24'}`}>
      {/* 進捗 */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
        {/* エリアと担当者の絞り込み（担当者は誰かが入力してから出る） */}
        <div className={`grid min-w-0 flex-1 gap-2 ${leads.length > 0 ? 'grid-cols-2' : ''}`}>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="input py-2 text-sm">
            <option value="all">全エリア</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {leads.length > 0 && (
            <select value={lead} onChange={(e) => setLead(e.target.value)} className="input py-2 text-sm">
              <option value="all">全担当者</option>
              {leads.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
          <button
            onClick={() => setMode('list')}
            className={`px-3 py-2 text-xs font-bold ${mode === 'list' ? 'bg-fw-green text-white' : 'text-slate-500'}`}
          >
            一覧
          </button>
          <button
            onClick={() => setMode('map')}
            className={`px-3 py-2 text-xs font-bold ${mode === 'map' ? 'bg-fw-green text-white' : 'text-slate-500'}`}
          >
            地図
          </button>
        </div>
      </div>

      {/* 並べ替え・広さ */}
      <div className="grid grid-cols-2 gap-2">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input py-2 text-sm" aria-label="並べ替え">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              並び：{SORT_LABELS[k]}
            </option>
          ))}
        </select>
        <select value={land} onChange={(e) => setLand(e.target.value as LandRange)} className="input py-2 text-sm" aria-label="広さで絞り込み">
          {(Object.keys(LAND_LABELS) as LandRange[]).map((k) => (
            <option key={k} value={k}>
              {LAND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* その他の条件 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(FLAG_LABELS) as Flag[]).map((f) => (
          <button
            key={f}
            onClick={() => toggleFlag(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              flags.includes(f) ? 'bg-slate-700 text-white' : 'border border-dashed border-slate-300 bg-white text-slate-500'
            }`}
          >
            {flags.includes(f) ? '✓ ' : ''}
            {FLAG_LABELS[f]}
          </button>
        ))}
        {narrowed && (
          <button onClick={resetNarrow} className="shrink-0 px-2 py-1.5 text-xs font-bold text-fw-green">
            条件をリセット
          </button>
        )}
      </div>

      {/* フィルタ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === c.key ? 'bg-fw-green text-white' : 'border border-slate-200 bg-white text-slate-600'
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
          <p className="text-xs text-slate-400">
            <b className="text-slate-600">{shown.length}件</b>を表示 ・ 広さ合計 {Math.round(shownLand).toLocaleString('ja-JP')}㎡
            {unknownLand > 0 && `（不明${unknownLand}件）`} ・ 左の◯で選ぶとLINEで共有できます
          </p>
          <div className="space-y-2">
            {shown.map((s) => (
              <SiteRow
                key={s.workNo}
                site={s}
                p={get(s.workNo)}
                onChange={(patch) => update(s.workNo, patch)}
                selected={picked.includes(s.workNo)}
                onToggleSelect={() => togglePick(s.workNo)}
                leadOptions={leads}
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

      {/* 報告作成（固定ボタン） */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-[560px] px-4 pb-4">
          {picked.length > 0 ? (
            <div className="pointer-events-auto grid gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="min-w-0 truncate text-slate-600">
                  <b className="text-slate-800">{picked.length}件を選択中</b> ・ {pickedSites.map((s) => s.name).join('、')}
                </span>
                <button onClick={() => setPicked([])} className="shrink-0 pl-2 font-bold text-fw-green">
                  選択を解除
                </button>
              </div>
              <button
                onClick={() => setShowShare(true)}
                className="w-full rounded-xl bg-fw-green py-3 text-sm font-black text-white"
              >
                📤 選んだ{picked.length}件をLINEで共有
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSheet(true)}
              className="pointer-events-auto w-full rounded-xl bg-fw-green py-3.5 text-sm font-black text-white shadow-lg shadow-fw-green/30"
            >
              📋 進捗報告を作成（LINE共有）
            </button>
          )}
        </div>
      </div>

      {showSheet && <ReportSheet sites={SITES} get={get} onClose={() => setShowSheet(false)} />}
      {showShare && (
        <ReportSheet
          sites={pickedSites}
          get={get}
          onClose={() => setShowShare(false)}
          title={`📤 選んだ${pickedSites.length}件を共有`}
          description="選んだ現場の名前・状況・住所・地図（と資料）をまとめます。送る前に下の文章をそのまま書き換えられます。"
          build={buildShare}
        />
      )}
    </div>
  );
}
