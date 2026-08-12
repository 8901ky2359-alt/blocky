'use client';

import { useState } from 'react';
import { SiteSeed, SiteProgress, Weeding, Sheet } from '@/lib/report/types';
import { WEEDING_LABEL, SHEET_LABEL, OVERALL_META, overallOf, mapsUrl, codeOf } from '@/lib/report/status';

function Seg<T extends string>({
  value,
  options,
  onChange,
  activeColor = 'bg-brand-primary',
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  activeColor?: string;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200">
      {options.map((o, i) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 py-1.5 text-[11px] font-bold ${i > 0 ? 'border-l border-slate-200' : ''} ${
            value === o.key ? `${activeColor} text-white` : 'bg-white text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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
  const ov = overallOf(p);
  const meta = OVERALL_META[ov];

  return (
    <div
      className={`rounded-xl border bg-white shadow-card ${
        p.thisWeek ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        {/* 報告に載せるチェック（コードの隣） */}
        <label className="mt-0.5 flex shrink-0 cursor-pointer flex-col items-center gap-0.5">
          <input
            type="checkbox"
            checked={p.thisWeek}
            onChange={(e) => onChange({ thisWeek: e.target.checked })}
            className="h-6 w-6 accent-emerald-600"
            aria-label="報告に載せる"
          />
          <span className="text-[8px] font-bold text-emerald-600">報告</span>
        </label>

        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
            <span className="truncate text-sm font-bold text-slate-800">{site.name}</span>
            {p.done && (
              <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                完工
              </span>
            )}
            {site.priority && (
              <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                優先
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {codeOf(site.workNo) ? `工番 ${site.workNo}・` : 'リスト外・'}
            {site.area}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">📍 {site.address}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded px-1.5 py-0.5 font-bold text-white" style={{ background: meta.color }}>
              {meta.label}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
              除草:{WEEDING_LABEL[p.weeding]}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
              シート:{SHEET_LABEL[p.sheet]}
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
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">除草作業</p>
            <Seg<Weeding>
              value={p.weeding}
              onChange={(v) => onChange({ weeding: v })}
              options={[
                { key: 'none', label: '未着手' },
                { key: 'wip', label: '作業途中' },
                { key: 'done', label: '完了' },
              ]}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">防草シート</p>
            <Seg<Sheet>
              value={p.sheet}
              onChange={(v) => onChange({ sheet: v })}
              options={[
                { key: 'none', label: '無し/未' },
                { key: 'wip', label: '作業途中' },
                { key: 'done', label: '完了' },
                { key: 'fix', label: '是正未完' },
              ]}
            />
          </div>

          {/* 完工の確定ボタン（現場のパターンに関係なく、この現場は完了） */}
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
              onClick={() => onChange({ done: true })}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-black text-white active:scale-[.99]"
            >
              ✅ 完工にする（この現場はすべて完了）
            </button>
          )}

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
