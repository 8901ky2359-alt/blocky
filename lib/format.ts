// 表示用のフォーマット/日付ヘルパー

export function yen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "YYYY-MM" の月キー
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function currentMonthKey(): string {
  return todayStr().slice(0, 7);
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function formatJpDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = WEEK[new Date(y, m - 1, d).getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

export function formatJpMonth(mKey: string): string {
  const [y, m] = mKey.split('-').map(Number);
  return `${y}年${m}月`;
}

// 月の前後移動
export function shiftMonth(mKey: string, delta: number): string {
  const [y, m] = mKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// カレンダー描画用: 月の各日 + 前後の空白を含む6週分のグリッド
export function calendarCells(mKey: string): (string | null)[] {
  const [y, m] = mKey.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startPad = first.getDay(); // 0=日
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const WEEK_LABELS = WEEK;

// 簡易なランダムID（Date.now非依存でも動くよう乱数主体）
export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}
