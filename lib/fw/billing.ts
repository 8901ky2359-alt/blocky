// 締め日・入金日の計算と、次回入金予定・請求のまとめ

import { Sale, Terms } from './types';
import { withTax } from '../tax';

export const CUTOFF_DAYS = [5, 10, 15, 20, 25, 31];
export const MONTH_END = 31;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDay(y: number, m: number): number {
  return new Date(y, m, 0).getDate(); // m は 1〜12
}

// その月の「◯日」（31=月末。短い月は月末に丸める）
function dayOf(y: number, m: number, day: number): string {
  return `${y}-${pad(m)}-${pad(Math.min(day, lastDay(y, m)))}`;
}

function addMonths(y: number, m: number, delta: number): [number, number] {
  const d = new Date(y, m - 1 + delta, 1);
  return [d.getFullYear(), d.getMonth() + 1];
}

export function dayLabel(day: number): string {
  return day === MONTH_END ? '月末' : `${day}日`;
}

export function cutoffLabel(cutoff: number): string {
  return `${dayLabel(cutoff)}締め`;
}

const OFFSET_LABEL = ['当月', '翌月', '翌々月'];

export function termsLabel(t: Terms): string {
  return `${cutoffLabel(t.cutoff)} ・ ${OFFSET_LABEL[t.payOffset] ?? '翌月'}${dayLabel(t.payDay)}入金`;
}

// 作業日が含まれる締めの日付（作業日以降で最初の締め日）
export function closingDate(date: string, cutoff: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const thisMonth = Math.min(cutoff, lastDay(y, m));
  if (d <= thisMonth) return dayOf(y, m, cutoff);
  const [ny, nm] = addMonths(y, m, 1);
  return dayOf(ny, nm, cutoff);
}

// 締め日から入金日を出す
export function paymentDate(closing: string, t: Terms): string {
  const [y, m] = closing.split('-').map(Number);
  const [py, pm] = addMonths(y, m, t.payOffset);
  return dayOf(py, pm, t.payDay);
}

export function saleClosing(s: Sale): string {
  return closingDate(s.date, s.cutoff);
}

export function salePayment(s: Sale): string {
  return paymentDate(saleClosing(s), s);
}

export function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

export function sum(sales: Sale[]): number {
  return sales.reduce((n, s) => n + s.amount, 0);
}

export interface PaymentGroup {
  payDate: string;
  closing: string;
  cutoff: number;
  sales: Sale[];
  subtotal: number; // 税抜
  total: number; // 税込
}

export interface Amounts {
  count: number;
  subtotal: number; // 税抜
  total: number; // 税込
}

export interface NextPayment {
  subtotal: number; // 税抜
  total: number; // 税込
  groups: PaymentGroup[];
  approved: Amounts;
  pending: Amounts;
  sales: Sale[];
}

// 件数・税抜・税込をまとめて出す
export function amounts(sales: Sale[]): Amounts {
  const subtotal = sum(sales);
  return { count: sales.length, subtotal, total: withTax(subtotal) };
}

// 次回入金予定：未入金の売上を締め日のルールごとに分け、それぞれ一番早い入金日の分を合計する
export function nextPayment(sales: Sale[]): NextPayment {
  const byRule = new Map<string, Map<string, Sale[]>>();
  for (const s of sales) {
    if (s.paid) continue;
    const rule = `${s.cutoff}-${s.payOffset}-${s.payDay}`;
    const pay = salePayment(s);
    const dates = byRule.get(rule) ?? new Map<string, Sale[]>();
    dates.set(pay, [...(dates.get(pay) ?? []), s]);
    byRule.set(rule, dates);
  }
  const groups: PaymentGroup[] = [];
  for (const dates of byRule.values()) {
    const first = [...dates.keys()].sort()[0];
    const list = dates.get(first)!;
    groups.push({
      payDate: first,
      closing: saleClosing(list[0]),
      cutoff: list[0].cutoff,
      sales: list,
      subtotal: sum(list),
      total: withTax(sum(list)),
    });
  }
  groups.sort((a, b) => (a.payDate < b.payDate ? -1 : a.payDate > b.payDate ? 1 : a.cutoff - b.cutoff));
  const all = groups.flatMap((g) => g.sales);
  return {
    subtotal: sum(all),
    total: groups.reduce((n, g) => n + g.total, 0),
    groups,
    approved: amounts(all.filter((s) => s.status === 'approved')),
    pending: amounts(all.filter((s) => s.status === 'pending')),
    sales: all,
  };
}

// 入力した人 × 請求先 × 締めごとのまとまり（1枚の請求書の単位。請求書は入力した本人の名前で出す）
export interface InvoiceGroup {
  key: string;
  userId: string;
  userName: string; // 発行する人（売上を入れた人）
  clientName: string;
  closing: string;
  cutoff: number;
  payDate: string;
  sales: Sale[];
  subtotal: number;
  tax: number;
  total: number;
  paid: boolean; // 全件入金済み
}

export function invoiceGroups(sales: Sale[]): InvoiceGroup[] {
  const map = new Map<string, Sale[]>();
  for (const s of sales) {
    const key = `${s.userId}|${s.clientName}|${saleClosing(s)}`;
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const subtotal = sum(sorted);
      const total = withTax(subtotal);
      return {
        key,
        userId: sorted[0].userId,
        userName: sorted[0].userName,
        clientName: sorted[0].clientName,
        closing: saleClosing(sorted[0]),
        cutoff: sorted[0].cutoff,
        payDate: salePayment(sorted[0]),
        sales: sorted,
        subtotal,
        tax: total - subtotal,
        total,
        paid: sorted.every((s) => s.paid),
      };
    })
    .sort((a, b) => (a.closing < b.closing ? -1 : a.closing > b.closing ? 1 : a.clientName.localeCompare(b.clientName, 'ja')));
}
