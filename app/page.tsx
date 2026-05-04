'use client';

import { useMemo, useState } from 'react';
import Card from '@/components/Card';
import { journey, onboarding, postingTypes } from '@/lib/data';

type Memo = { name: string; note: string; date: string };

const useLocalStorage = <T,>(key: string, fallback: T) => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  });

  const update = (next: T) => {
    setValue(next);
    window.localStorage.setItem(key, JSON.stringify(next));
  };

  return [value, update] as const;
};

export default function Home() {
  const [type, setType] = useState(postingTypes[0].key);
  const [keyword, setKeyword] = useState('在宅ワーク');
  const [refCode, setRefCode] = useLocalStorage('refCode', '');
  const [history, setHistory] = useLocalStorage<Memo[]>('history', []);
  const [todo, setTodo] = useLocalStorage('todo', [true, false, false, false]);

  const selected = useMemo(() => postingTypes.find((t) => t.key === type)!, [type]);

  const threadTemplate = `【${keyword}に悩む方へ】\n私も最初は時間も自信もゼロでした。\nでも小さな行動で変化できました。\n今日できる一歩：${selected.prompt}\n気になる方はDMで「相談」と送ってください。`;

  const dmTemplate = `DMありがとうございます！\n${keyword}について、今どんな状況ですか？\n無理な勧誘はしないので安心してください😊`;

  const lineTemplate = `もっと具体的にお伝えしたいので、LINEでやり取りしませんか？\n必要ならサポート担当も交えて3人で進められます。`;

  return (
    <div className="space-y-4 pb-8">
      <header className="card bg-brand-soft">
        <h1 className="text-xl font-bold">SNS集客トレーニングMVP</h1>
        <p className="text-sm">副業初心者向けの発信から3人グループLINE作成までを1画面で実行。</p>
      </header>

      <Card title="1. オンボーディング">
        <ul className="list-disc space-y-1 pl-5 text-sm">{onboarding.map((s) => <li key={s}>{s}</li>)}</ul>
      </Card>

      <Card title="2. 紹介活動の全体像">
        <ol className="list-decimal space-y-1 pl-5 text-sm">{journey.map((s) => <li key={s}>{s}</li>)}</ol>
      </Card>

      <Card title="3. 発信タイプ診断">
        <div className="grid gap-2">{postingTypes.map((p) => <button key={p.key} onClick={() => setType(p.key)} className={`rounded-xl border p-3 text-left text-sm ${type === p.key ? 'border-brand-primary bg-brand-soft' : 'border-black/10'}`}><p className="font-semibold">{p.title}</p><p>{p.description}</p></button>)}</div>
      </Card>

      <Card title="4-7. 投稿/DM/LINEテンプレ生成">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="w-full rounded-lg border border-black/20 p-2" placeholder="キーワード" />
        <textarea readOnly className="h-28 w-full rounded-lg border p-2 text-sm" value={threadTemplate} />
        <textarea readOnly className="h-24 w-full rounded-lg border p-2 text-sm" value={dmTemplate} />
        <textarea readOnly className="h-20 w-full rounded-lg border p-2 text-sm" value={lineTemplate} />
      </Card>

      <Card title="8. 3人グループLINE作成手順">
        <ol className="list-decimal space-y-1 pl-5 text-sm"><li>ゲストにLINE交換の同意を再確認</li><li>あなた・ゲスト・サポート担当公式LINEの3者を招待</li><li>冒頭で目的・進め方・禁止事項を共有</li></ol>
      </Card>

      <Card title="9. NGトークチェック">
        <ul className="list-disc pl-5 text-sm"><li>即決を迫る</li><li>収益保証を断言</li><li>相手の不安を煽る言い方</li></ul>
      </Card>

      <Card title="10. 今日やること">
        {['投稿1本', 'ストーリー1本', 'DM返信3件', 'LINE誘導1件'].map((t, i) => (
          <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={todo[i]} onChange={() => {
            const next = [...todo]; next[i] = !next[i]; setTodo(next);
          }} />{t}</label>
        ))}
      </Card>

      <Card title="11. 紹介コード">
        <input value={refCode} onChange={(e) => setRefCode(e.target.value)} className="w-full rounded-lg border border-black/20 p-2" placeholder="例: AFF-1234" />
      </Card>

      <Card title="12. 投稿履歴・紹介メモ">
        <button className="rounded-lg bg-black px-3 py-2 text-sm text-white" onClick={() => setHistory([{ name: keyword, note: `${selected.title}で投稿`, date: new Date().toLocaleDateString('ja-JP') }, ...history].slice(0, 20))}>履歴を追加</button>
        <div className="space-y-2 text-sm">{history.map((h, idx) => <div key={`${h.date}-${idx}`} className="rounded-lg border border-black/10 p-2"><p className="font-semibold">{h.name} / {h.date}</p><p>{h.note}</p></div>)}</div>
      </Card>

      <Card title="将来拡張メモ（Supabase/OpenAI/Stripe）">
        <ul className="list-disc pl-5 text-sm"><li>データ保存層をlocalStorage→Supabaseへ差し替え</li><li>テンプレ生成をOpenAI API呼び出しへ変更</li><li>有料講座化時にStripe Checkoutを追加</li></ul>
      </Card>
    </div>
  );
}
