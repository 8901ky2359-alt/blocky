'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Card, Chip, SaleRow, Section } from '@/components/fw/ui';
import { salePayment, sum } from '@/lib/fw/billing';
import { useSales } from '@/lib/fw/useSales';
import { Sale, WORK_TYPES, WorkType } from '@/lib/fw/types';
import { WEEK_LABELS, calendarCells, currentMonthKey, formatJpDate, formatJpMonth, manYen, shiftMonth, todayStr, yen } from '@/lib/format';
import { withTax } from '@/lib/tax';

export default function CalendarPage() {
  return <AuthGate role="admin">{() => <CalendarInner />}</AuthGate>;
}

function CalendarInner() {
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

  // 日付ごとの売上と、入金予定（未入金の分）
  const byDay = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of scoped) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [scoped]);
  const payByDay = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of scoped) {
      if (s.paid) continue;
      const d = salePayment(s);
      m.set(d, [...(m.get(d) ?? []), s]);
    }
    return m;
  }, [scoped]);

  const monthSales = scoped.filter((s) => s.date.startsWith(month));
  // 区分（常駐・請負・作業員手配）ごとの月合計と、請求先別の内訳
  const byType = WORK_TYPES.map((t) => {
    const list = monthSales.filter((s) => s.workType === t);
    const bills = new Map<string, Sale[]>();
    for (const s of list) bills.set(s.clientName, [...(bills.get(s.clientName) ?? []), s]);
    return { type: t, total: sum(list), bills: [...bills.entries()].sort((a, b) => sum(b[1]) - sum(a[1])) };
  });
  const opened = byType.find((t) => t.type === openType);
  const cells = calendarCells(month);
  const today = todayStr();

  const daySales = byDay.get(day) ?? [];
  const dayPay = payByDay.get(day) ?? [];

  return (
    <Screen title="カレンダー" back={{ href: '/', label: '総合管理画面' }}>
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
            <span className="block text-xs text-fw-muted tabular-nums">
              売上 {yen(sum(monthSales))}（税抜）・ {monthSales.length}件
            </span>
          </span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="次の月">
            ›
          </button>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-fw-fill p-0.5 text-center">
          {byType.map((t) => (
            <button
              key={t.type}
              onClick={() => setOpenType(openType === t.type ? null : t.type)}
              className={`rounded-xl px-1 py-2 ${openType === t.type ? 'bg-fw-card shadow-sm' : ''}`}
            >
              <span className="block text-[11px] text-fw-muted">
                {t.type} {openType === t.type ? '▲' : '▾'}
              </span>
              <span className="block text-[14px] font-bold tabular-nums">{yen(t.total)}</span>
            </button>
          ))}
        </div>
        {opened && (
          <div className="mb-3 grid gap-1 rounded-xl bg-fw-fill px-3 py-2 text-[13px]">
            <span className="text-[11px] font-semibold text-fw-muted">{opened.type}・請求先別</span>
            {opened.bills.length === 0 ? (
              <span className="text-center text-xs text-fw-muted">この月の記録はありません</span>
            ) : (
              opened.bills.map(([name, list]) => (
                <span key={name} className="flex justify-between gap-2">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {yen(sum(list))}
                    <span className="ml-1 font-normal text-fw-muted">（{list.length}件）</span>
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
                className={`flex h-[58px] flex-col items-center rounded-lg pt-1 text-[13px] ${d === day ? 'bg-fw-green/15 ring-1 ring-fw-green' : ''}`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full tabular-nums ${d === today ? 'bg-fw-green font-bold text-white' : i % 7 === 5 ? 'text-fw-blue' : i % 7 === 6 ? 'text-fw-red' : ''}`}
                >
                  {Number(d.slice(8))}
                </span>
                {byDay.has(d) && <span className="text-[10px] font-bold tabular-nums">{manYen(sum(byDay.get(d)!))}</span>}
                {payByDay.has(d) && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-fw-blue" aria-label="入金予定" />}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-fw-muted">
          数字＝その日の売上（税抜）
          <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-fw-blue" />
          ＝入金予定日
        </p>
      </Card>

      <Section title={`${formatJpDate(day)}（押すと直せます）`}>
        {dayPay.length > 0 && (
          <Card className="mb-3 flex items-center justify-between p-4">
            <span className="text-sm">
              入金予定 <span className="text-fw-muted">{[...new Set(dayPay.map((s) => s.clientName))].join('・')}</span>
            </span>
            <span className="font-bold text-fw-blue tabular-nums">{yen(withTax(sum(dayPay)))}</span>
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
