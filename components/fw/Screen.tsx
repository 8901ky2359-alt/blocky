// 全画面共通の型：左上で戻る、大きな見出し、右上に一番よく使う操作

import Link from 'next/link';

export default function Screen({
  title,
  back,
  action,
  top,
  children,
  footer,
}: {
  title: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
  top?: React.ReactNode; // 見出しの上（ホームでは名前）
  children: React.ReactNode;
  footer?: React.ReactNode; // 画面下に固定するボタン
}) {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] overflow-x-hidden pb-10">
      <header className="flex min-h-[44px] items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
        {back ? (
          <Link href={back.href} className="py-2 text-[15px] text-fw-green">
            ‹ {back.label}
          </Link>
        ) : (
          (top ?? <span />)
        )}
        {action}
      </header>
      <h1 className="px-4 pb-3 pt-1 text-[28px] font-extrabold leading-tight">{title}</h1>
      <div className={footer ? 'pb-36' : ''}>{children}</div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-fw-line bg-fw-card/95 backdrop-blur">
          <div className="mx-auto grid max-w-[560px] gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        </div>
      )}
    </div>
  );
}
