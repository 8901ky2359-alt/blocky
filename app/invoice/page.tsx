'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Card, Chip, Section, Segmented, TaxedYen, useShowTax } from '@/components/fw/ui';
import OutputSheet from '@/components/fw/OutputSheet';
import ProfileSheet from '@/components/fw/ProfileSheet';
import { getProfile, setPaid } from '@/lib/fw/api';
import { InvoiceGroup, cutoffLabel, invoiceGroups, saleClosing, shortDate } from '@/lib/fw/billing';
import { claudePrompt, lineText } from '@/lib/fw/invoiceText';
import { useSales } from '@/lib/fw/useSales';
import { Profile, User } from '@/lib/fw/types';
import { currentMonthKey, formatJpMonth, shiftMonth, yen } from '@/lib/format';

export default function InvoicePage() {
  return <AuthGate>{(user) => <InvoiceInner user={user} />}</AuthGate>;
}

type Tab = 'cutoff' | 'client' | 'all';

const EMPTY_PROFILE: Profile = { issuerName: '', tradeName: '', address: '', phone: '', bank: '', invoiceNo: '' };

const total = (gs: InvoiceGroup[]) => gs.reduce((n, g) => n + g.total, 0); // 税込
const subtotal = (gs: InvoiceGroup[]) => gs.reduce((n, g) => n + g.subtotal, 0); // 税抜
const count = (gs: InvoiceGroup[]) => gs.reduce((n, g) => n + g.sales.length, 0);

function InvoiceInner({ user }: { user: User }) {
  const { sales, loading, reload } = useSales();
  const [month, setMonth] = useState(currentMonthKey());
  const [person, setPerson] = useState<string>('all');
  const [tab, setTab] = useState<Tab>('cutoff');
  const [offCutoffs, setOffCutoffs] = useState<number[]>([]); // 選択を外した締め日
  const [client, setClient] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [sheet, setSheet] = useState<'line' | 'claude' | 'profile' | null>(null);

  useEffect(() => {
    getProfile()
      .then((r) => setProfile({ ...EMPTY_PROFILE, ...r.profile }))
      .catch(() => {});
  }, []);

  const isAdmin = user.role === 'admin';
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
  const cutoffs = useMemo(() => [...new Set(groups.map((g) => g.cutoff))].sort((a, b) => a - b), [groups]);
  const selectedCutoffs = cutoffs.filter((c) => !offCutoffs.includes(c));
  const clients = useMemo(() => {
    const m = new Map<string, InvoiceGroup[]>();
    for (const g of groups) m.set(g.clientName, [...(m.get(g.clientName) ?? []), g]);
    return [...m.entries()].sort((a, b) => total(b[1]) - total(a[1]));
  }, [groups]);

  // 出力に使う範囲（今見ているもの）
  const scope =
    tab === 'cutoff'
      ? groups.filter((g) => selectedCutoffs.includes(g.cutoff))
      : tab === 'client' && client
        ? groups.filter((g) => g.clientName === client)
        : groups;

  const issuer = profile.issuerName || user.name;
  const title = `${formatJpMonth(month)}締め分`;

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
          <button
            disabled={scope.length === 0}
            onClick={() => setSheet('line')}
            className="w-full rounded-xl bg-fw-line_app py-3 font-bold text-white disabled:opacity-40"
          >
            LINEで共有する文章を作る
          </button>
          <button
            disabled={scope.length === 0}
            onClick={() => setSheet('claude')}
            className="w-full rounded-xl bg-fw-claude py-3 font-bold text-white disabled:opacity-40"
          >
            Claude用の請求書プロンプトを作る
          </button>
        </>
      }
    >
      <div className="mx-4 mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(shiftMonth(month, -1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="前の月">
          ‹
        </button>
        <span className="text-lg font-bold">{title}</span>
        <button onClick={() => setMonth(shiftMonth(month, 1))} className="px-3 py-1 text-2xl text-fw-green" aria-label="次の月">
          ›
        </button>
      </div>

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
          { value: 'cutoff', label: '締め日別' },
          { value: 'client', label: '請求先別' },
          { value: 'all', label: '全体' },
        ]}
      />

      {loading ? (
        <p className="p-6 text-center text-sm text-fw-muted">読み込み中…</p>
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
            groups={scope}
            split={selectedCutoffs.map((c) => {
              const gs = scope.filter((g) => g.cutoff === c);
              return { label: cutoffLabel(c), ex: subtotal(gs), inc: total(gs) };
            })}
          />
          <Section title="請求書（押すと明細）">
            <GroupList groups={scope} showUser={isAdmin && person === 'all'} onTogglePaid={togglePaid} />
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
          <TotalCard label={`${client ?? 'すべての請求先'} の合計`} groups={scope} />
          <Section title="請求書（押すと明細）">
            <GroupList groups={scope} showUser={isAdmin && person === 'all'} onTogglePaid={togglePaid} />
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

function GroupList({ groups, showUser, onTogglePaid }: { groups: InvoiceGroup[]; showUser: boolean; onTogglePaid: (g: InvoiceGroup) => void }) {
  const showTax = useShowTax();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card>
      {groups.map((g) => (
        <div key={g.key} className="border-b border-fw-line last:border-b-0">
          <button onClick={() => setOpen(open === g.key ? null : g.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
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
