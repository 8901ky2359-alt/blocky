'use client';

// 請求書作成の出力：送る前に中身を確認して、コピー・LINE・Claude へ

import { useState } from 'react';
import Sheet from './Sheet';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function OutputSheet({
  title,
  text,
  kind,
  onClose,
}: {
  title: string;
  text: string;
  kind: 'line' | 'claude';
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<boolean | null>(null);

  return (
    <Sheet title={title} onClose={onClose}>
      <pre className="mx-4 mb-3 whitespace-pre-wrap break-words rounded-2xl bg-fw-card p-4 font-sans text-[13px] leading-relaxed">{text}</pre>
      <div className="grid gap-2 px-4">
        {kind === 'line' ? (
          <a
            href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-fw-line_app py-3 text-center font-bold text-white"
          >
            LINEで送る
          </a>
        ) : (
          <a
            href="https://claude.ai/new"
            target="_blank"
            rel="noreferrer"
            onClick={() => copy(text).then(setCopied)}
            className="rounded-xl bg-fw-claude py-3 text-center font-bold text-white"
          >
            コピーしてClaudeを開く
          </a>
        )}
        <button onClick={() => copy(text).then(setCopied)} className="rounded-xl bg-fw-card py-3 font-semibold text-fw-green">
          コピー
        </button>
        {copied !== null && (
          <p className={`text-center text-sm ${copied ? 'text-fw-green' : 'text-fw-red'}`}>
            {copied ? 'コピーしました。Claudeの入力欄に貼り付けてください' : 'コピーできませんでした。文章を長押しして選んでください'}
          </p>
        )}
      </div>
    </Sheet>
  );
}
