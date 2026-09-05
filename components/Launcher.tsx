'use client';

// サイトを開いて最初に出るホーム画面。SF風HUDの角ばったデザイン。

type Item = {
  key: string;
  label: string;
  sub: string; // 英語のサブラベル（HUDっぽさ）
  desc: string;
  icon: string;
  href?: string;
  onClick?: () => void;
};

export default function Launcher({ onOpenMemo }: { onOpenMemo: () => void }) {
  const items: Item[] = [
    { key: 'memo', label: '売上管理', sub: 'SALES', desc: '売上・現場記録／収支・請求', icon: '▤', onClick: onOpenMemo },
    { key: 'ba', label: 'ビフォーアフター', sub: 'PHOTO', desc: '作業前後の写真を記録・共有', icon: '◨', href: '/ba' },
    { key: 'report', label: '防草シート案件', sub: 'ROUTE', desc: '工番検索・地図・進捗・報告', icon: '⊞', href: '/report' },
    { key: 'hire', label: '作業依頼管理', sub: 'LABOR', desc: '作業依頼書の作成・共有／記録', icon: '☰', href: '/hire' },
  ];

  return (
    <div className="hud-bg min-h-[100dvh] px-5 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-[480px]">
        {/* ヘッダー */}
        <div className="relative mb-6 border border-cyan-400/30 bg-cyan-400/5 p-4">
          <span className="absolute left-0 top-0 h-2 w-2 border-l-2 border-t-2 border-cyan-300" />
          <span className="absolute right-0 top-0 h-2 w-2 border-r-2 border-t-2 border-cyan-300" />
          <span className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-cyan-300" />
          <span className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-cyan-300" />
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center border border-cyan-400/50 bg-cyan-400/10 text-lg font-black text-cyan-300">
              現
            </span>
            <div className="leading-tight">
              <h1 className="text-lg font-bold tracking-widest text-cyan-100">草刈りバスターズ</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/70">Field Operations System</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-400/80">
            <span className="inline-block h-1.5 w-1.5 animate-pulse bg-emerald-400" />
            System Online — Select Module
          </div>
        </div>

        {/* モジュール一覧 */}
        <div className="space-y-3">
          {items.map((it, i) => {
            const inner = (
              <>
                <span className="w-7 shrink-0 font-mono text-base text-cyan-500/60">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid h-16 w-16 shrink-0 place-items-center border border-cyan-400/40 bg-cyan-400/10 text-3xl text-cyan-300">
                  {it.icon}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xl font-bold tracking-wide text-slate-100">{it.label}</span>
                  <span className="mt-1 block truncate text-xs text-slate-400">
                    <span className="uppercase tracking-[0.2em] text-cyan-400/60">{it.sub}</span>
                    <span className="mx-1 text-slate-600">/</span>
                    {it.desc}
                  </span>
                </span>
                <span className="shrink-0 text-xl text-cyan-500/60">›</span>
              </>
            );
            const cls =
              'group relative flex w-full items-center gap-3.5 border border-slate-700 bg-slate-900/70 p-4 transition hover:border-cyan-400/70 hover:bg-slate-800/80 hover:shadow-glow active:translate-x-0.5';
            return it.href ? (
              <a key={it.key} href={it.href} className={cls}>
                {inner}
              </a>
            ) : (
              <button key={it.key} onClick={it.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-slate-600">
          ▐ Tap to add to home screen ▌
        </p>
      </div>
    </div>
  );
}
