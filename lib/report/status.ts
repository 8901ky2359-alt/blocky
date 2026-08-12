// ステータスの表示・色・LINE報告テキストの生成

import { SiteSeed, SiteProgress, Weeding, Sheet } from './types';

export const WEEDING_LABEL: Record<Weeding, string> = {
  none: '未着手',
  wip: '作業途中',
  done: '完了',
};

export const SHEET_LABEL: Record<Sheet, string> = {
  none: '未着手',
  wip: '作業途中',
  done: '完了',
  fix: '是正未完',
};

// 全体の状態区分（地図ピン色・フィルタ用）
export type Overall = 'done' | 'sheet' | 'weeded' | 'wip' | 'none';

export function overallOf(p: SiteProgress): Overall {
  if (p.done) return 'done'; // 施工完了
  if (p.sheet === 'done') return 'sheet'; // シート完了（施工完了待ち）
  if (p.weeding === 'done') return 'weeded'; // 除草まで完了
  if (p.weeding === 'wip' || p.sheet === 'wip' || p.sheet === 'fix') return 'wip'; // 作業中
  return 'none'; // 未着手
}

export const OVERALL_META: Record<Overall, { label: string; color: string }> = {
  done: { label: '施工完了', color: '#059669' }, // 緑
  sheet: { label: 'シート完了', color: '#2563eb' }, // 青
  weeded: { label: '除草まで完了', color: '#d97706' }, // オレンジ
  wip: { label: '作業中', color: '#eab308' }, // 黄
  none: { label: '未着手', color: '#94a3b8' }, // 灰
};

// LINE報告用の1行ステータス表現（中野さんの書式に合わせる）
export function statusPhrase(p: SiteProgress): string {
  if (p.done) return '施工完了';
  if (p.sheet === 'fix') return 'シート是正個所未完';
  if (p.sheet === 'wip') return 'シート作業途中';
  if (p.sheet === 'done') return 'シート完了';
  if (p.weeding === 'done') return '除草まで';
  if (p.weeding === 'wip') return '除草（作業途中）';
  return '未着手';
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// 工番（数字のみ表示。リスト外の工番なし現場は空を返す）
export function codeOf(workNo: string): string {
  return /^\d{5,6}$/.test(workNo) ? workNo : '';
}

// 今週の報告テキストを生成（実施＝今週実施ON、次週＝次週予定ON）
export function buildReport(
  sites: SiteSeed[],
  get: (workNo: string) => SiteProgress,
  opts: { dateLabel?: string; extra?: string } = {},
): string {
  const byWork = new Map(sites.map((s) => [s.workNo, s]));
  const done = sites.map((s) => get(s.workNo));

  const impl = done.filter((p) => p.thisWeek);
  const next = done.filter((p) => p.nextWeek);

  const lines: string[] = [];
  if (opts.dateLabel) lines.push(`✅${opts.dateLabel}`);
  lines.push('実施');

  if (opts.extra && opts.extra.trim()) {
    lines.push('リスト外');
    lines.push(opts.extra.trim());
    lines.push('');
  }

  if (impl.length === 0) {
    lines.push('（実施の現場がありません。現場のステータスを更新するか「🔄 進捗のある現場を実施に反映」を押してください）');
  } else {
    // 市町村ごとにまとめる
    const groups = new Map<string, SiteProgress[]>();
    for (const p of impl) {
      const s = byWork.get(p.workNo);
      const area = s?.area ?? 'その他';
      if (!groups.has(area)) groups.set(area, []);
      groups.get(area)!.push(p);
    }
    for (const [area, list] of groups) {
      lines.push(area);
      for (const p of list) {
        const s = byWork.get(p.workNo)!;
        const code = codeOf(s.workNo);
        lines.push(`${code ? code + ' ' : ''}${s.name} ${statusPhrase(p)}`);
      }
    }
  }
  lines.push('以上になります');
  lines.push('');
  lines.push('次週');
  if (next.length === 0) {
    lines.push('（次週予定の現場が選択されていません）');
  } else {
    for (const p of next) {
      const s = byWork.get(p.workNo)!;
      const code = codeOf(s.workNo);
      lines.push(`${code ? code + ' ' : ''}${s.name}`);
    }
  }
  return lines.join('\n');
}
