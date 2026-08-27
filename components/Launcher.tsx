'use client';

// サイトを開いて最初に出るホーム画面。3つの入口を大きなボタンで表示する。

type Item = {
  key: string;
  label: string;
  desc: string;
  icon: string;
  href?: string; // 別ページへ遷移
  onClick?: () => void; // 同一ページ内（現場メモ）
  accent: string; // アイコン背景
};

export default function Launcher({ onOpenMemo }: { onOpenMemo: () => void }) {
  const items: Item[] = [
    {
      key: 'memo',
      label: '売上管理',
      desc: '売上・現場記録／カレンダー・収支・請求書',
      icon: '📒',
      onClick: onOpenMemo,
      accent: 'bg-brand-primary',
    },
    {
      key: 'expense',
      label: '経費',
      desc: 'レシート写真つきで経費を記録・報告',
      icon: '🧾',
      href: '/expense',
      accent: 'bg-red-600',
    },
    {
      key: 'ba',
      label: 'ビフォーアフター画像',
      desc: '作業前後の写真を撮影・保存・共有',
      icon: '📷',
      href: '/ba',
      accent: 'bg-blue-600',
    },
    {
      key: 'report',
      label: '防草シート案件',
      desc: '工番検索・地図・進捗管理・LINE報告',
      icon: '🗺',
      href: '/report',
      accent: 'bg-amber-600',
    },
    {
      key: 'hire',
      label: '雇用',
      desc: '日付・名前・現場・金額で記録／名前別に集計',
      icon: '🤝',
      href: '/hire',
      accent: 'bg-indigo-600',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-100 to-slate-300">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col justify-center px-5 py-10">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-primary text-xl font-black text-white shadow-lg">
            現
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-brand-primary">草刈りバスターズ</h1>
          <p className="mt-1 text-sm text-slate-500">使う機能を選んでください</p>
        </div>

        <div className="space-y-3">
          {items.map((it) => {
            const inner = (
              <>
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl ${it.accent}`}>
                  {it.icon}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-lg font-bold text-slate-800">{it.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{it.desc}</span>
                </span>
                <span className="shrink-0 text-2xl text-slate-300">›</span>
              </>
            );
            const cls =
              'flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition active:scale-[.99]';
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

        <p className="mt-10 text-center text-[11px] text-slate-400">
          ホーム画面に追加すると、アプリのように使えます。
        </p>
      </div>
    </div>
  );
}
