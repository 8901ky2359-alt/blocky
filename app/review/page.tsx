'use client';

import { useMemo, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Card, SaleRow, Section, Segmented, TaxedYen } from '@/components/fw/ui';
import { deleteSale, setApproved } from '@/lib/fw/api';
import { useSales } from '@/lib/fw/useSales';
import { Sale, User } from '@/lib/fw/types';
import { termsLabel } from '@/lib/fw/billing';
import { formatJpDate, yen } from '@/lib/format';
import { withTax } from '@/lib/tax';

export default function ReviewPage() {
  return <AuthGate role="admin">{(user) => <ReviewInner user={user} />}</AuthGate>;
}

type Tab = 'pending' | 'approved' | 'people';

function ReviewInner({ user }: { user: User }) {
  const { sales, loading, reload } = useSales();
  const [tab, setTab] = useState<Tab>('pending');
  const [open, setOpen] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);

  // 仲間が入れた分（自分の入力は最初から承認済み）
  const others = useMemo(() => sales.filter((s) => s.userId !== user.id), [sales, user.id]);
  const pending = others.filter((s) => s.status === 'pending');
  const approved = others.filter((s) => s.status === 'approved');
  const people = useMemo(() => {
    const m = new Map<string, Sale[]>();
    for (const s of others) m.set(s.userName || s.userId, [...(m.get(s.userName || s.userId) ?? []), s]);
    return [...m.entries()];
  }, [others]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      setOpen(null);
      await reload();
    } catch {
      alert('変更できませんでした。電波の良いところでもう一度お試しください');
    } finally {
      setBusy(false);
    }
  }

  const list = tab === 'pending' ? pending : approved;

  return (
    <Screen title="仲間の入力" back={{ href: '/', label: '総合管理画面' }}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `承認待ち ${pending.length}` },
          { value: 'approved', label: '承認済み' },
          { value: 'people', label: '人別' },
        ]}
      />
      {loading ? (
        <p className="p-6 text-center text-sm text-fw-muted">読み込み中…</p>
      ) : tab === 'people' ? (
        people.length === 0 ? (
          <Card className="p-6 text-center text-sm text-fw-muted">仲間の入力はまだありません</Card>
        ) : (
          people.map(([name, list]) => {
            const ap = list.filter((s) => s.status === 'approved');
            const pe = list.filter((s) => s.status === 'pending');
            return (
              <Section key={name} title={name}>
                <Card className="grid grid-cols-3 gap-2 p-4 text-xs text-fw-muted">
                  <span>
                    合計
                    <TaxedYen ex={sum(list)} className="text-lg font-bold text-fw-ink" />
                  </span>
                  <span>
                    承認済み {ap.length}件
                    <TaxedYen ex={sum(ap)} className="text-sm font-bold text-fw-ink" />
                  </span>
                  <span>
                    承認待ち {pe.length}件
                    <TaxedYen ex={sum(pe)} className="text-sm font-bold text-fw-ink" />
                  </span>
                </Card>
              </Section>
            );
          })
        )
      ) : (
        <Section>
          <Card>
            {list.length === 0 ? (
              <p className="p-6 text-center text-sm text-fw-muted">{tab === 'pending' ? '承認待ちはありません' : '承認済みの記録はありません'}</p>
            ) : (
              list.map((s) => <SaleRow key={s.id} sale={s} showUser onClick={() => setOpen(s)} />)
            )}
          </Card>
          {tab === 'pending' && pending.length > 0 && (
            <button
              disabled={busy}
              onClick={() => run(() => setApproved(pending.map((s) => s.id), true))}
              className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl bg-fw-card py-3 font-semibold text-fw-green disabled:opacity-50"
            >
              すべて承認する（{pending.length}件）
            </button>
          )}
        </Section>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setOpen(null)}>
          <div
            className="mx-auto w-full max-w-[560px] rounded-t-3xl bg-fw-bg p-4 pb-[max(20px,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 grid gap-1 rounded-2xl bg-fw-card p-4 text-sm">
              <span className="text-fw-muted">
                {open.userName} ・ {formatJpDate(open.date)}
              </span>
              <span className="text-lg font-bold">{[open.site, open.work].filter(Boolean).join(' ')}</span>
              <span className="text-2xl font-extrabold tabular-nums">
                {yen(open.amount)}
                <span className="ml-1 text-sm font-normal text-fw-muted">税抜 ・ 税込 {yen(withTax(open.amount))}</span>
              </span>
              <span>
                {open.clientName} ・ {termsLabel(open)}
              </span>
              {open.memo && <span className="text-fw-muted">メモ: {open.memo}</span>}
            </div>
            <div className="grid gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => setApproved([open.id], open.status !== 'approved'))}
                className="rounded-xl bg-fw-green py-3 font-bold text-white disabled:opacity-50"
              >
                {open.status === 'approved' ? '承認を取り消す' : '承認する'}
              </button>
              <button
                disabled={busy}
                onClick={() => confirm('この記録を削除しますか？') && run(() => deleteSale(open.id))}
                className="rounded-xl bg-fw-card py-3 font-semibold text-fw-red disabled:opacity-50"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}

function sum(list: Sale[]): number {
  return list.reduce((n, s) => n + s.amount, 0);
}
