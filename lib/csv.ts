// 記録をCSVに書き出す（確定申告・表計算向け）

import { Entry } from './types';

function esc(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function entriesToCsv(entries: Entry[]): string {
  const header = ['日付', '種別', 'カテゴリ', '現場名', '金額', 'メモ', '写真枚数'];
  const rows = entries
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => [
      e.date,
      e.kind === 'income' ? '収入' : '経費',
      e.category,
      e.site,
      e.amount,
      e.memo,
      e.photos.length,
    ]);
  const lines = [header, ...rows].map((r) => r.map(esc).join(','));
  // Excelで文字化けしないようBOM付き
  return '﻿' + lines.join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
