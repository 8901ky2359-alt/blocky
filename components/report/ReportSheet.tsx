'use client';

// 進捗報告（LINE用）を作る。区分：除草のみ完了／除草＋シート完了／シート施工途中／除草途中

import { useMemo, useState } from 'react';
import { SiteSeed, SiteProgress } from '@/lib/report/types';
import { buildProgressReport } from '@/lib/report/status';

export default function ReportSheet({
  sites,
  get,
  onClose,
}: {
  sites: SiteSeed[];
  get: (workNo: string) => SiteProgress;
  onClose: () => void;
}) {
  const [edited, setEdited] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const auto = useMemo(() => buildProgressReport(sites, get), [sites, get]);
  const text = edited ?? auto;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('コピーしました');
    } catch {
      setMsg('コピーできませんでした（長押しで選択してください）');
    }
    setTimeout(() => setMsg(''), 2600);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/20" />
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold">📋 進捗報告を作成</h3>
          <button onClick={onClose} className="text-sm text-fw-green">
            閉じる
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          各現場の「作業の状況」から自動で作ります。送る前に直したいところがあれば、下の文章をそのまま書き換えられます。
        </p>

        <textarea
          id="report-text"
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          rows={16}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-[13px] leading-relaxed text-slate-800 outline-none"
        />
        {edited !== null && (
          <button onClick={() => setEdited(null)} className="mt-1 text-xs text-fw-green underline">
            書き換えを元に戻す
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={copy} className="rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700">
            コピー
          </button>
          <button onClick={share} className="rounded-xl bg-fw-green py-3 text-sm font-bold text-white">
            LINEなどで共有
          </button>
        </div>
        {msg && <p className="mt-2 text-center text-xs text-fw-green">{msg}</p>}
      </div>
    </div>
  );
}
