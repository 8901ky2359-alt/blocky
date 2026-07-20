// 報告テキスト・報告画像の生成、共有ヘルパー

import { Entry, workTypeOf } from './types';
import { formatJpMonth, yen } from './format';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = WEEK[new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${w})`;
}

function byDate(a: Entry, b: Entry): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

// 月の記録を常駐/請負に分けて集計
function buildReportData(mKey: string, entries: Entry[]) {
  const rows = entries.filter((e) => e.date.slice(0, 7) === mKey && e.kind === 'income');
  const ukeoi = rows.filter((e) => workTypeOf(e) === '請負').sort(byDate);
  const jouchu = rows.filter((e) => workTypeOf(e) === '常駐').sort(byDate);
  const ukTotal = ukeoi.reduce((s, e) => s + e.amount, 0);
  const joTotal = jouchu.reduce((s, e) => s + e.amount, 0);
  // 常駐は金額ごとにまとめる（例: ¥20,000 × 9件）
  const amtMap = new Map<number, number>();
  for (const e of jouchu) amtMap.set(e.amount, (amtMap.get(e.amount) ?? 0) + 1);
  const jouchuByAmount = [...amtMap.entries()].sort((a, b) => b[0] - a[0]);
  return { ukeoi, jouchu, ukTotal, joTotal, jouchuByAmount };
}

// 報告本文の行（タイトルを除く）
function reportBodyLines(mKey: string, entries: Entry[]): string[] {
  const d = buildReportData(mKey, entries);
  const lines: string[] = [];

  if (d.ukeoi.length === 0 && d.jouchu.length === 0) {
    lines.push('（記録なし）');
    return lines;
  }

  // 請負（明細: 日付・金額・現場名・住所）
  if (d.ukeoi.length > 0) {
    lines.push(`■請負（${d.ukeoi.length}件）`);
    for (const e of d.ukeoi) {
      lines.push(`${shortDate(e.date)}　${yen(e.amount)}`);
      if (e.site) lines.push(`　${e.site}`);
      if (e.address && e.address !== e.site) lines.push(`　${e.address}`);
    }
    lines.push(`請負計 ${yen(d.ukTotal)}`);
    lines.push('');
  }

  // 常駐（まとめ: 金額別の件数）
  if (d.jouchu.length > 0) {
    lines.push(`■常駐（${d.jouchu.length}件）`);
    for (const [amt, cnt] of d.jouchuByAmount) {
      lines.push(`${yen(amt)} × ${cnt}件`);
    }
    lines.push(`常駐計 ${yen(d.joTotal)}`);
    lines.push('');
  }

  // 合計
  lines.push('■合計');
  lines.push(`請負　${yen(d.ukTotal)}`);
  lines.push(`常駐　${yen(d.joTotal)}`);
  lines.push(`総合計　${yen(d.ukTotal + d.joTotal)}`);
  return lines;
}

export function buildReportText(mKey: string, entries: Entry[]): string {
  return [`【作業報告】${formatJpMonth(mKey)}`, '', ...reportBodyLines(mKey, entries)].join('\n');
}

// 報告書を画像(PNG Blob)に描画（本文をそのまま描画）
export async function buildReportImage(mKey: string, entries: Entry[]): Promise<Blob | null> {
  const lines = reportBodyLines(mKey, entries);
  const W = 720;
  const pad = 40;
  const lineH = 32;
  const bandH = 96;
  const H = bandH + 30 + lines.length * lineH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = Math.max(H, 320);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, canvas.height);

  // ヘッダ帯
  ctx.fillStyle = '#1f7a4f';
  ctx.fillRect(0, 0, W, bandH);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('作業報告書', pad, 60);
  ctx.font = '22px sans-serif';
  const mLabel = formatJpMonth(mKey);
  ctx.fillText(mLabel, W - pad - ctx.measureText(mLabel).width, 60);

  let y = bandH + 44;
  for (const line of lines) {
    const isHeader = line.startsWith('■');
    const isTotal = line.startsWith('総合計') || line.endsWith('計 ') || /計 ¥/.test(line);
    if (isHeader) {
      ctx.fillStyle = '#1f7a4f';
      ctx.font = 'bold 24px sans-serif';
    } else if (isTotal) {
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 22px sans-serif';
    } else {
      ctx.fillStyle = '#222222';
      ctx.font = '21px sans-serif';
    }
    ctx.fillText(line, pad, y);
    y += lineH;
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
