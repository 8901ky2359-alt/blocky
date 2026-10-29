// ホーム一番上：次回入金予定（次の入金日の合計を大きく、決済予定別・承認済み/承認待ちは小さく、その次の入金日も1行で。
// 総合管理画面は税込と税抜、仲間は税抜のみ。金額はカレンダーのその日・請求書作成のそのページと同じ）

import { Sale } from '@/lib/fw/types';
import { PaymentGroup, cutoffLabel, isConsolidated, nextPayment, shortDate } from '@/lib/fw/billing';
import Link from 'next/link';
import { yen } from '@/lib/format';
import { useShowTax } from './ui';

export default function NextPaymentCard({ sales, label, tone }: { sales: Sale[]; label: string; tone: 'green' | 'blue' }) {
  const np = nextPayment(sales);
  // 仲間の画面は税抜だけ（税込は総合管理画面のみ）
  const showTax = useShowTax();
  const bg = tone === 'green' ? 'from-[#2f8f4e] to-[#155a30]' : 'from-[#2c7fd6] to-[#1a4f99]';
  return (
    <div className={`mx-4 mb-5 grid gap-2 rounded-3xl bg-gradient-to-br ${bg} p-5 text-white`}>
      <span className="text-[13px] opacity-85">{label}</span>
      <span className="leading-none tabular-nums">
        <span className="text-[40px] font-extrabold">{yen(showTax ? np.total : np.subtotal)}</span>
        <span className="ml-1.5 text-sm opacity-85">{showTax ? '税込' : '税抜'}</span>
      </span>
      {showTax && <span className="text-[13px] tabular-nums opacity-85">税抜 {yen(np.subtotal)}</span>}
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
                      {yen(showTax ? tot : sub)}
                      {showTax && <span className="block text-[11px] font-normal opacity-75">税抜 {yen(sub)}</span>}
                    </span>
                  </div>
                  {/* 元の決済予定（25日・月末など）ごとの内訳。まとめて入金される分は「→ 5日にまとめ」 */}
                  {list.map((g) => (
                    <div key={`${g.scheduled}-${g.closing}-${g.cutoff}`} className="flex items-start justify-between gap-2 pl-3 opacity-85">
                      <span>
                        {isConsolidated(g.scheduled) ? `${shortDate(g.scheduled)} 決済予定分` : `${shortDate(g.scheduled)} 入金分`} ・{' '}
                        {shortDate(g.closing)} {cutoffLabel(g.cutoff)}
                      </span>
                      <span className="shrink-0 text-right">{yen(showTax ? g.total : g.subtotal)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {np.following && (
            <Link
              href={`/invoice?tab=next&pay=${np.following.payDate}`}
              className="flex items-center justify-between gap-2 border-t border-white/25 pt-2 text-[12px] tabular-nums opacity-85"
            >
              <span>その次 ・ {shortDate(np.following.payDate)} 入金 ›</span>
              <span>{yen(showTax ? np.following.total : np.following.subtotal)}</span>
            </Link>
          )}
          <Link
            href={`/invoice?tab=next${np.payDate ? `&pay=${np.payDate}` : ''}`}
            className="rounded-xl bg-white/20 py-2 text-center text-[13px] font-bold active:bg-white/30"
          >
            この内容で請求書を作る ›
          </Link>
          <div className="grid grid-cols-2 gap-2 text-[12px] tabular-nums">
            {(
              [
                ['承認済み', np.approved],
                ['承認待ち', np.pending],
              ] as const
            ).map(([k, a]) => (
              <span key={k} className="rounded-xl bg-white/15 px-3 py-1.5">
                {k} {a.count}件<b className="block text-[14px]">{yen(showTax ? a.total : a.subtotal)}</b>
                {showTax && <span className="block text-[11px] opacity-80">税抜 {yen(a.subtotal)}</span>}
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
