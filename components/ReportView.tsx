'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth } from '@/lib/format';
import {
  buildReportImage,
  buildReportText,
  dataUrlToFile,
  shareFiles,
  shareText,
} from '@/lib/report';
import InvoiceView from './InvoiceView';

export default function ReportView({ entries }: { entries: Entry[] }) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [showInvoice, setShowInvoice] = useState(false);
  const [includeExpense, setIncludeExpense] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const text = useMemo(
    () => buildReportText(mKey, entries, { includeExpense }),
    [mKey, entries, includeExpense],
  );

  const sitePhotos = useMemo(
    () =>
      entries
        .filter((e) => e.date.slice(0, 7) === mKey)
        .flatMap((e) => e.photos.filter((p) => p.photoKind === 'site')),
    [entries, mKey],
  );

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  async function onShareText() {
    const r = await shareText(text);
    if (r === 'copied') flash('コピーしました。LINEに貼り付けて送れます');
    else if (r === 'failed') flash('共有できませんでした');
  }

  async function onShareImage() {
    setBusy(true);
    try {
      const blob = await buildReportImage(mKey, entries, { includeExpense });
      if (!blob) {
        flash('画像を作れませんでした');
        return;
      }
      const file = new File([blob], `報告書_${mKey}.png`, { type: 'image/png' });
      const r = await shareFiles([file], `${formatJpMonth(mKey)} 作業報告`);
      if (r === 'unsupported') {
        // フォールバック: ダウンロード
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        flash('画像を保存しました。LINEで送れます');
      } else if (r === 'failed') {
        flash('共有できませんでした');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSharePhotos() {
    if (sitePhotos.length === 0) {
      flash('この月の現場写真はありません');
      return;
    }
    setBusy(true);
    try {
      const files = sitePhotos.slice(0, 10).map((p, i) => dataUrlToFile(p.dataUrl, `現場_${mKey}_${i + 1}.jpg`));
      const r = await shareFiles(files, `${formatJpMonth(mKey)} 現場写真`);
      if (r === 'unsupported') flash('この端末では写真の一括共有に未対応です（1枚ずつ写真タブから保存できます）');
      else if (r === 'failed') flash('共有できませんでした');
    } finally {
      setBusy(false);
    }
  }

  if (showInvoice) {
    return <InvoiceView entries={entries} onBack={() => setShowInvoice(false)} />;
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">元請けへの報告</h2>

      <div className="flex items-center justify-between">
        <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="rounded-lg px-3 py-1 text-lg">
          ‹
        </button>
        <span className="font-semibold">{formatJpMonth(mKey)}</span>
        <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="rounded-lg px-3 py-1 text-lg">
          ›
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeExpense}
          onChange={(e) => setIncludeExpense(e.target.checked)}
        />
        経費・差引も報告に含める
      </label>

      {/* プレビュー */}
      <div className="rounded-xl border border-black/10 bg-white p-3">
        <p className="mb-1 text-xs text-black/40">プレビュー（このままLINEに送れます）</p>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-black/80">
          {text}
        </pre>
      </div>

      {/* 共有ボタン */}
      <div className="space-y-2">
        <button
          onClick={onShareText}
          disabled={busy}
          className="w-full rounded-xl bg-[#06C755] py-3 font-bold text-white disabled:opacity-50"
        >
          💬 LINEで共有（テキスト）
        </button>
        <button
          onClick={onShareImage}
          disabled={busy}
          className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white disabled:opacity-50"
        >
          📄 報告書を画像で共有
        </button>
        <button
          onClick={onSharePhotos}
          disabled={busy}
          className="w-full rounded-xl border border-brand-primary py-3 font-bold text-brand-primary disabled:opacity-50"
        >
          🖼 現場写真をまとめて共有（{sitePhotos.length}枚）
        </button>
        <button
          onClick={() => setShowInvoice(true)}
          className="w-full rounded-xl border border-black/15 py-3 font-bold text-black/70"
        >
          🧾 請求書を作る（PDF）
        </button>
      </div>

      {msg && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-xs rounded-full bg-black/80 px-4 py-2 text-center text-sm text-white">
          {msg}
        </div>
      )}

      <p className="text-center text-xs text-black/40">
        「共有」ボタンを押すと端末の共有メニューが開き、LINEを選んで送れます。
      </p>
    </div>
  );
}
