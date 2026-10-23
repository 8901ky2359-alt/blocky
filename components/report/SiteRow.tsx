'use client';

import { useState } from 'react';
import { SiteSeed, SiteProgress, SiteType, Stage, stageOf, stagePatch } from '@/lib/report/types';
import { OVERALL_META, overallOf, statusLabel, isReportTarget, typeOf, mapsUrl, codeOf } from '@/lib/report/status';
import { INSTRUCTION_PDFS } from '@/lib/report/instructionPdfs';

export default function SiteRow({
  site,
  p,
  onChange,
}: {
  site: SiteSeed;
  p: SiteProgress;
  onChange: (patch: Partial<SiteProgress>) => void;
}) {
  const [open, setOpen] = useState(false);
  const type = typeOf(site, p);
  const ov = overallOf(p);
  const meta = OVERALL_META[ov];
  const label = statusLabel(type, p);
  const reportTarget = isReportTarget(p);
  const instructionUrl = INSTRUCTION_PDFS[site.workNo];
  const stage = stageOf(p);
  // 除草のみの現場は「除草完了」がそのまま完工
  const shownStage: Stage = type === '除草のみ' && stage === 'weeded' ? 'done' : stage;
  const hasCoords = !!(site.lat || site.lng);

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm ${
        stage === 'done' ? 'border-emerald-300' : reportTarget ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-800">{site.name}</span>
            {stage === 'done' && (
              <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                完工
              </span>
            )}
            {reportTarget && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                報告対象
              </span>
            )}
            {site.priority && (
              <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                優先
              </span>
            )}
            {instructionUrl && (
              <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                📄 資料あり
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            工番 {codeOf(site.workNo) || 'なし'}・{site.area}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">📍 {site.address}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: meta.color }}>
              {label}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
              {type === '除草のみ' ? '除草のみ' : '防草シートあり'}
            </span>
            {p.nextWeek && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700">次週</span>}
          </div>
        </button>
        {hasCoords && (
          <a
            href={mapsUrl(site.lat, site.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px] font-bold text-slate-600"
          >
            🗺<br />地図
          </a>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {/* 現場資料（PDF。指示書そのものの場合と、現場地図・範囲図など指示書の代わりになる
              資料の場合がある。Googleドライブに指示書という名前のファイルが無い現場が多いため、
              「指示書」と断定せず「資料」としている */}
          {instructionUrl && (
            <a
              href={instructionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-sky-300 bg-sky-50 py-2.5 text-center text-sm font-bold text-sky-700"
            >
              📄 現場資料を開く（PDF）
            </a>
          )}

          {/* 現場の種類 */}
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">現場の種類</p>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              {(['除草のみ', 'シートあり'] as SiteType[]).map((t, i) => (
                <button
                  key={t}
                  onClick={() => onChange({ siteType: t })}
                  className={`flex-1 py-2 text-[12px] font-bold ${i > 0 ? 'border-l border-slate-200' : ''} ${
                    type === t ? 'bg-fw-green text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {t === '除草のみ' ? '除草のみ（シートなし）' : '防草シートまで'}
                </button>
              ))}
            </div>
          </div>

          {/* 作業の段階（報告の区分になる） */}
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">作業の状況</p>
            <div className="grid grid-cols-2 gap-1.5">
              {stageOptions(type).map((o) => (
                <button
                  key={o.stage}
                  onClick={() => onChange(stagePatch(o.stage))}
                  className={`rounded-lg py-2.5 text-[13px] font-bold ${
                    shownStage === o.stage ? 'bg-fw-green text-white' : 'border border-slate-200 bg-white text-slate-600'
                  } ${o.stage === 'done' ? 'col-span-2' : ''}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
            <input
              type="checkbox"
              checked={!!p.bee}
              onChange={(e) => onChange({ bee: e.target.checked })}
              className="h-5 w-5 accent-amber-600"
            />
            <span className="text-sm font-bold text-slate-700">スズメバチの巣駆除も完了</span>
          </label>

          <p className="text-center text-[11px] text-slate-400">
            現在の状態：<span className="font-bold text-slate-600">{label}</span>
            {reportTarget && <span className="text-amber-600">／報告対象</span>}
          </p>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
            <input
              type="checkbox"
              checked={p.nextWeek}
              onChange={(e) => onChange({ nextWeek: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
            <span className="text-sm font-bold text-slate-700">次週予定に入れる</span>
          </label>

          {hasCoords && (
            <a
              href={mapsUrl(site.lat, site.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600"
            >
              🗺 Googleマップで開く（{site.lat.toFixed(5)}, {site.lng.toFixed(5)}）
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// 現場の種類ごとに選べる段階（除草のみの現場はシート施工が無い）
function stageOptions(type: SiteType): { stage: Stage; label: string }[] {
  return type === '除草のみ'
    ? [
        { stage: 'none', label: '未着手' },
        { stage: 'weeding', label: '除草途中' },
        { stage: 'done', label: '除草完了（完工）' },
      ]
    : [
        { stage: 'none', label: '未着手' },
        { stage: 'weeding', label: '除草途中' },
        { stage: 'weeded', label: '除草のみ完了' },
        { stage: 'sheeting', label: 'シート施工途中' },
        { stage: 'done', label: '除草＋シート完了（完工）' },
      ];
}
