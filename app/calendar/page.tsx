'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import Link from 'next/link';
import { Card, Chip, SaleRow, Section, TaxedYen, WORK_TYPE_DOT, WORK_TYPE_TEXT, useShowTax } from '@/components/fw/ui';
import { cutoffLabel, isConsolidated, paymentGroups, salePayment, saleScheduled, shortDate, sum } from '@/lib/fw/billing';
import { useSales } from '@/lib/fw/useSales';
import { Sale, User, WORK_TYPES, WorkType } from '@/lib/fw/types';
import { WEEK_LABELS, calendarCells, currentMonthKey, formatJpDate, formatJpMonth, manYen, shiftMonth, todayStr, yen } from '@/lib/format';
import { withTax } from '@/lib/tax';

export default function CalendarPage() {
  // 仲間も使える（サーバーから自分の売上しか届かないので、自分の分だけのカレンダーになる）
  return <AuthGate>{(user) => <CalendarInner user={user} />}</AuthGate>;
}

function CalendarInner({ user }: { user: User }) {
  const isAdmin = user.role === 'admin';
  // 入金額の表示：総合管理画面は税込、仲間は税抜
  const showTax = useShowTax();
  const money = (n: number) => (showTax ? withTax(n) : n);
  const moneyLabel = showTax ? '税込' : '税抜';
  // 仲間は請負・常駐のみ（作業員手配は総合管理画面だけ）
  const types = isAdmin ? WORK_TYPES : WORK_TYPES.filter((t) => t !== '作業員手配');
  const { sales, loading } = useSales();
  const [month, setMonth] = useState(currentMonthKey());
  const [person, setPerson] = useState('all');
  const [day, setDay] = useState<string>(todayStr());
  const [openType, setOpenType] = useState<WorkType | null>(null);

  // 売上を直して戻ってきたとき（?day=YYYY-MM-DD）は、その日を開いたままにする
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('day');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setDay(d);
      setMonth(d.slice(0, 7));
    }
  }, []);

  const people = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sales) m.set(s.userId, s.userName);
    return [...m.entries()];
  }, [sales]);
  const scoped = useMemo(() => sales.filter((s) => person === 'all' || s.userId === person), [sales, person]);

  // 日付ごとの売上と、入金（入金済みの過去分も含む。25日・月末の決済予定分は翌月5日にまとめて入金）
  const byDay = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of scoped) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [scoped]);
  const payByDay = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of scoped) {
      const d = salePayment(s);
      m.set(d, [...(m.get(d) ?? []), s]);
    }
    return m;
  }, [scoped]);
  // 元の決済予定日（まとめで入金日が動いた分だけ。これまでのサイクルの目安として薄く出す）
  const schedByDay = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of scoped) {
      const d = saleScheduled(s);
      if (isConsolidated(d)) m.set(d, [...(m.get(d) ?? []), s]);
    }
    return m;
  }, [scoped]);

  const monthSales = scoped.filter((s) => s.date.startsWith(month));
  // この月に入る（入った）お金：入金済みと入金予定に分ける
  const monthPay = [...payByDay.entries()].filter(([d]) => d.startsWith(month)).flatMap(([, l]) => l);
  const monthPaid = monthPay.filter((s) => s.paid);
  const monthUnpaid = monthPay.filter((s) => !s.paid);
  // 区分（常駐・請負・作業員手配）ごとの月合計と、請求先別の内訳
  const byType = types.map((t) => {
    const list = monthSales.filter((s) => s.workType === t);
    const bills = new Map<string, Sale[]>();
    for (const s of list) bills.set(s.clientName, [...(bills.get(s.clientName) ?? []), s]);
    return { type: t, total: sum(list), bills: [...bills.entries()].sort((a, b) => sum(b[1]) - sum(a[1])) };
  });
  const opened = byType.find((t) => t.type === openType);
  const cells = calendarCells(month);
  const today = todayStr();

  // その日の一覧は 請負 → 常駐 → 作業員手配 の順（同じ区分の中は入力順）
  const daySales = [...(byDay.get(day) ?? [])].sort(
    (a, b) => WORK_TYPES.indexOf(a.workType) - WORK_TYPES.indexOf(b.workType) || a.createdAt - b.createdAt,
  );
  const dayPay = payByDay.get(day) ?? [];
  const daySched = schedByDay.get(day) ?? [];

  return (
    <Screen title="カレンダー" back={{ href: '/', label: isAdmin ? '総合管理画面' : '管理画面' }}>
      {people.length > 1 && (
        <div className="mx-4 mb-3 flex flex-wrap gap-2">
          <Chip on={person === 'all'} onClick={() => setPerson('all')}>
            全員
          </Chip>
          {people.map(([id, name]) => (
            <Chip key={id} on={person === id} onClick={() => setPerson(id)}>
              {name}
            </Chip>
          ))}
        </div>
      )}

      <Card className="mb-5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="前の月">
            ‹
          </button>
          <span className="text-center">
            <span className="block text-lg font-bold">{formatJpMonth(month)}</span>
            <span className="block text-[11px] text-fw-muted tabular-nums">
              {showTax && `税込 ${yen(withTax(sum(monthSales)))} ・ `}税抜 {yen(sum(monthSales))} ・ {monthSales.length}件
            </span>
            {monthPay.length > 0 && (
              <span className="block text-[11px] tabular-nums">
                入金{monthPaid.length > 0 && <span className="text-fw-teal"> 済み {yen(money(sum(monthPaid)))}</span>}
                {monthPaid.length > 0 && monthUnpaid.length > 0 && <span className="text-fw-muted"> ・</span>}
                {monthUnpaid.length > 0 && <span className="text-fw-orange"> 予定 {yen(money(sum(monthUnpaid)))}</span>}
                <span className="text-fw-muted">（{moneyLabel}）</span>
              </span>
            )}
          </span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="次の月">
            ›
          </button>
        </div>
        <div className={`mb-3 grid ${types.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1 rounded-xl bg-fw-fill p-0.5 text-center`}>
          {byType.map((t) => (
            <button
              key={t.type}
              onClick={() => setOpenType(openType === t.type ? null : t.type)}
              className={`rounded-xl px-1 py-2 ${openType === t.type ? 'bg-fw-card shadow-sm' : ''}`}
            >
              <span className="block text-[11px] text-fw-muted">
                <span className={`mr-1 inline-block h-2 w-2 rounded-full ${WORK_TYPE_DOT[t.type]}`} />
                {t.type} {openType === t.type ? '▲' : '▾'}
              </span>
              <TaxedYen ex={t.total} main="ex" className={`text-[14px] font-bold ${WORK_TYPE_TEXT[t.type]}`} />
            </button>
          ))}
        </div>
        {opened && (
          <div className="mb-3 grid gap-1 rounded-xl bg-fw-fill px-3 py-2 text-[13px]">
            <span className={`text-[11px] font-semibold ${WORK_TYPE_TEXT[opened.type]}`}>{opened.type}・請求先別</span>
            {opened.bills.length === 0 ? (
              <span className="text-center text-xs text-fw-muted">この月の記録はありません</span>
            ) : (
              opened.bills.map(([name, list]) => (
                <span key={name} className="flex justify-between gap-2">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 text-right font-semibold tabular-nums">
                    {yen(sum(list))}
                    <span className="ml-1 font-normal text-fw-muted">
                      {showTax && `税込 ${yen(withTax(sum(list)))}`}（{list.length}件）
                    </span>
                  </span>
                </span>
              ))
            )}
          </div>
        )}
        <div className="grid grid-cols-7 text-center text-[11px] text-fw-muted">
          {WEEK_LABELS.map((w, i) => (
            <span key={w} className={i === 5 ? 'text-fw-blue' : i === 6 ? 'text-fw-red' : ''}>
              {w}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5">
          {cells.map((d, i) =>
            d ? (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`flex min-h-[64px] flex-col items-center rounded-lg pb-1 pt-1 text-[13px] ${d === day ? 'bg-fw-green/15 ring-1 ring-fw-green' : ''}`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full tabular-nums ${d === today ? 'bg-fw-green font-bold text-white' : i % 7 === 5 ? 'text-fw-blue' : i % 7 === 6 ? 'text-fw-red' : ''}`}
                >
                  {Number(d.slice(8))}
                </span>
                {/* その日の売上を区分ごとの色で（常駐・請負・作業員手配） */}
                {types.map((t) => {
                  const list = (byDay.get(d) ?? []).filter((s) => s.workType === t);
                  return list.length ? (
                    <span key={t} className={`text-[10px] font-bold leading-tight tabular-nums ${WORK_TYPE_TEXT[t]}`}>
                      {manYen(sum(list))}
                    </span>
                  ) : null;
                })}
                {payByDay.has(d) &&
                  (() => {
                    // 未入金が残っていればオレンジ（入金予定）、すべて入金済みなら青緑
                    const list = payByDay.get(d)!;
                    const done = list.every((s) => s.paid);
                    return (
                      <span
                        className={`mt-0.5 rounded px-0.5 text-[10px] font-bold leading-tight tabular-nums ${done ? 'bg-fw-teal/15 text-fw-teal' : 'bg-fw-orange/15 text-fw-orange'}`}
                        aria-label={done ? '入金済み' : '入金予定'}
                      >
                        {manYen(money(sum(list)))}
                      </span>
                    );
                  })()}
                {schedByDay.has(d) && (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full border border-fw-muted" aria-label="決済予定（翌月5日にまとめて入金）" />
                )}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-fw-muted">
          <span>数字＝その日の売上（税抜）</span>
          {types.map((t) => (
            <span key={t} className={`font-semibold ${WORK_TYPE_TEXT[t]}`}>
              ■{t === '作業員手配' ? '作業員手配（雇用）' : t}
            </span>
          ))}
          <span className="font-semibold text-fw-orange">■入金予定（{moneyLabel}）</span>
          <span className="font-semibold text-fw-teal">■入金済み（{moneyLabel}）</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full border border-fw-muted" />
            決済予定（翌月5日にまとめて入金）
          </span>
        </p>
      </Card>

      <Section
        title={`${formatJpDate(day)}（押すと直せます）`}
        right={
          <Link
            href={`/sales?date=${day}&back=${encodeURIComponent(`/calendar?day=${day}`)}`}
            className="shrink-0 whitespace-nowrap rounded-full bg-fw-green px-3 py-1 text-[13px] font-bold text-white"
          >
            ＋ この日に入力
          </Link>
        }
      >
        {dayPay.length > 0 && (
          <Card className="mb-3 grid gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{dayPay.every((s) => s.paid) ? '入金済み' : dayPay.some((s) => s.paid) ? '入金（一部入金済み）' : '入金予定'}</span>
              <TaxedYen ex={sum(dayPay)} className={`text-right font-bold ${dayPay.every((s) => s.paid) ? 'text-fw-teal' : 'text-fw-orange'}`} />
            </div>
            {/* 元の決済予定ごとの内訳（25日・月末の分はここにまとめて入金） */}
            {paymentGroups(dayPay).map((g) => (
              <div key={`${g.scheduled}-${g.closing}-${g.cutoff}`} className="flex items-start justify-between gap-2 border-t border-fw-line pt-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block">
                    {isConsolidated(g.scheduled) ? `${shortDate(g.scheduled)} 決済予定分` : `${shortDate(g.scheduled)} 入金分`}
                    <span className="text-fw-muted">
                      {' '}
                      ・ {shortDate(g.closing)} {cutoffLabel(g.cutoff)}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] text-fw-muted">
                    {g.sales.every((s) => s.paid) && <b className="mr-1 text-fw-teal">✓入金済み</b>}
                    {[...new Set(g.sales.map((s) => s.clientName))].join('・')}
                  </span>
                </span>
                <TaxedYen ex={g.subtotal} inc={g.total} className="shrink-0 text-right" />
              </div>
            ))}
          </Card>
        )}
        {daySched.length > 0 && (
          <Card className="mb-3 grid gap-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                決済予定 <span className="text-fw-muted">{[...new Set(daySched.map((s) => s.clientName))].join('・')}</span>
              </span>
              <TaxedYen ex={sum(daySched)} className="text-right font-semibold text-fw-muted" />
            </div>
            <span className="text-[12px] text-fw-muted">
              {daySched.every((s) => s.paid)
                ? `${shortDate(salePayment(daySched[0]))} にまとめて入金済みです`
                : `この日の入金はなく、${shortDate(salePayment(daySched[0]))} にまとめて入金されます`}
            </span>
          </Card>
        )}
        <Card>
          {loading ? (
            <p className="p-6 text-center text-sm text-fw-muted">読み込み中…</p>
          ) : daySales.length === 0 ? (
            <p className="p-6 text-center text-sm text-fw-muted">この日の売上はありません</p>
          ) : (
            daySales.map((s) => (
              <SaleRow
                key={s.id}
                sale={s}
                showUser
                onClick={() => (location.href = `/sales?edit=${s.id}&back=${encodeURIComponent(`/calendar?day=${day}`)}`)}
              />
            ))
          )}
        </Card>
      </Section>
    </Screen>
  );
}
