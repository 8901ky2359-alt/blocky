'use client';

// 立替経費：山田が立て替えたお金の一覧。◯で選んだ分を、領収書の写真つきでLINEで報告する
// （現場ごと・週ごと・1件ずつ、どの単位でも選べる）

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import Sheet from '@/components/fw/Sheet';
import { Card, Section, Segmented } from '@/components/fw/ui';
import { listExpenses, setExpenseStatus } from '@/lib/fw/api';
import { EXPENSE_STATUS_LABEL, addDays, expenseReport, loadReceipt, weekStart } from '@/lib/fw/expenses';
import { shortDate } from '@/lib/fw/billing';
import { Expense, ExpenseStatus, User } from '@/lib/fw/types';
import { WEEK_LABELS, yen } from '@/lib/format';
import { dataUrlToFile } from '@/lib/ba/share';

export default function ExpensesPage() {
  return <AuthGate role="admin">{(user) => <ExpensesInner user={user} />}</AuthGate>;
}

type Tab = ExpenseStatus | 'all';

const sum = (list: Expense[]) => list.reduce((n, e) => n + e.amount, 0);

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${shortDate(date)}(${WEEK_LABELS[(new Date(y, m - 1, d).getDay() + 6) % 7]})`;
}

function ExpensesInner({ user }: { user: User }) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('unbilled');
  const [site, setSite] = useState('all');
  const [client, setClient] = useState('all');
  const [picked, setPicked] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  const reload = () =>
    listExpenses()
      .then((r) => setItems(r.expenses))
      .catch(() => {})
      .finally(() => setLoading(false));
  useEffect(() => {
    reload();
  }, []);

  const inTab = items.filter((e) => tab === 'all' || e.status === tab);
  const sites = [...new Set(inTab.map((e) => e.site).filter(Boolean))];
  const clients = [...new Set(inTab.map((e) => e.clientName))];
  const shown = inTab.filter((e) => (site === 'all' || e.site === site) && (client === 'all' || e.clientName === client));
  // 週（月曜はじまり）ごとにまとめる
  const weeks = useMemo(() => {
    const m = new Map<string, Expense[]>();
    for (const e of shown) m.set(weekStart(e.date), [...(m.get(weekStart(e.date)) ?? []), e]);
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [shown]);

  const pickedItems = items.filter((e) => picked.includes(e.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pickAll = (list: Expense[]) => {
    const ids = list.map((e) => e.id);
    const allOn = ids.every((id) => picked.includes(id));
    setPicked((p) => (allOn ? p.filter((id) => !ids.includes(id)) : [...new Set([...p, ...ids])]));
  };

  const unbilled = items.filter((e) => e.status === 'unbilled');
  const billed = items.filter((e) => e.status === 'billed');

  return (
    <Screen
      title="立替経費"
      back={{ href: '/', label: '総合管理画面' }}
      footer={
        picked.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="min-w-0 truncate tabular-nums">
                <b>{picked.length}件を選択中</b>
                <span className="ml-1.5 text-fw-muted">{yen(sum(pickedItems))}</span>
              </span>
              <button onClick={() => setPicked([])} className="shrink-0 pl-2 font-semibold text-fw-green">
                選択を解除
              </button>
            </div>
            <button onClick={() => setSharing(true)} className="w-full rounded-xl bg-fw-line_app py-3 font-bold text-white">
              選んだ{picked.length}件を領収書つきでLINEで報告
            </button>
          </>
        ) : (
          <Link href="/expenses/edit" className="block w-full rounded-xl bg-fw-green py-3 text-center font-bold text-white">
            ＋ 立替経費を入力
          </Link>
        )
      }
    >
      <div className="mx-4 mb-5 grid gap-1 rounded-3xl bg-gradient-to-br from-[#c2453a] to-[#7d1f1a] p-5 text-white">
        <span className="text-[13px] opacity-85">まだ請求していない立替</span>
        <span className="text-[36px] font-extrabold leading-none tabular-nums">{yen(sum(unbilled))}</span>
        <span className="text-[12px] tabular-nums opacity-85">
          未請求 {unbilled.length}件 ・ 請求済みで入金待ち {yen(sum(billed))}（{billed.length}件）
        </span>
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setSite('all');
          setClient('all');
        }}
        options={[
          { value: 'unbilled', label: '未請求' },
          { value: 'billed', label: '請求済み' },
          { value: 'paid', label: '入金済み' },
          { value: 'all', label: 'すべて' },
        ]}
      />

      {(sites.length > 1 || clients.length > 1) && (
        <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
          <select value={site} onChange={(e) => setSite(e.target.value)} className="input py-2 text-sm">
            <option value="all">全現場</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={client} onChange={(e) => setClient(e.target.value)} className="input py-2 text-sm">
            <option value="all">全請求先</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="p-6 text-center text-sm text-fw-muted">読み込み中…</p>
      ) : shown.length === 0 ? (
        <Card className="mx-4 p-6 text-center text-sm text-fw-muted">
          {items.length === 0 ? '下の「＋ 立替経費を入力」から、立て替えたお金を記録できます。' : 'ここに出る立替はありません'}
        </Card>
      ) : (
        <>
          <div className="mx-4 mb-2 flex items-center justify-between text-xs text-fw-muted">
            <span>◯で選ぶと、その分を領収書の写真つきでLINEで報告できます</span>
            <button onClick={() => pickAll(shown)} className="shrink-0 pl-2 font-bold text-fw-green">
              表示中を全部選ぶ
            </button>
          </div>
          {weeks.map(([wk, list]) => (
            <Section
              key={wk}
              title={`${dayLabel(wk)}〜${dayLabel(addDays(wk, 6))} ・ ${yen(sum(list))}`}
              right={
                <button onClick={() => pickAll(list)} className="shrink-0 text-[13px] font-bold text-fw-green">
                  この週を選ぶ
                </button>
              }
            >
              <Card>
                {list.map((e) => (
                  <ExpenseRow key={e.id} e={e} on={picked.includes(e.id)} onToggle={() => toggle(e.id)} />
                ))}
              </Card>
            </Section>
          ))}
        </>
      )}

      {sharing && (
        <ShareSheet
          items={pickedItems}
          issuer={user.name}
          onClose={() => setSharing(false)}
          onMarked={async () => {
            setSharing(false);
            setPicked([]);
            await reload();
          }}
        />
      )}
    </Screen>
  );
}

function ExpenseRow({ e, on, onToggle }: { e: Expense; on: boolean; onToggle: () => void }) {
  return (
    <div className={`flex items-center border-b border-fw-line last:border-b-0 ${on ? 'bg-fw-green/10' : ''}`}>
      <button onClick={onToggle} aria-label={`${e.category}を選ぶ`} aria-pressed={on} className="grid self-stretch place-items-center pl-4 pr-1">
        <span
          className={`grid h-6 w-6 place-items-center rounded-full border-2 text-[13px] font-bold ${on ? 'border-fw-green bg-fw-green text-white' : 'border-fw-line'}`}
        >
          {on ? '✓' : ''}
        </span>
      </button>
      <Link href={`/expenses/edit?id=${e.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-2 pr-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {e.category}
            {e.memo && <span className="font-normal text-fw-muted">（{e.memo}）</span>}
          </span>
          <span className="block truncate text-xs text-fw-muted">
            {dayLabel(e.date)} ・ {e.site ? `${e.site} ・ ` : ''}
            {e.clientName}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-bold tabular-nums">{yen(e.amount)}</span>
          <span className="block text-[11px] text-fw-muted">
            {e.receipts.length > 0 ? `📎${e.receipts.length} ・ ` : '領収書なし ・ '}
            <span className={e.status === 'unbilled' ? 'font-bold text-fw-red' : e.status === 'billed' ? 'text-fw-orange' : 'text-fw-teal'}>
              {EXPENSE_STATUS_LABEL[e.status]}
            </span>
          </span>
        </span>
      </Link>
    </div>
  );
}

// LINE報告：文章（書き換えできる）と領収書の写真をまとめて共有する
function ShareSheet({
  items,
  issuer,
  onClose,
  onMarked,
}: {
  items: Expense[];
  issuer: string;
  onClose: () => void;
  onMarked: () => void;
}) {
  const [text, setText] = useState(() => expenseReport(items, issuer));
  const [photos, setPhotos] = useState<{ id: string; data: string }[] | null>(null);
  const [msg, setMsg] = useState('');
  const receiptIds = items.flatMap((e) => e.receipts);

  useEffect(() => {
    Promise.all(receiptIds.map((id) => loadReceipt(id).then((data) => ({ id, data }))))
      .then(setPhotos)
      .catch(() => setPhotos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // 写真ファイルの名前：日付_区分_番号.jpg
  function files(): File[] {
    if (!photos) return [];
    let n = 0;
    return items.flatMap((e) =>
      e.receipts.map((id) => {
        n++;
        const data = photos.find((p) => p.id === id)?.data;
        return data ? dataUrlToFile(data, `${e.date}_${e.category}_${n}.jpg`) : null;
      }),
    ).filter((f): f is File => !!f);
  }

  // 写真と文章をいっしょに共有（LINEで文章が付かないときのために、文章はコピーもしておく）
  async function shareAll() {
    const copied = await copyText();
    const fs = files();
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    try {
      if (fs.length > 0 && navigator.share && (!nav.canShare || nav.canShare({ files: fs }))) {
        await navigator.share({ files: fs, text } as ShareData);
      } else if (navigator.share) {
        await navigator.share({ text });
      } else {
        flash(copied ? '文章をコピーしました。LINEに貼り付けてください' : '共有できませんでした');
        return;
      }
      if (copied && fs.length > 0) flash('文章もコピーしてあります。LINEで文章が付いていなければ貼り付けてください');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') flash('共有できませんでした');
    }
  }

  async function onlyText() {
    flash((await copyText()) ? '文章をコピーしました' : 'コピーできませんでした（長押しで選択してください）');
  }

  async function mark(status: ExpenseStatus) {
    await setExpenseStatus(
      items.map((e) => e.id),
      status,
    ).catch(() => alert('変更できませんでした'));
    onMarked();
  }

  const anyUnbilled = items.some((e) => e.status === 'unbilled');
  const anyBilled = items.some((e) => e.status === 'billed');

  return (
    <Sheet title={`立替経費の報告（${items.length}件）`} onClose={onClose}>
      <div className="grid gap-3 px-4 pb-4">
        <textarea
          id="expense-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="w-full rounded-xl bg-fw-card p-3 text-[13px] leading-relaxed outline-none"
        />
        <div>
          <p className="mb-1.5 text-xs text-fw-muted">
            領収書の写真 {receiptIds.length}枚{photos === null && receiptIds.length > 0 && '（読み込み中…）'}
          </p>
          {receiptIds.length === 0 ? (
            <p className="text-xs text-fw-muted">選んだ立替には領収書の写真がありません</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(photos ?? []).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.data} alt="領収書" className="h-24 w-auto shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={shareAll}
          disabled={photos === null && receiptIds.length > 0}
          className="w-full rounded-xl bg-fw-line_app py-3 font-bold text-white disabled:opacity-40"
        >
          写真と文章をLINEで共有
        </button>
        <button onClick={onlyText} className="w-full rounded-xl bg-fw-card py-3 text-sm font-bold">
          文章だけコピー
        </button>
        {msg && <p className="text-center text-xs text-fw-green">{msg}</p>}
        <div className="mt-1 grid gap-2 border-t border-fw-line pt-3">
          <p className="text-xs text-fw-muted">送ったら、請求済みにしておくと「未請求」から外れます</p>
          {anyUnbilled && (
            <button onClick={() => mark('billed')} className="w-full rounded-xl bg-fw-orange py-3 text-sm font-bold text-white">
              この{items.length}件を請求済みにする
            </button>
          )}
          {anyBilled && (
            <button onClick={() => mark('paid')} className="w-full rounded-xl bg-fw-teal py-3 text-sm font-bold text-white">
              この{items.length}件を入金済みにする
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
