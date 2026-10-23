// ステータスの表示・色・LINE報告テキストの生成

import { SiteSeed, SiteProgress, SiteType } from './types';

// 全体の状態区分（地図ピン色・フィルタ用）
export type Overall = 'done' | 'weeded' | 'none';

export function overallOf(p: SiteProgress): Overall {
  if (p.done) return 'done'; // 完工
  if (p.weedDone) return 'weeded'; // 除草完了/除草のみ完了
  return 'none'; // 未着手
}

export const OVERALL_META: Record<Overall, { label: string; color: string }> = {
  done: { label: '完工', color: '#059669' }, // 緑
  weeded: { label: '除草完了', color: '#d97706' }, // オレンジ
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
  if (p.done) return '完工';
  if (p.weedDone) return type === '除草のみ' ? '除草完了' : '除草のみ完了';
  return '未着手';
}

// 報告対象＝完工していない現場
export function isReportTarget(p: SiteProgress): boolean {
  return !p.done && p.weedDone;
}

// LINE報告用の1行ステータス表現
// - 除草のみの現場：除草作業完了
// - 防草シートありの現場：除草作業のみ完了
export function reportPhrase(type: SiteType): string {
  return type === '除草のみ' ? '除草作業完了' : '除草作業のみ完了';
}

// 今週の報告テキストを生成
// 実施＝完工していない＆除草完了の現場（市町村ごと）／次週＝次週予定
export function buildReport(
  sites: SiteSeed[],
  get: (workNo: string) => SiteProgress,
  opts: { dateLabel?: string; extra?: string } = {},
): string {
  const impl = sites.filter((s) => isReportTarget(get(s.workNo)));
  const next = sites.filter((s) => get(s.workNo).nextWeek);

  const lines: string[] = [];
  if (opts.dateLabel) lines.push(`✅${opts.dateLabel}`);
  lines.push('実施');

  if (opts.extra && opts.extra.trim()) {
    lines.push('リスト外');
    lines.push(opts.extra.trim());
    lines.push('');
  }

  if (impl.length === 0) {
    lines.push('（報告対象の現場がありません。現場を「除草完了」にすると対象になります）');
  } else {
    // 市町村ごとにまとめる
    const groups = new Map<string, SiteSeed[]>();
    for (const s of impl) {
      if (!groups.has(s.area)) groups.set(s.area, []);
      groups.get(s.area)!.push(s);
    }
    for (const [area, list] of groups) {
      lines.push(area);
      for (const s of list) {
        const code = codeOf(s.workNo);
        const phrase = reportPhrase(typeOf(s, get(s.workNo)));
        lines.push(`${code ? code + ' ' : ''}${s.name} ${phrase}`);
      }
    }
  }
  lines.push('以上になります');
  lines.push('');
  lines.push('次週');
  if (next.length === 0) {
    lines.push('（次週予定の現場が選択されていません）');
  } else {
    for (const s of next) {
      const code = codeOf(s.workNo);
      lines.push(`${code ? code + ' ' : ''}${s.name}`);
    }
  }
  return lines.join('\n');
}
