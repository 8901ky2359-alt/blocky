'use client';

import { useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth } from '@/lib/format';
import {
  buildReportImage,
  buildReportText,
  dataUrlToFile,
  downloadFile,
  shareFiles,
  shareText,
} from '@/lib/report';
import InvoiceView from './InvoiceView';

export default function ReportView({ entries }: { entries: Entry[] }) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [showInvoice, setShowInvoice] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const text = useMemo(() => buildReportText(mKey, entries), [mKey, entries]);

  // 月内の全写真（現場Before/After＋レシート）
  const allPhotos = useMemo(
    () =>
      entries
        .filter((e) => e.date.slice(0, 7) === mKey)
        .flatMap((e) => e.photos),
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
      const blob = await buildReportImage(mKey, entries);
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
    if (allPhotos.length === 0) {
      flash('この月の写真はありません');
      return;
    }
    setBusy(true);
    try {
      const files = allPhotos.map((p, i) => {
        const kind = p.photoKind === 'receipt' ? 'レシート' : p.phase === 'before' ? 'before' : p.phase === 'after' ? 'after' : '現場';
        return dataUrlToFile(p.dataUrl, `${mKey}_${kind}_${i + 1}.jpg`);
      });
      const r = await shareFiles(files, `${formatJpMonth(mKey)} 写真`);
      if (r === 'unsupported' || r === 'failed') {
        files.forEach(downloadFile);
        flash('端末に保存しました（共有非対応のため）');
      }
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
          🖼 写真をまとめて共有（現場・レシート {allPhotos.length}枚）
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
