// 収支計算の共通ロジック
// - 各記録(Entry)は「売上(amount)」と、その現場でかかった「経費(expense)」を持つ。
// - 請負: 経費は自分のお金から出す → 利益から差し引く（自己負担）。
// - 常駐: 経費は中野さんに請求して受け取る → 差し引きゼロ（±0）。立替として集計。
// - 差引利益(net) = 売上合計 − 自己負担経費(請負)。常駐経費はnetに影響しない。

import { Entry, workTypeOf } from './types';

export interface Totals {
  income: number; // 売上合計
  selfExpense: number; // 自己負担経費（請負）
  reimburseExpense: number; // 立替経費（常駐・中野さんに請求して受け取る）
  net: number; // 差引利益 = 売上 − 自己負担経費
  count: number; // 記録件数
}

export function summarize(entries: Entry[]): Totals {
  let income = 0;
  let selfExpense = 0;
  let reimburseExpense = 0;
  let count = 0;
  for (const e of entries) {
    if (e.kind !== 'income') continue;
    income += e.amount || 0;
    const exp = e.expense || 0;
    if (exp > 0) {
      if (workTypeOf(e) === '常駐') reimburseExpense += exp;
      else selfExpense += exp;
    }
    count += 1;
  }
  return { income, selfExpense, reimburseExpense, net: income - selfExpense, count };
}

// 1日ぶんの内訳（カレンダー表示用）
export interface DayInfo {
  ukeoi: number; // 請負の売上
  jouchu: number; // 常駐の売上
  expense: number; // その日の経費合計（請負+常駐）
  photo: boolean;
}

export function byDateInfo(entries: Entry[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();
  for (const e of entries) {
    if (e.kind !== 'income') continue;
    const cur = map.get(e.date) ?? { ukeoi: 0, jouchu: 0, expense: 0, photo: false };
    if (workTypeOf(e) === '常駐') cur.jouchu += e.amount || 0;
    else cur.ukeoi += e.amount || 0;
    cur.expense += e.expense || 0;
    if (e.photos.length > 0) cur.photo = true;
    map.set(e.date, cur);
  }
  return map;
}
