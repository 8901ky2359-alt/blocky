// ホーム一番上：次回入金予定（合計を大きく、締め日別・承認済み/承認待ちは小さく。税込と税抜の両方）

import { Sale } from '@/lib/fw/types';
import { PaymentGroup, cutoffLabel, isConsolidated, nextPayment, shortDate } from '@/lib/fw/billing';
import { yen } from '@/lib/format';

export default function NextPaymentCard({ sales, label, tone }: { sales: Sale[]; label: string; tone: 'green' | 'blue' }) {
  const np = nextPayment(sales);
  const bg = tone === 'green' ? 'from-[#2f8f4e] to-[#155a30]' : 'from-[#2c7fd6] to-[#1a4f99]';
  return (
    <div className={`mx-4 mb-5 grid gap-2 rounded-3xl bg-gradient-to-br ${bg} p-5 text-white`}>
      <span className="text-[13px] opacity-85">{label}</span>
      <span className="leading-none tabular-nums">
        <span className="text-[40px] font-extrabold">{yen(np.total)}</span>
        <span className="ml-1.5 text-sm opacity-85">税込</span>
      </span>
      <span className="text-[13px] tabular-nums opacity-85">税抜 {yen(np.subtotal)}</span>
      {np.groups.length === 0 ? (
        <p className="text-[13px] opacity-85">まだ入金予定の売上はありません。「売上入力」から追加すると、ここに出ます。</p>
      ) : (
        <>
          <div className="mt-1 grid gap-2 border-t border-white/25 pt-2 text-[12px]">
            {byPayDate(np.groups).map(([payDate, list]) => {
              const sub = list.reduce((n, g) => n + g.subtotal, 0);
              const tot = list.reduce((n, g) => n + g.total, 0);
              return (
                <div key={payDate} className="grid gap-0.5 tabular-nums">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold">{shortDate(payDate)} 入金</span>
                    <span className="shrink-0 text-right font-bold">
                      {yen(tot)}
                      <span className="block text-[11px] font-normal opacity-75">税抜 {yen(sub)}</span>
                    </span>
                  </div>
                  {/* 元の決済予定（25日・月末など）ごとの内訳。まとめて入金される分は「→ 5日にまとめ」 */}
                  {list.map((g) => (
                    <div key={`${g.scheduled}-${g.closing}-${g.cutoff}`} className="flex items-start justify-between gap-2 pl-3 opacity-85">
                      <span>
                        {isConsolidated(g.scheduled) ? `${shortDate(g.scheduled)} 決済予定分` : `${shortDate(g.scheduled)} 入金分`} ・{' '}
                        {shortDate(g.closing)} {cutoffLabel(g.cutoff)}
                      </span>
                      <span className="shrink-0 text-right">{yen(g.total)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] tabular-nums">
            {(
              [
                ['承認済み', np.approved],
                ['承認待ち', np.pending],
              ] as const
            ).map(([k, a]) => (
              <span key={k} className="rounded-xl bg-white/15 px-3 py-1.5">
                {k} {a.count}件<b className="block text-[14px]">{yen(a.total)}</b>
                <span className="block text-[11px] opacity-80">税抜 {yen(a.subtotal)}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 実際の入金日ごとにまとめる（25日・月末の決済予定分は翌月5日に合算）
function byPayDate(groups: PaymentGroup[]): [string, PaymentGroup[]][] {
  const m = new Map<string, PaymentGroup[]>();
  for (const g of groups) m.set(g.payDate, [...(m.get(g.payDate) ?? []), g]);
  return [...m.entries()];
}
