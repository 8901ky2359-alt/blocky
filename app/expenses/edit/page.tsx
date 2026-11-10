'use client';

// 立替経費の入力・修正（?id= で修正）。請求先・現場・区分は一度入れたものがタップで入る。領収書の写真は何枚でも

import { useEffect, useMemo, useRef, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Card, Chip, Section, Segmented } from '@/components/fw/ui';
import {
  ApiError,
  addReceipt,
  createExpense,
  deleteExpense,
  deleteReceipt,
  listClients,
  listExpenses,
  setExpenseStatus,
  updateExpense,
} from '@/lib/fw/api';
import { DEFAULT_CATEGORIES, loadReceipt, shrinkReceipt } from '@/lib/fw/expenses';
import { useSales } from '@/lib/fw/useSales';
import { Expense, ExpenseInput, ExpenseStatus } from '@/lib/fw/types';
import { todayStr } from '@/lib/format';

export default function ExpenseEditPage() {
  return <AuthGate role="admin">{() => <EditInner />}</AuthGate>;
}

const ERRORS: Record<string, string> = {
  'invalid-date': '日付を選んでください',
  'amount-required': '金額を入力してください',
  'category-required': '何の費用か（区分）を選んでください',
  'client-required': '請求先を入力してください',
  'image-too-large': '写真が大きすぎて保存できませんでした',
  offline: 'インターネットに接続できませんでした',
};

const empty = (): ExpenseInput => ({ date: todayStr(), amount: 0, category: '', site: '', clientName: '', memo: '' });

// 過去の入力から、最近使った順に重複なしで
function recent(list: { v: string; t: number }[]): string[] {
  const last = new Map<string, number>();
  for (const { v, t } of list) if (v.trim()) last.set(v.trim(), Math.max(last.get(v.trim()) ?? 0, t));
  return [...last.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

function EditInner() {
  const { sales } = useSales();
  const [all, setAll] = useState<Expense[]>([]);
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>(empty);
  const [photos, setPhotos] = useState<{ id: string; data: string }[]>([]); // 保存済みの写真
  const [newPhotos, setNewPhotos] = useState<string[]>([]); // これから保存する写真
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const albRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    listExpenses()
      .then(({ expenses }) => {
        setAll(expenses);
        const target = id ? expenses.find((e) => e.id === id) : null;
        if (target) {
          setEditing(target);
          const { date, amount, category, site, clientName, memo } = target;
          setForm({ date, amount, category, site, clientName, memo });
          Promise.all(target.receipts.map((rid) => loadReceipt(rid).then((data) => ({ id: rid, data })))).then(setPhotos).catch(() => {});
        } else if (id) setMsg('その記録は見つかりませんでした');
      })
      .catch(() => {});
    listClients()
      .then((r) => setClientNames(r.clients.map((c) => c.name)))
      .catch(() => {});
  }, []);

  const set = <K extends keyof ExpenseInput>(k: K, v: ExpenseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // タップで入る候補：区分は既定＋使ったもの、現場・請求先は立替と売上の両方から
  const categories = useMemo(
    () => [...new Set([...recent(all.map((e) => ({ v: e.category, t: e.createdAt }))), ...DEFAULT_CATEGORIES])],
    [all],
  );
  const sites = useMemo(
    () => recent([...all.map((e) => ({ v: e.site, t: e.createdAt })), ...sales.map((s) => ({ v: s.site, t: s.createdAt }))]),
    [all, sales],
  );
  const clients = useMemo(
    () =>
      [
        ...new Set([
          ...recent([...all.map((e) => ({ v: e.clientName, t: e.createdAt })), ...sales.map((s) => ({ v: s.clientName, t: s.createdAt }))]),
          ...clientNames,
        ]),
      ],
    [all, sales, clientNames],
  );

  async function pickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = [...(e.target.files ?? [])];
    e.target.value = '';
    for (const f of fs) {
      try {
        const data = await shrinkReceipt(f);
        setNewPhotos((p) => [...p, data]);
      } catch {
        setMsg('写真を読み込めませんでした');
      }
    }
  }

  async function removeSaved(id: string) {
    if (!confirm('この領収書の写真を削除しますか？')) return;
    await deleteReceipt(id).catch(() => {});
    setPhotos((p) => p.filter((x) => x.id !== id));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const input = { ...form, category: form.category.trim(), site: form.site.trim(), clientName: form.clientName.trim(), memo: form.memo.trim() };
      const { expense } = editing ? await updateExpense(editing.id, input) : await createExpense(input);
      for (const data of newPhotos) await addReceipt(expense.id, data);
      location.href = '/expenses';
    } catch (e) {
      setMsg((e instanceof ApiError && ERRORS[e.code]) || '保存できませんでした');
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || !confirm('この立替経費を削除しますか？（領収書の写真も消えます）')) return;
    await deleteExpense(editing.id).catch(() => {});
    location.href = '/expenses';
  }

  async function changeStatus(s: ExpenseStatus) {
    if (!editing) return;
    await setExpenseStatus([editing.id], s).catch(() => {});
    setEditing({ ...editing, status: s });
  }

  const canSave = !busy && form.amount > 0 && form.category.trim() && form.clientName.trim() && form.date;

  return (
    <Screen
      title={editing ? '立替経費を直す' : '立替経費を入力'}
      back={{ href: '/expenses', label: '立替経費' }}
      footer={
        <>
          {msg && <p className="text-center text-sm text-fw-red">{msg}</p>}
          <button onClick={save} disabled={!canSave} className="w-full rounded-xl bg-fw-green py-3.5 font-bold text-white disabled:opacity-40">
            {busy ? '保存中…' : editing ? '変更を保存' : '保存する'}
          </button>
          {editing && (
            <button onClick={remove} className="w-full rounded-xl bg-fw-fill py-2.5 text-sm font-semibold text-fw-red">
              削除する
            </button>
          )}
        </>
      }
    >
      {editing && (
        <Segmented<ExpenseStatus>
          value={editing.status}
          onChange={changeStatus}
          options={[
            { value: 'unbilled', label: '未請求' },
            { value: 'billed', label: '請求済み' },
            { value: 'paid', label: '入金済み' },
          ]}
        />
      )}
      <Section>
        <Card className="grid gap-3 p-4">
          <Field label="日付">
            <input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input" />
          </Field>
          <Field label="金額（領収書の金額）">
            <input
              id="amount"
              type="number"
              inputMode="numeric"
              value={form.amount || ''}
              onChange={(e) => set('amount', Math.max(0, Math.round(Number(e.target.value) || 0)))}
              placeholder="例: 3200"
              className="input text-lg font-bold tabular-nums"
            />
          </Field>
          <Field label="何の費用か">
            <input id="category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="例: 高速代" className="input" />
            <Picks options={categories} value={form.category} onPick={(v) => set('category', v)} />
          </Field>
          <Field label="現場（なくてもOK）">
            <input id="site" value={form.site} onChange={(e) => set('site', e.target.value)} placeholder="例: 茨城 芳賀" className="input" />
            <Picks options={sites} value={form.site} onPick={(v) => set('site', v)} limit={8} />
          </Field>
          <Field label="請求先">
            <input id="client" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="例: 中野 将也" className="input" />
            <Picks options={clients} value={form.clientName} onPick={(v) => set('clientName', v)} limit={8} />
          </Field>
          <Field label="メモ（なくてもOK）">
            <input id="memo" value={form.memo} onChange={(e) => set('memo', e.target.value)} placeholder="例: 常磐道 水戸〜つくば" className="input" />
          </Field>
        </Card>
      </Section>

      <Section title="領収書の写真">
        <Card className="grid gap-3 p-4">
          {photos.length + newPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <Thumb key={p.id} src={p.data} onRemove={() => removeSaved(p.id)} />
              ))}
              {newPhotos.map((d, i) => (
                <Thumb key={i} src={d} onRemove={() => setNewPhotos((p) => p.filter((_, j) => j !== i))} badge="未保存" />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => camRef.current?.click()} className="rounded-xl bg-fw-ink py-3 text-sm font-bold text-fw-card">
              📷 撮影
            </button>
            <button onClick={() => albRef.current?.click()} className="rounded-xl bg-fw-fill py-3 text-sm font-bold">
              🖼 アルバム
            </button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickPhotos} />
          <input ref={albRef} type="file" accept="image/*" multiple className="hidden" onChange={pickPhotos} />
        </Card>
      </Section>
    </Screen>
  );
}

function Thumb({ src, onRemove, badge }: { src: string; onRemove: () => void; badge?: string }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="領収書" className="h-24 w-24 rounded-lg object-cover" />
      {badge && <span className="absolute left-1 top-1 rounded bg-fw-orange px-1 text-[10px] font-bold text-white">{badge}</span>}
      <button onClick={onRemove} aria-label="写真を削除" className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-fw-ink text-xs text-fw-card">
        ×
      </button>
    </div>
  );
}

// 入力欄の下の候補ボタン（入力中は文字を含むものだけ）
function Picks({ options, value, onPick, limit = 12 }: { options: string[]; value: string; onPick: (v: string) => void; limit?: number }) {
  const q = value.trim();
  const shown = options.filter((o) => !q || options.includes(q) || o.includes(q)).slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {shown.map((o) => (
        <Chip key={o} on={o === q} onClick={() => onPick(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] text-fw-muted">{label}</span>
      {children}
    </div>
  );
}
