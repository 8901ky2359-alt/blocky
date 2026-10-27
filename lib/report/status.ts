// ステータスの表示・色・LINE報告テキストの生成

import { SiteSeed, SiteProgress, SiteType, Stage, stageOf } from './types';

// 全体の状態区分（地図ピン色・フィルタ用）
export type Overall = 'done' | 'weeded' | 'working' | 'none';

export function overallOf(p: SiteProgress): Overall {
  const st = stageOf(p);
  if (st === 'done') return 'done'; // 完工
  if (st === 'weeded') return 'weeded'; // 除草完了/除草のみ完了
  if (st === 'weeding' || st === 'sheeting') return 'working'; // 除草途中・シート施工途中
  return 'none'; // 未着手
}

export const OVERALL_META: Record<Overall, { label: string; color: string }> = {
  done: { label: '完工', color: '#059669' }, // 緑
  weeded: { label: '除草完了', color: '#d97706' }, // オレンジ
  working: { label: '作業途中', color: '#2563eb' }, // 青
  none: { label: '未着手', color: '#94a3b8' }, // 灰
};

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// 工番（数字のみ表示。リスト外の工番なし現場は空を返す）
export function codeOf(workNo: string): string {
  return /^\d{5,6}$/.test(workNo) ? workNo : '';
}

// 現場の種類（未設定なら既定：工番あり=シートあり / リスト外=除草のみ）
export function typeOf(site: SiteSeed, p: SiteProgress): SiteType {
  return p.siteType ?? (codeOf(site.workNo) ? 'シートあり' : '除草のみ');
}

// 画面表示用の状態ラベル（現場の種類で表現を変える）
export function statusLabel(type: SiteType, p: SiteProgress): string {
  switch (stageOf(p)) {
    case 'done':
      return '完工';
    case 'sheeting':
      return 'シート施工途中';
    case 'weeded':
      return type === '除草のみ' ? '除草完了' : '除草のみ完了';
    case 'weeding':
      return '除草途中';
    default:
      return '未着手';
  }
}

// 報告対象＝手を付けていて、まだ完工していない現場
export function isReportTarget(p: SiteProgress): boolean {
  const st = stageOf(p);
  return st === 'weeding' || st === 'weeded' || st === 'sheeting';
}

// ---- 進捗報告（LINE用）：除草のみ完了／除草＋シート完了／シート施工途中／除草途中 ----

export const PROGRESS_GROUPS = ['除草のみ完了', '除草＋シート完了', 'シート施工途中', '除草途中'] as const;
export type ProgressGroup = (typeof PROGRESS_GROUPS)[number];

// 報告のどの区分に入るか（未着手は入らない）
export function progressGroupOf(site: SiteSeed, p: SiteProgress): ProgressGroup | null {
  const st = stageOf(p);
  const sheet = typeOf(site, p) === 'シートあり';
  if (st === 'done') return sheet ? '除草＋シート完了' : '除草のみ完了';
  if (st === 'sheeting') return 'シート施工途中';
  if (st === 'weeded') return '除草のみ完了';
  if (st === 'weeding') return '除草途中';
  return null;
}

// 並び順：WEST-L → WEST-LS → Lohas の順に、番号の小さい順
function sortKey(name: string): [number, number, string] {
  const n = name.toUpperCase();
  const rank = n.startsWith('WEST-L-') ? 0 : n.startsWith('WEST-LS-') ? 1 : n.startsWith('LOHAS') ? 2 : 3;
  const num = parseInt(n.replace(/^[^0-9]*/, ''), 10);
  return [rank, Number.isFinite(num) ? num : 99999, n];
}

export function byName(a: SiteSeed, b: SiteSeed): number {
  const x = sortKey(a.name);
  const y = sortKey(b.name);
  return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
}

// 一覧の並び順（進捗順）：シート施工途中 → 除草のみ完了 → 除草途中 → 完工 → 未着手。同じ進捗の中は番号順
const STAGE_ORDER: Record<Stage, number> = { sheeting: 0, weeded: 1, weeding: 2, done: 3, none: 4 };

export function byProgress(get: (workNo: string) => SiteProgress) {
  return (a: SiteSeed, b: SiteSeed): number =>
    STAGE_ORDER[stageOf(get(a.workNo))] - STAGE_ORDER[stageOf(get(b.workNo))] || byName(a, b);
}

export function buildProgressReport(sites: SiteSeed[], get: (workNo: string) => SiteProgress): string {
  const groups = new Map<ProgressGroup, SiteSeed[]>(PROGRESS_GROUPS.map((g) => [g, []]));
  for (const s of sites) {
    const g = progressGroupOf(s, get(s.workNo));
    if (g) groups.get(g)!.push(s);
  }
  const total = PROGRESS_GROUPS.reduce((n, g) => n + groups.get(g)!.length, 0);

  const lines: string[] = ['【防草シート案件 進捗報告】', '', '■集計'];
  for (const g of PROGRESS_GROUPS) lines.push(`・${g}：${groups.get(g)!.length}件`);
  lines.push(`合計：${total}件`);

  for (const g of PROGRESS_GROUPS) {
    const list = groups.get(g)!.sort(byName);
    if (list.length === 0) continue;
    lines.push('', `■${g}（${list.length}件）`);
    for (const s of list) lines.push(s.name);
    const bees = list.filter((s) => get(s.workNo).bee).map((s) => s.name);
    if (bees.length) lines.push(`※${bees.join('・')}はスズメバチの巣駆除も完了`);
  }
  return lines.join('\n');
}
