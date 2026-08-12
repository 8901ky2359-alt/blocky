'use client';

import { useMemo, useState } from 'react';
import { SiteSeed, SiteProgress } from '@/lib/report/types';
import { buildReport } from '@/lib/report/status';

export default function ReportSheet({
  sites,
  get,
  onReflectProgress,
  onClearThisWeek,
  onClose,
}: {
  sites: SiteSeed[];
  get: (workNo: string) => SiteProgress;
  onReflectProgress: () => void;
  onClearThisWeek: () => void;
  onClose: () => void;
}) {
  const [dateLabel, setDateLabel] = useState('');
  const [extra, setExtra] = useState('');
  const [edited, setEdited] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const auto = useMemo(
    () => buildReport(sites, get, { dateLabel: dateLabel.trim() || undefined, extra }),
    [sites, get, dateLabel, extra],
  );
  const text = edited ?? auto;

  const implCount = sites.filter((s) => get(s.workNo).thisWeek).length;
  const nextCount = sites.filter((s) => get(s.workNo).nextWeek).length;

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
        <h3 className="mb-1 text-lg font-bold">📋 今週の報告を作成</h3>
        <p className="mb-2 text-xs text-slate-500">
          実施 {implCount}件／次週 {nextCount}件。各現場のコード横の「報告」チェックで選んだ現場が実施に載ります。
          そのままLINEへ共有・コピーできます。
        </p>

        {/* まとめて選択・解除 */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={onReflectProgress}
            className="rounded-lg border border-brand-primary bg-brand-primary/5 py-2 text-[12px] font-bold text-brand-primary"
          >
            🔄 進捗のある現場をまとめて選択
          </button>
          <button
            onClick={() => {
              if (confirm('報告の選択（チェック）をすべて解除します。（除草・シート・完工のステータスはそのまま残ります）')) {
                onClearThisWeek();
              }
            }}
            className="rounded-lg border border-slate-300 py-2 text-[12px] font-bold text-slate-600"
          >
            選択をすべて解除
          </button>
        </div>

        <div className="mb-2 grid grid-cols-1 gap-2">
          <input
            value={dateLabel}
            onChange={(e) => {
              setDateLabel(e.target.value);
              setEdited(null);
            }}
            placeholder="見出し（任意・例: 23日ルート）"
            className="input"
          />
          <textarea
            value={extra}
            onChange={(e) => {
              setExtra(e.target.value);
              setEdited(null);
            }}
            placeholder="リスト外の実施（任意・例: 気仙沼 WEST-L-1471 除草（完了）… ）"
            className="input h-16"
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          className="input h-64 font-mono text-[13px] leading-relaxed"
        />
        {edited !== null && (
          <button onClick={() => setEdited(null)} className="mt-1 text-xs text-brand-primary underline">
            自動生成に戻す
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={copy} className="rounded-xl border border-black/15 py-3 text-sm font-bold text-slate-700">
            📄 コピー
          </button>
          <button onClick={share} className="rounded-xl bg-brand-primary py-3 text-sm font-bold text-white">
            📤 共有（LINE等）
          </button>
        </div>
        {msg && <p className="mt-2 text-center text-xs text-brand-primary">{msg}</p>}
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-black/50">
          閉じる
        </button>
      </div>
    </div>
  );
}
