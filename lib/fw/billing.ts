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

// 入金のまとめ：2026年10月以降、5日以外の日（25日・月末など）に決済予定だった分は、翌月5日にまとめて入金される。
// 5日払いのものはこれまでどおり。それより前の分は元の入金日のまま
export const CONSOLIDATE_FROM = '2026-10-01';
export const CONSOLIDATED_DAY = 5;

export function consolidatedDate(scheduled: string): string {
  const [y, m, d] = scheduled.split('-').map(Number);
  if (scheduled < CONSOLIDATE_FROM || d === CONSOLIDATED_DAY) return scheduled;
  if (d < CONSOLIDATED_DAY) return dayOf(y, m, CONSOLIDATED_DAY);
  const [ny, nm] = addMonths(y, m, 1);
  return dayOf(ny, nm, CONSOLIDATED_DAY);
}

// まとめで入金日が動いたか（元の決済予定日を並べて見せる）
export function isConsolidated(scheduled: string): boolean {
  return consolidatedDate(scheduled) !== scheduled;
}

export function saleClosing(s: Sale): string {
  return closingDate(s.date, s.cutoff);
}

// 元の決済予定日（請求先の「入金日」どおり）
export function saleScheduled(s: Sale): string {
  return paymentDate(saleClosing(s), s);
}

// 実際に入金される日（まとめ後）
export function salePayment(s: Sale): string {
  return consolidatedDate(saleScheduled(s));
}

export function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

export function sum(sales: Sale[]): number {
  return sales.reduce((n, s) => n + s.amount, 0);
}

export interface PaymentGroup {
  payDate: string; // 実際の入金日（まとめ後）
  scheduled: string; // 元の決済予定日
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
  payDate: string | null; // 次の入金日（まとめ後）
  following: { payDate: string; subtotal: number; total: number } | null; // その次の入金日
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

// 入金日（まとめ後）の売上を、元の決済予定日・締めごとに分ける
export function paymentGroups(sales: Sale[]): PaymentGroup[] {
  const map = new Map<string, Sale[]>();
  for (const s of sales) {
    const key = `${saleScheduled(s)}|${saleClosing(s)}|${s.cutoff}`;
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return [...map.values()]
    .map((list) => ({
      payDate: salePayment(list[0]),
      scheduled: saleScheduled(list[0]),
      closing: saleClosing(list[0]),
      cutoff: list[0].cutoff,
      sales: list,
      subtotal: sum(list),
      total: withTax(sum(list)),
    }))
    .sort((a, b) =>
      a.payDate < b.payDate ? -1 : a.payDate > b.payDate ? 1 : a.scheduled < b.scheduled ? -1 : a.scheduled > b.scheduled ? 1 : a.cutoff - b.cutoff,
    );
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 未入金の入金日（まとめ後）を早い順に
export function unpaidPayDates(sales: Sale[]): string[] {
  return [...new Set(sales.filter((s) => !s.paid).map(salePayment))].sort();
}

// 次の入金日：未入金のうち今日以降で一番近い日（無ければ一番最後の未入金の日）。
// ホーム・カレンダー・請求書作成で同じ日を使う
export function nextPayDate(sales: Sale[], today = localToday()): string | null {
  const dates = unpaidPayDates(sales);
  return dates.find((d) => d >= today) ?? dates[dates.length - 1] ?? null;
}

// 次回入金予定：次の入金日に入る未入金の売上をすべて合計する（カレンダーのその日の金額と同じ）
export function nextPayment(sales: Sale[], today = localToday()): NextPayment {
  const payDate = nextPayDate(sales, today);
  const unpaid = sales.filter((s) => !s.paid);
  const groups = paymentGroups(payDate ? unpaid.filter((s) => salePayment(s) === payDate) : []);
  const all = groups.flatMap((g) => g.sales);
  const dates = unpaidPayDates(sales);
  const nextDate = payDate ? dates[dates.indexOf(payDate) + 1] : undefined;
  const nextSales = nextDate ? unpaid.filter((s) => salePayment(s) === nextDate) : [];
  return {
    payDate,
    following: nextDate ? { payDate: nextDate, subtotal: sum(nextSales), total: paymentGroups(nextSales).reduce((n, g) => n + g.total, 0) } : null,
    subtotal: sum(all),
    total: groups.reduce((n, g) => n + g.total, 0),
    groups,
    approved: amounts(all.filter((s) => s.status === 'approved')),
    pending: amounts(all.filter((s) => s.status === 'pending')),
    sales: all,
  };
}

// 入力した人 × 請求先 × 締め × 決済予定日ごとのまとまり（1枚の請求書の単位。請求書は入力した本人の名前で出す）
// 同じ請求先・同じ締めでも、翌月25日払いと翌月末払いのように決済予定日が違えば別の請求書にする
export interface InvoiceGroup {
  key: string;
  userId: string;
  userName: string; // 発行する人（売上を入れた人）
  clientName: string;
  closing: string;
  cutoff: number;
  payDate: string; // 実際の入金日（まとめ後）
  scheduled: string; // 元の決済予定日
  sales: Sale[];
  subtotal: number;
  tax: number;
  total: number;
  paid: boolean; // 全件入金済み
}

export function invoiceGroups(sales: Sale[]): InvoiceGroup[] {
  const map = new Map<string, Sale[]>();
  for (const s of sales) {
    const key = `${s.userId}|${s.clientName}|${saleClosing(s)}|${saleScheduled(s)}`;
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
        scheduled: saleScheduled(sorted[0]),
        sales: sorted,
        subtotal,
        tax: total - subtotal,
        total,
        paid: sorted.every((s) => s.paid),
      };
    })
    // 請求先 → 締め日 → 決済予定日 の順に並べる（同じ請求先の請求書が続けて並ぶ）
    .sort(
      (a, b) =>
        a.clientName.localeCompare(b.clientName, 'ja') ||
        (a.closing < b.closing ? -1 : a.closing > b.closing ? 1 : 0) ||
        (a.scheduled < b.scheduled ? -1 : a.scheduled > b.scheduled ? 1 : 0) ||
        a.userName.localeCompare(b.userName, 'ja'),
    );
}
