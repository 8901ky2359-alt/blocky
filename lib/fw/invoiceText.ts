// 請求書作成ページの出力：LINEに貼る文章と、Claudeに送る請求書作成プロンプト

import { InvoiceGroup, cutoffLabel, shortDate } from './billing';
import { Profile } from './types';
import { yen } from '../format';

function jpDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

// 作業員手配は「作業員手配（氏名）」を作業内容として載せる（旧アプリの請求書と同じ）
function saleLine(s: InvoiceGroup['sales'][number]): string {
  const hired = s.workType === '作業員手配' ? `作業員手配${s.hiredName ? `（${s.hiredName}）` : ''}` : '';
  return [shortDate(s.date), s.site, hired, s.work].filter(Boolean).join(' ');
}

// 複数の人の分が混ざっているとき（総合管理画面の「全員」）は、各請求書に発行する人を書く
function mixed(groups: InvoiceGroup[]): boolean {
  return new Set(groups.map((g) => g.userId)).size > 1;
}

export function lineText(groups: InvoiceGroup[], title: string, issuer: string): string {
  const lines: string[] = [`【${title} 請求のご連絡】`, ''];
  const showIssuer = mixed(groups);
  for (const g of groups) {
    lines.push(`${g.clientName} 様（${cutoffLabel(g.cutoff)} ${shortDate(g.closing)}）${showIssuer ? ` 発行：${g.userName}` : ''}`);
    for (const s of g.sales) lines.push(`${saleLine(s)} ${yen(s.amount)}`);
    lines.push(`小計 ${yen(g.subtotal)}`, `消費税 ${yen(g.tax)}`, `合計 ${yen(g.total)}`, '');
  }
  if (groups.length > 1) {
    lines.push(`総合計 ${yen(groups.reduce((n, g) => n + g.total, 0))}（${groups.length}件の請求）`, '');
  }
  lines.push('よろしくお願いいたします。');
  if (!showIssuer) lines.push(issuer);
  return lines.join('\n');
}

export function claudePrompt(groups: InvoiceGroup[], profile: Profile, fallbackName: string): string {
  const issuer = profile.issuerName || fallbackName;
  const showIssuer = mixed(groups);
  const lines: string[] = [
    `次の内容で請求書を作成してください。請求先ごとに1枚ずつ、全${groups.length}枚です。`,
    '',
    '■ 発行者',
    `氏名：${issuer}`,
  ];
  if (profile.tradeName) lines.push(`屋号：${profile.tradeName}`);
  if (profile.address) lines.push(`住所：${profile.address}`);
  if (profile.phone) lines.push(`電話：${profile.phone}`);
  if (profile.invoiceNo) lines.push(`登録番号：${profile.invoiceNo}`);
  lines.push(`振込先：${profile.bank || '（未設定）'}`, '');

  groups.forEach((g, i) => {
    lines.push(
      `■ 請求書${i + 1}`,
      ...(showIssuer ? [`発行者：${g.userName}（上の発行者情報は${issuer}のものです）`] : []),
      `宛名：${g.clientName} 様`,
      `締め日：${jpDate(g.closing)}（${cutoffLabel(g.cutoff)}）`,
      `お支払期限：${jpDate(g.payDate)}`,
      '明細（金額は税抜）：',
    );
    for (const s of g.sales) lines.push(`・${saleLine(s)} ${s.amount.toLocaleString('ja-JP')}円`);
    lines.push(
      `小計：${g.subtotal.toLocaleString('ja-JP')}円`,
      `消費税（10%）：${g.tax.toLocaleString('ja-JP')}円`,
      `合計：${g.total.toLocaleString('ja-JP')}円`,
      '',
    );
  });
  lines.push('各請求書はA4縦1枚の体裁に整え、発行日・請求番号・合計金額を見やすく記載してください。');
  return lines.join('\n');
}
