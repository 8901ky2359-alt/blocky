'use client';

import { useState } from 'react';
import { exportText } from '@/lib/api';
import { currentMonthKey, shiftMonth, formatJpMonth } from '@/lib/format';

export default function ExportPanel({
  isAdmin,
  workers,
  onClose,
}: {
  isAdmin: boolean;
  workers?: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [month, setMonth] = useState(currentMonthKey());
  const [status, setStatus] = useState<'approved' | 'all'>('approved');
  const [userId, setUserId] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    setCopied(false);
    try {
      const t = await exportText({ month, status, userId: userId || undefined });
      setBody(t);
    } catch {
      setBody('出力に失敗しました。通信環境をご確認のうえ、もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="mx-auto flex max-h-[85dvh] w-full max-w-[520px] flex-col rounded-t-2xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-black/20" />
        <h3 className="mb-3 shrink-0 text-lg font-bold">📄 テキスト出力</h3>

        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-lg border border-slate-300 px-2 py-1">
            ‹
          </button>
          <span className="text-sm font-semibold">{formatJpMonth(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="rounded-lg border border-slate-300 px-2 py-1">
            ›
          </button>

          <select value={status} onChange={(e) => setStatus(e.target.value as 'approved' | 'all')} className="input w-auto">
            <option value="approved">承認済みのみ</option>
            <option value="all">全て（承認待ち含む）</option>
          </select>

          {isAdmin && workers && (
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input w-auto">
              <option value="">全員</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}

          <button onClick={run} disabled={busy} className="ml-auto rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? '作成中…' : '出力する'}
          </button>
        </div>

        <textarea
          readOnly
          value={body}
          placeholder="「出力する」を押すと、ここにテキストが表示されます"
          rows={12}
          className="input flex-1 resize-none font-mono text-xs"
        />

        <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
          <button onClick={copy} disabled={!body} className="rounded-xl border border-slate-300 py-2.5 text-sm font-semibold disabled:opacity-40">
            {copied ? 'コピーしました' : 'コピーする'}
          </button>
          <button onClick={onClose} className="rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
