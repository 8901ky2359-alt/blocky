// 小さな共通部品

import Link from 'next/link';
import { Sale } from '@/lib/fw/types';
import { yen } from '@/lib/format';
import { shortDate } from '@/lib/fw/billing';

export function Section({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mb-5">
      {(title || right) && (
        <div className="flex items-end justify-between px-8 pb-1.5">
          <h2 className="text-[13px] text-fw-muted">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-4 overflow-hidden rounded-2xl bg-fw-card ${className}`}>{children}</div>;
}

export function StatusPill({ sale }: { sale: Sale }) {
  if (sale.paid) return <span className="shrink-0 rounded-full bg-fw-fill px-2 py-0.5 text-[11px] font-bold text-fw-muted">入金済み</span>;
  return sale.status === 'approved' ? (
    <span className="shrink-0 rounded-full bg-fw-green/15 px-2 py-0.5 text-[11px] font-bold text-fw-green">承認済み</span>
  ) : (
    <span className="shrink-0 rounded-full bg-fw-orange/15 px-2 py-0.5 text-[11px] font-bold text-fw-orange">承認待ち</span>
  );
}

const AVATAR_COLORS = ['bg-fw-blue', 'bg-fw-teal', 'bg-fw-violet', 'bg-fw-orange', 'bg-fw-green'];

export function Avatar({ name, id }: { name: string; id: string }) {
  const n = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold text-white ${AVATAR_COLORS[n % AVATAR_COLORS.length]}`}>
      {name.slice(0, 1) || '?'}
    </span>
  );
}

// 売上1件の行（showUser で入力した人の名前も出す）
export function SaleRow({ sale, showUser, onClick }: { sale: Sale; showUser?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <Avatar name={showUser ? sale.userName : sale.clientName} id={showUser ? sale.userId : sale.clientName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{[sale.site, sale.work].filter(Boolean).join(' ')}</span>
        <span className="block truncate text-xs text-fw-muted">
          {[showUser ? sale.userName : '', shortDate(sale.date), sale.clientName].filter(Boolean).join(' ・ ')}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-bold tabular-nums">{yen(sale.amount)}</span>
        <StatusPill sale={sale} />
      </span>
    </>
  );
  const cls = 'flex w-full items-center gap-3 border-b border-fw-line px-4 py-3 text-left last:border-b-0';
  return onClick ? (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function AppIcon({ href, label, letter, color, badge }: { href: string; label: string; letter: string; color: string; badge?: number }) {
  return (
    <Link href={href} className="grid justify-items-center gap-1.5 text-center text-xs">
      <span className={`relative grid h-[60px] w-[60px] place-items-center rounded-[16px] text-2xl font-extrabold text-white ${color}`}>
        {letter}
        {!!badge && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b30] px-1.5 text-[11px] font-bold">
            {badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${on ? 'bg-fw-green text-white' : 'bg-fw-fill text-fw-ink'}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mx-4 mb-4 grid auto-cols-fr grid-flow-col rounded-[10px] bg-fw-fill p-0.5 text-[13px] font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg py-1.5 ${value === o.value ? 'bg-fw-card shadow-sm' : 'text-fw-ink/80'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
