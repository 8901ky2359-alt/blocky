'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Card, Chip, Section, Segmented, TaxedYen, useShowTax } from '@/components/fw/ui';
import OutputSheet from '@/components/fw/OutputSheet';
import ProfileSheet from '@/components/fw/ProfileSheet';
import { getProfile, setPaid } from '@/lib/fw/api';
import { InvoiceGroup, cutoffLabel, invoiceGroups, nextPayDate, saleClosing, salePayment, shortDate } from '@/lib/fw/billing';
import { claudePrompt, lineText } from '@/lib/fw/invoiceText';
import { useSales } from '@/lib/fw/useSales';
import { Profile, User } from '@/lib/fw/types';
import { currentMonthKey, formatJpMonth, shiftMonth, todayStr, yen } from '@/lib/format';

export default function InvoicePage() {
  return <AuthGate>{(user) => <InvoiceInner user={user} />}</AuthGate>;
}

type Tab = 'next' | 'cutoff' | 'client' | 'all';

const EMPTY_PROFILE: Profile = { issuerName: '', tradeName: '', address: '', phone: '', bank: '', invoiceNo: '' };

const total = (gs: InvoiceGroup[]) => gs.reduce((n, g) => n + g.total, 0); // 税込
const subtotal = (gs: InvoiceGroup[]) => gs.reduce((n, g) => n + g.subtotal, 0); // 税抜
const count = (gs: InvoiceGroup[]) => gs.reduce((n, g) => n + g.sales.length, 0);

function InvoiceInner({ user }: { user: User }) {
  const { sales, loading, reload } = useSales();
  const [month, setMonth] = useState(currentMonthKey());
  const [person, setPerson] = useState<string>('all');
  const [tab, setTab] = useState<Tab>('next');
  const [offCutoffs, setOffCutoffs] = useState<number[]>([]); // 選択を外した締め日
  const [client, setClient] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [sheet, setSheet] = useState<'line' | 'claude' | 'profile' | null>(null);

  const [payPick, setPayPick] = useState<string | null>(null); // 入金日ページで選んでいる入金日

  // ホームの「この内容で請求書を作る」から来たとき（?tab=next、入金日の指定は ?pay=YYYY-MM-DD）
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('tab');
    if (t === 'next' || t === 'cutoff' || t === 'client' || t === 'all') setTab(t);
    const pay = q.get('pay');
    if (pay && /^\d{4}-\d{2}-\d{2}$/.test(pay)) setPayPick(pay);
  }, []);

  useEffect(() => {
    getProfile()
      .then((r) => setProfile({ ...EMPTY_PROFILE, ...r.profile }))
      .catch(() => {});
  }, []);

  const isAdmin = user.role === 'admin';
  const showTax = useShowTax();
  const people = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sales) m.set(s.userId, s.userName);
    return [...m.entries()];
  }, [sales]);

  // その月に締まる分（＝その月の請求）
  const groups = useMemo(
    () =>
      invoiceGroups(
        sales.filter((s) => (person === 'all' || s.userId === person) && saleClosing(s).startsWith(month)),
      ),
    [sales, person, month],
  );
  // 入金日ごとのページ：1ページ＝1つの入金日（11/5入金の分だけ、次のページは12/5入金の分だけ）
  const personSales = useMemo(() => sales.filter((s) => person === 'all' || s.userId === person), [sales, person]);
  const payDates = useMemo(() => [...new Set(personSales.map(salePayment))].sort(), [personSales]);
  // 最初に開くのは、ホームの「次回入金予定」と同じ入金日
  const defaultPay = useMemo(() => nextPayDate(personSales) ?? payDates[payDates.length - 1] ?? null, [personSales, payDates]);
  const payDate = payPick && payDates.includes(payPick) ? payPick : defaultPay;
  const payIndex = payDate ? payDates.indexOf(payDate) : -1;
  const prevPay = payIndex > 0 ? payDates[payIndex - 1] : null;
  const nextPay = payIndex >= 0 && payIndex < payDates.length - 1 ? payDates[payIndex + 1] : null;
  const nextGroups = useMemo(
    () => (payDate ? invoiceGroups(personSales.filter((s) => salePayment(s) === payDate)) : []),
    [personSales, payDate],
  );
  const cutoffs = useMemo(() => [...new Set(groups.map((g) => g.cutoff))].sort((a, b) => a - b), [groups]);
  const selectedCutoffs = cutoffs.filter((c) => !offCutoffs.includes(c));
  const clients = useMemo(() => {
    const m = new Map<string, InvoiceGroup[]>();
    for (const g of groups) m.set(g.clientName, [...(m.get(g.clientName) ?? []), g]);
    return [...m.entries()].sort((a, b) => total(b[1]) - total(a[1]));
  }, [groups]);

  // 出力に使う範囲（今見ているもの）
  const [picked, setPicked] = useState<string[]>([]); // チェックした請求書（key）
  const togglePick = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  // 今見ている範囲の請求書。チェックがあればチェックしたものだけで文章を作る
  const viewGroups =
    tab === 'next'
      ? nextGroups
      : tab === 'cutoff'
      ? groups.filter((g) => selectedCutoffs.includes(g.cutoff))
      : tab === 'client' && client
        ? groups.filter((g) => g.clientName === client)
        : groups;
  const pickedGroups = viewGroups.filter((g) => picked.includes(g.key));
  const scope = pickedGroups.length > 0 ? pickedGroups : viewGroups;

  const issuer = profile.issuerName || user.name;
  const title =
    tab === 'next' ? (payDate ? `${shortDate(payDate)}入金予定分` : '入金予定分') : `${formatJpMonth(month)}締め分`;

  async function togglePaid(g: InvoiceGroup) {
    await setPaid(g.sales.map((s) => s.id), !g.paid).catch(() => alert('変更できませんでした'));
    await reload();
  }

  return (
    <Screen
      title="請求書作成"
      back={{ href: '/', label: 'ホーム' }}
      action={
        <button onClick={() => setSheet('profile')} className="py-2 text-[15px] text-fw-green">
          発行者情報
        </button>
      }
      footer={
        <>
          {pickedGroups.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums">
                <b>{pickedGroups.length}枚を選択中</b>
                <span className="ml-1.5 text-fw-muted">
                  {[...new Set(pickedGroups.map((g) => g.clientName))].join('・')} ・ {yen(showTax ? total(pickedGroups) : subtotal(pickedGroups))}
                  {showTax ? '（税込）' : '（税抜）'}
                </span>
              </span>
              <button onClick={() => setPicked([])} className="shrink-0 pl-2 font-semibold text-fw-green">
                選択を解除
              </button>
            </div>
          )}
          <button
            disabled={scope.length === 0}
            onClick={() => setSheet('line')}
            className="w-full rounded-xl bg-fw-line_app py-3 font-bold text-white disabled:opacity-40"
          >
            {pickedGroups.length > 0 ? `選んだ${pickedGroups.length}枚でLINEの文章を作る` : 'LINEで共有する文章を作る'}
          </button>
          <button
            disabled={scope.length === 0}
            onClick={() => setSheet('claude')}
            className="w-full rounded-xl bg-fw-claude py-3 font-bold text-white disabled:opacity-40"
          >
            {pickedGroups.length > 0 ? `選んだ${pickedGroups.length}枚でClaude用プロンプトを作る` : 'Claude用の請求書プロンプトを作る'}
          </button>
        </>
      }
    >
      {tab === 'next' ? (
        <div className="mx-4 mb-3 flex items-center justify-between">
          <button
            onClick={() => prevPay && setPayPick(prevPay)}
            disabled={!prevPay}
            className="px-3 py-1 text-2xl text-fw-green disabled:opacity-25"
            aria-label="前の入金日"
          >
            ‹
          </button>
          <span className="text-center">
            <span className="block text-lg font-bold">{title}</span>
            {payDate && payDate.slice(0, 4) !== todayStr().slice(0, 4) && (
              <span className="block text-[11px] text-fw-muted">{payDate.slice(0, 4)}年</span>
            )}
          </span>
          <button
            onClick={() => nextPay && setPayPick(nextPay)}
            disabled={!nextPay}
            className="px-3 py-1 text-2xl text-fw-green disabled:opacity-25"
            aria-label="次の入金日"
          >
            ›
          </button>
        </div>
      ) : (
        <div className="mx-4 mb-3 flex items-center justify-between">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="前の月">
            ‹
          </button>
          <span className="text-lg font-bold">{title}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="次の月">
            ›
          </button>
        </div>
      )}

      {isAdmin && people.length > 1 && (
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

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'next', label: '次回入金' },
          { value: 'cutoff', label: '締め日別' },
          { value: 'client', label: '請求先別' },
          { value: 'all', label: '全体' },
        ]}
      />

      {loading ? (
        <p className="p-6 text-center text-sm text-fw-muted">読み込み中…</p>
      ) : tab === 'next' ? (
        nextGroups.length === 0 ? (
          <Card className="p-6 text-center text-sm text-fw-muted">入金予定の売上はありません</Card>
        ) : (
          <>
            <TotalCard
              label={`${title}の合計`}
              groups={nextGroups}
              facts={[
                ['請求書', `${nextGroups.length}枚`],
                ['件数', `${count(nextGroups)}件`],
              ]}
              split={[
                {
                  label: '未入金',
                  ex: subtotal(nextGroups.filter((g) => !g.paid)),
                  inc: total(nextGroups.filter((g) => !g.paid)),
                },
              ]}
            />
            <Section title="請求書（押すと明細・◯で選ぶとその分だけで文章を作れます）">
              <GroupList groups={nextGroups} showUser={isAdmin && person === 'all'} onTogglePaid={togglePaid} picked={picked} onTogglePick={togglePick} />
            </Section>
            {/* 前後の入金日のページへ */}
            <div className="mx-4 mb-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => prevPay && setPayPick(prevPay)}
                disabled={!prevPay}
                className="rounded-xl bg-fw-card py-3 text-sm font-bold text-fw-green disabled:opacity-30"
              >
                ‹ {prevPay ? `${shortDate(prevPay)}入金` : '前はありません'}
              </button>
              <button
                onClick={() => nextPay && setPayPick(nextPay)}
                disabled={!nextPay}
                className="rounded-xl bg-fw-card py-3 text-sm font-bold text-fw-green disabled:opacity-30"
              >
                {nextPay ? `${shortDate(nextPay)}入金` : '次はありません'} ›
              </button>
            </div>
          </>
        )
      ) : groups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-fw-muted">この月に締まる売上はありません</Card>
      ) : tab === 'cutoff' ? (
        <>
          <Section title="合算する締め日を選ぶ">
            <div className="mx-4 flex flex-wrap gap-2">
              {cutoffs.map((c) => (
                <Chip
                  key={c}
                  on={selectedCutoffs.includes(c)}
                  onClick={() => setOffCutoffs((o) => (o.includes(c) ? o.filter((x) => x !== c) : [...o, c]))}
                >
                  {cutoffLabel(c)}
                </Chip>
              ))}
            </div>
          </Section>
          <TotalCard
            label={`${selectedCutoffs.map(cutoffLabel).join('＋') || '締め日を選んでください'} の合計`}
            groups={viewGroups}
            split={selectedCutoffs.map((c) => {
              const gs = viewGroups.filter((g) => g.cutoff === c);
              return { label: cutoffLabel(c), ex: subtotal(gs), inc: total(gs) };
            })}
          />
          <Section title="請求書（押すと明細）">
            <GroupList groups={viewGroups} showUser={isAdmin && person === 'all'} onTogglePaid={togglePaid} picked={picked} onTogglePick={togglePick} />
          </Section>
        </>
      ) : tab === 'client' ? (
        <>
          <Section title="請求先（押すとその請求先だけ）">
            <Card>
              {clients.map(([name, gs]) => (
                <button
                  key={name}
                  onClick={() => setClient(client === name ? null : name)}
                  className={`flex w-full items-center justify-between border-b border-fw-line px-4 py-3 text-left last:border-b-0 ${client === name ? 'bg-fw-fill' : ''}`}
                >
                  <span>
                    <span className="block font-semibold">{name}</span>
                    <span className="text-xs text-fw-muted">
                      {[...new Set(gs.map((g) => cutoffLabel(g.cutoff)))].join('・')} ・ {count(gs)}件
                    </span>
                  </span>
                  <span className="text-right">
                    <TaxedYen ex={subtotal(gs)} inc={total(gs)} />
                  </span>
                </button>
              ))}
            </Card>
          </Section>
          <TotalCard label={`${client ?? 'すべての請求先'} の合計`} groups={viewGroups} />
          <Section title="請求書（押すと明細）">
            <GroupList groups={viewGroups} showUser={isAdmin && person === 'all'} onTogglePaid={togglePaid} picked={picked} onTogglePick={togglePick} />
          </Section>
        </>
      ) : (
        <>
          <TotalCard
            label={`${title} 全体`}
            groups={groups}
            facts={[
              ['請求先', `${clients.length}社`],
              ['件数', `${count(groups)}件`],
            ]}
            split={[
              {
                label: '未入金',
                ex: subtotal(groups.filter((g) => !g.paid)),
                inc: total(groups.filter((g) => !g.paid)),
              },
            ]}
          />
          <Section title="締め日ごと">
            <Card>
              {cutoffs.map((c) => {
                const gs = groups.filter((g) => g.cutoff === c);
                return (
                  <Row key={c} title={cutoffLabel(c)} sub={[...new Set(gs.map((g) => g.clientName))].join('・')} groups={gs} />
                );
              })}
            </Card>
          </Section>
          <Section title="請求先ごと">
            <Card>
              {clients.map(([name, gs]) => (
                <Row key={name} title={name} sub={`${count(gs)}件`} groups={gs} />
              ))}
            </Card>
          </Section>
        </>
      )}

      {sheet === 'line' && (
        <OutputSheet
          title="LINE用の文章"
          text={lineText(scope, title, issuer)}
          kind="line"
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'claude' && (
        <OutputSheet
          title="Claude用プロンプト"
          text={claudePrompt(scope, profile, user.name)}
          kind="claude"
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'profile' && (
        <ProfileSheet
          profile={profile}
          fallbackName={user.name}
          onSaved={(p) => {
            setProfile(p);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </Screen>
  );
}

function TotalCard({
  label,
  groups,
  split = [],
  facts = [],
}: {
  label: string;
  groups: InvoiceGroup[];
  split?: { label: string; ex: number; inc: number }[];
  facts?: [string, string][]; // 金額以外（件数など）
}) {
  const showTax = useShowTax();
  return (
    <Card className="mb-5 grid gap-1 p-4">
      <span className="text-[13px] text-fw-muted">{label}</span>
      <span className="tabular-nums">
        <span className="text-3xl font-extrabold">{yen(showTax ? total(groups) : subtotal(groups))}</span>
        <span className="ml-1.5 text-sm text-fw-muted">{showTax ? '税込' : '税抜'}</span>
      </span>
      {showTax && <span className="text-sm text-fw-muted tabular-nums">税抜 {yen(subtotal(groups))}</span>}
      {(split.length > 0 || facts.length > 0) && (
        <div className="mt-1 grid grid-cols-3 gap-2 border-t border-fw-line pt-2 text-xs text-fw-muted">
          {facts.map(([k, v]) => (
            <span key={k}>
              {k}
              <b className="block text-[14px] text-fw-ink tabular-nums">{v}</b>
            </span>
          ))}
          {split.map((x) => (
            <span key={x.label}>
              {x.label}
              <TaxedYen ex={x.ex} inc={x.inc} className="text-[14px] font-bold text-fw-ink" />
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({ title, sub, groups }: { title: string; sub: string; groups: InvoiceGroup[] }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-fw-line px-4 py-3 last:border-b-0">
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-xs text-fw-muted">{sub}</span>
      </span>
      <span className="shrink-0 text-right">
        <TaxedYen ex={subtotal(groups)} inc={total(groups)} />
      </span>
    </div>
  );
}

function GroupList({
  groups,
  showUser,
  onTogglePaid,
  picked,
  onTogglePick,
}: {
  groups: InvoiceGroup[];
  showUser: boolean;
  onTogglePaid: (g: InvoiceGroup) => void;
  picked: string[];
  onTogglePick: (key: string) => void;
}) {
  const showTax = useShowTax();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card>
      {groups.map((g) => (
        <div key={g.key} className={`border-b border-fw-line last:border-b-0 ${picked.includes(g.key) ? 'bg-fw-green/10' : ''}`}>
          <div className="flex items-center">
            {/* ◯：この請求書を選ぶ（選んだ分だけで LINE・Claude 用の文章を作る） */}
            <button
              onClick={() => onTogglePick(g.key)}
              aria-label={`${g.clientName}を選ぶ`}
              aria-pressed={picked.includes(g.key)}
              className="grid self-stretch place-items-center pl-4 pr-1"
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border-2 text-[13px] font-bold ${picked.includes(g.key) ? 'border-fw-green bg-fw-green text-white' : 'border-fw-line'}`}
              >
                {picked.includes(g.key) ? '✓' : ''}
              </span>
            </button>
            <button onClick={() => setOpen(open === g.key ? null : g.key)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-2 pr-4 text-left">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{g.clientName}</span>
                <span className="block text-xs text-fw-muted">
                  {showUser && `${g.userName} ・ `}
                  {shortDate(g.closing)} {cutoffLabel(g.cutoff)} ・ {g.scheduled !== g.payDate && `${shortDate(g.scheduled)}決済→`}
                  {shortDate(g.payDate)}入金 ・ {g.sales.length}件
                </span>
              </span>
              <span className="shrink-0 text-right">
                <TaxedYen ex={g.subtotal} inc={g.total} />
                {g.paid && <span className="block text-[11px] font-bold text-fw-muted">入金済み</span>}
              </span>
            </button>
          </div>
          {open === g.key && (
            <div className="grid gap-1 bg-fw-fill px-4 pb-3 pt-1 text-sm">
              {g.sales.map((s) => (
                <div key={s.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {shortDate(s.date)} {s.site} {s.work}
                    {s.status === 'pending' && <span className="ml-1 text-[11px] font-bold text-fw-orange">承認待ち</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">{yen(s.amount)}（税抜）</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-fw-line pt-1 text-xs text-fw-muted">
                {showTax ? (
                  <>
                    <span>小計 {yen(g.subtotal)} ・ 消費税 {yen(g.tax)}</span>
                    <span>合計 {yen(g.total)}</span>
                  </>
                ) : (
                  <span>合計 {yen(g.subtotal)}（税抜）</span>
                )}
              </div>
              <button onClick={() => onTogglePaid(g)} className="mt-2 rounded-xl bg-fw-card py-2 text-sm font-semibold text-fw-green">
                {g.paid ? '入金済みを取り消す' : '入金済みにする'}
              </button>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
