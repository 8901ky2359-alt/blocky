// ホーム一番上：次回入金予定（合計を大きく、締め日別・承認済み/承認待ちは小さく）

import { Sale } from '@/lib/fw/types';
import { cutoffLabel, nextPayment, shortDate } from '@/lib/fw/billing';
import { yen } from '@/lib/format';

export default function NextPaymentCard({ sales, label, tone }: { sales: Sale[]; label: string; tone: 'green' | 'blue' }) {
  const np = nextPayment(sales);
  const bg = tone === 'green' ? 'from-[#2f8f4e] to-[#155a30]' : 'from-[#2c7fd6] to-[#1a4f99]';
  return (
    <div className={`mx-4 mb-5 grid gap-2 rounded-3xl bg-gradient-to-br ${bg} p-5 text-white`}>
      <span className="text-[13px] opacity-85">{label}（税込）</span>
      <span className="text-[40px] font-extrabold leading-none tabular-nums">{yen(np.total)}</span>
      {np.groups.length === 0 ? (
        <p className="text-[13px] opacity-85">まだ入金予定の売上はありません。「売上入力」から追加すると、ここに出ます。</p>
      ) : (
        <>
          <div className="mt-1 grid gap-1 border-t border-white/25 pt-2 text-[12px]">
            {np.groups.map((g) => (
              <div key={`${g.payDate}-${g.cutoff}`} className="flex justify-between gap-2 tabular-nums">
                <span className="opacity-85">
                  {shortDate(g.payDate)} 入金 ・ {shortDate(g.closing)} {cutoffLabel(g.cutoff)}
                </span>
                <span>{yen(g.total)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] tabular-nums">
            <span className="rounded-xl bg-white/15 px-3 py-1.5">
              承認済み {np.approved.count}件<b className="block text-[14px]">{yen(np.approved.total)}</b>
            </span>
            <span className="rounded-xl bg-white/15 px-3 py-1.5">
              承認待ち {np.pending.count}件<b className="block text-[14px]">{yen(np.pending.total)}</b>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
