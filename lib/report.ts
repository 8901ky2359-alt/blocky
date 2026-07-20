// 報告テキスト・報告画像の生成、共有ヘルパー

import { Entry } from './types';
import { formatJpMonth, yen } from './format';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = WEEK[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${w})`;
}

export interface ReportOptions {
  includeExpense: boolean;
}

export function buildReportText(mKey: string, entries: Entry[], opts: ReportOptions): string {
  const rows = entries
    .filter((e) => e.date.slice(0, 7) === mKey)
    .filter((e) => (opts.includeExpense ? true : e.kind === 'income'))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let income = 0;
  let expense = 0;
  const lines: string[] = [];
  lines.push(`【作業報告】${formatJpMonth(mKey)}`);
  lines.push('━━━━━━━━━━');

  for (const e of rows) {
    if (e.kind === 'income') income += e.amount;
    else expense += e.amount;
    const sign = e.kind === 'income' ? '' : '（経費）';
    const site = e.site ? ` ${e.site}` : '';
    lines.push(`${shortDate(e.date)}${site}`);
    lines.push(`　${e.category}${sign} ${yen(e.amount)}`);
    if (e.memo) lines.push(`　※${e.memo}`);
  }

  if (rows.length === 0) lines.push('（記録なし）');
  lines.push('━━━━━━━━━━');
  lines.push(`売上合計　${yen(income)}`);
  if (opts.includeExpense) {
    lines.push(`経費合計　${yen(expense)}`);
    lines.push(`差引　　　${yen(income - expense)}`);
  }
  return lines.join('\n');
}

// 報告書を画像(PNG Blob)に描画
export async function buildReportImage(
  mKey: string,
  entries: Entry[],
  opts: ReportOptions,
): Promise<Blob | null> {
  const rows = entries
    .filter((e) => e.date.slice(0, 7) === mKey)
    .filter((e) => (opts.includeExpense ? true : e.kind === 'income'))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const W = 720;
  const pad = 40;
  const lineH = 34;
  const headerH = 150;
  const footerH = 140;
  const H = headerH + rows.length * lineH * 2 + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = Math.max(H, 400);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, canvas.height);

  // ヘッダ帯
  ctx.fillStyle = '#1f7a4f';
  ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('作業報告書', pad, 60);
  ctx.font = '22px sans-serif';
  ctx.fillText(formatJpMonth(mKey), W - pad - ctx.measureText(formatJpMonth(mKey)).width, 60);

  let y = headerH;
  let income = 0;
  let expense = 0;
  ctx.textBaseline = 'alphabetic';
  for (const e of rows) {
    if (e.kind === 'income') income += e.amount;
    else expense += e.amount;
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${shortDate(e.date)}  ${e.site || ''}`, pad, y);
    y += lineH;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = e.kind === 'income' ? '#1d4ed8' : '#dc2626';
    const label = `${e.category}${e.kind === 'income' ? '' : '（経費）'}`;
    ctx.fillText(label, pad + 16, y);
    const amt = (e.kind === 'income' ? '+' : '−') + yen(e.amount);
    ctx.fillText(amt, W - pad - ctx.measureText(amt).width, y);
    y += lineH;
    // 区切り
    ctx.strokeStyle = '#eeeeee';
    ctx.beginPath();
    ctx.moveTo(pad, y - lineH + 10);
    ctx.lineTo(W - pad, y - lineH + 10);
    ctx.stroke();
  }

  // フッタ合計
  y = canvas.height - footerH + 30;
  ctx.strokeStyle = '#1f7a4f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, y - 20);
  ctx.lineTo(W - pad, y - 20);
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 26px sans-serif';
  const total = `売上合計　${yen(income)}`;
  ctx.fillText(total, pad, y + 18);
  if (opts.includeExpense) {
    const exp = `経費 ${yen(expense)} / 差引 ${yen(income - expense)}`;
    ctx.font = '22px sans-serif';
    ctx.fillText(exp, pad, y + 54);
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// Web Share API でテキスト共有（LINE等）。失敗時はクリップボードにコピー。
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function shareFiles(files: File[], text?: string): Promise<'shared' | 'unsupported' | 'failed'> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'unsupported';
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const data: ShareData = { files, text } as ShareData;
  if (nav.canShare && !nav.canShare(data)) return 'unsupported';
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    if ((err as Error).name === 'AbortError') return 'shared';
    return 'failed';
  }
}

// dataURL → File
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, body] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
