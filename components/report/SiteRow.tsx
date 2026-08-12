'use client';

import { useState } from 'react';
import { SiteSeed, SiteProgress, SiteType } from '@/lib/report/types';
import { OVERALL_META, overallOf, statusLabel, isReportTarget, typeOf, mapsUrl, codeOf } from '@/lib/report/status';

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

  return (
    <div
      className={`rounded-xl border bg-white shadow-card ${
        p.done ? 'border-emerald-300' : reportTarget ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-slate-800">{site.name}</span>
            {p.done && (
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
        <a
          href={mapsUrl(site.lat, site.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px] font-bold text-slate-600"
        >
          🗺<br />地図
        </a>
      </div>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-3">
          {/* 現場の種類 */}
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">現場の種類</p>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              {(['除草のみ', 'シートあり'] as SiteType[]).map((t, i) => (
                <button
                  key={t}
                  onClick={() => onChange({ siteType: t })}
                  className={`flex-1 py-2 text-[12px] font-bold ${i > 0 ? 'border-l border-slate-200' : ''} ${
                    type === t ? 'bg-brand-primary text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {t === '除草のみ' ? '除草のみ（シートなし）' : '防草シートまで'}
                </button>
              ))}
            </div>
          </div>

          {/* 除草作業の完了 */}
          {!p.done && (
            <button
              onClick={() => onChange({ weedDone: !p.weedDone })}
              className={`w-full rounded-lg py-2.5 text-sm font-bold ${
                p.weedDone ? 'border border-amber-400 bg-amber-50 text-amber-700' : 'bg-amber-500 text-white'
              }`}
            >
              {p.weedDone ? '除草作業：完了 ✓（タップで取り消し）' : '🌿 除草作業を完了にする'}
            </button>
          )}

          {/* 完工の確定 */}
          {p.done ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 p-2.5">
              <span className="text-sm font-bold text-emerald-700">✔ 完工済み（この現場は完了）</span>
              <button
                onClick={() => onChange({ done: false })}
                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-700"
              >
                取り消す
              </button>
            </div>
          ) : (
            <button
              onClick={() => onChange({ done: true, weedDone: true })}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-black text-white active:scale-[.99]"
            >
              ✅ 完工にする（{type === '除草のみ' ? '除草完了で完了' : '防草シートまで完了'}）
            </button>
          )}

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

          <a
            href={mapsUrl(site.lat, site.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-600"
          >
            🗺 Googleマップで開く（{site.lat.toFixed(5)}, {site.lng.toFixed(5)}）
          </a>
        </div>
      )}
    </div>
  );
}
