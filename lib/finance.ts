// 収支計算の共通ロジック
// - 収入は kind==='income' の記録（amount=売上）。
// - 経費は kind==='expense' の独立記録（amount=経費額）。※旧: 収入記録の expense 欄も加算。
// - 請負(自己負担): 利益から差し引く。常駐(立替): 中野さんに請求して受け取る=差引ゼロ。
// - 差引利益(net) = 売上合計 − 自己負担経費(請負)。

import { Entry, workTypeOf } from './types';

export interface Totals {
  income: number; // 売上合計
  selfExpense: number; // 自己負担経費（請負）
  reimburseExpense: number; // 立替経費（常駐・中野さんに請求）
  net: number; // 差引利益 = 売上 − 自己負担経費
  count: number; // 収入記録の件数
}

export function summarize(entries: Entry[]): Totals {
  let income = 0;
  let selfExpense = 0;
  let reimburseExpense = 0;
  let count = 0;
  for (const e of entries) {
    if (e.kind === 'income') {
      income += e.amount || 0;
      count += 1;
      // 旧データ互換: 収入記録に付いていた経費欄
      const exp = e.expense || 0;
      if (exp > 0) {
        if (workTypeOf(e) === '常駐') reimburseExpense += exp;
        else selfExpense += exp;
      }
    } else if (e.kind === 'expense') {
      const amt = e.amount || 0;
      if (amt > 0) {
        if (workTypeOf(e) === '常駐') reimburseExpense += amt;
        else selfExpense += amt;
      }
    }
  }
  return { income, selfExpense, reimburseExpense, net: income - selfExpense, count };
}

// 経費だけの合計（経費ページ用）
export interface ExpenseTotals {
  total: number; // 経費合計
  self: number; // 自己負担（請負）
  reimburse: number; // 立替（常駐・要請求）
  count: number;
}

export function summarizeExpenses(entries: Entry[]): ExpenseTotals {
  let total = 0;
  let self = 0;
  let reimburse = 0;
  let count = 0;
  for (const e of entries) {
    if (e.kind !== 'expense') continue;
    const amt = e.amount || 0;
    total += amt;
    if (workTypeOf(e) === '常駐') reimburse += amt;
    else self += amt;
    count += 1;
  }
  return { total, self, reimburse, count };
}

// 1日ぶんの内訳（カレンダー表示用）
export interface DayInfo {
  ukeoi: number; // 請負の売上
  jouchu: number; // 常駐の売上
  expense: number; // その日の経費合計
  photo: boolean;
}

export function byDateInfo(entries: Entry[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();
  const touch = (date: string) => {
    const cur = map.get(date) ?? { ukeoi: 0, jouchu: 0, expense: 0, photo: false };
    map.set(date, cur);
    return cur;
  };
  for (const e of entries) {
    if (e.kind === 'income') {
      const cur = touch(e.date);
      if (workTypeOf(e) === '常駐') cur.jouchu += e.amount || 0;
      else cur.ukeoi += e.amount || 0;
      cur.expense += e.expense || 0; // 旧データ互換
      if (e.photos.length > 0) cur.photo = true;
    } else if (e.kind === 'expense') {
      const cur = touch(e.date);
      cur.expense += e.amount || 0;
      if (e.photos.length > 0) cur.photo = true;
    }
  }
  return map;
}

// 経費だけの1日合計（経費カレンダー用）
export function expenseByDate(entries: Entry[]): Map<string, { total: number; photo: boolean }> {
  const map = new Map<string, { total: number; photo: boolean }>();
  for (const e of entries) {
    if (e.kind !== 'expense') continue;
    const cur = map.get(e.date) ?? { total: 0, photo: false };
    cur.total += e.amount || 0;
    if (e.photos.length > 0) cur.photo = true;
    map.set(e.date, cur);
  }
  return map;
}
