'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/fw/AuthGate';
import Screen from '@/components/fw/Screen';
import { Card, Chip, SaleRow, Section } from '@/components/fw/ui';
import { ApiError, createSale, deleteSale, listClients, updateSale } from '@/lib/fw/api';
import { CUTOFF_DAYS, closingDate, consolidatedDate, dayLabel, paymentDate, shortDate } from '@/lib/fw/billing';
import { useSales } from '@/lib/fw/useSales';
import { Client, Sale, SaleInput, Terms, User, WORK_TYPES } from '@/lib/fw/types';
import { todayStr, yen } from '@/lib/format';
import { withTax } from '@/lib/tax';

export default function SalesPage() {
  return <AuthGate>{(user) => <SalesInner user={user} />}</AuthGate>;
}

const ERRORS: Record<string, string> = {
  'site-required': '現場を入力してください',
  'amount-required': '金額を入力してください',
  'client-required': '請求先を入力してください',
  'invalid-date': '日付を選んでください',
  forbidden: '承認済みの記録は変更できません',
  offline: 'インターネットに接続できませんでした',
};

const DEFAULT_TERMS: Terms = { cutoff: 31, payOffset: 1, payDay: 31 };

function emptyForm(): SaleInput {
  return { date: todayStr(), site: '', work: '', amount: 0, memo: '', clientName: '', workType: '請負', hiredName: '', ...DEFAULT_TERMS };
}

function SalesInner({ user }: { user: User }) {
  const { sales, reload } = useSales();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<SaleInput>(emptyForm);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 「最近の入力」やカレンダーから来たとき：?edit=売上ID&back=戻り先 で、その売上を開いて直す
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [openedFromLink, setOpenedFromLink] = useState(false);
  // カレンダーの「この日に入力」から来たとき：?date=YYYY-MM-DD&back=戻り先
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const date = q.get('date');
    const back = q.get('back');
    if (!date || q.get('edit') || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    setForm((f) => ({ ...f, date }));
    if (back && back.startsWith('/') && !back.startsWith('//')) setReturnTo(back);
  }, []);
  useEffect(() => {
    if (openedFromLink || sales.length === 0) return;
    const q = new URLSearchParams(window.location.search);
    const id = q.get('edit');
    const back = q.get('back');
    if (!id) return;
    setOpenedFromLink(true);
    if (back && back.startsWith('/') && !back.startsWith('//')) setReturnTo(back);
    const target = sales.find((x) => x.id === id);
    if (target) startEdit(target);
    else setMsg({ ok: false, text: 'その記録は見つかりませんでした（削除された可能性があります）' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, openedFromLink]);

  const loadClients = () => listClients().then((r) => setClients(r.clients)).catch(() => {});
  useEffect(() => {
    loadClients();
  }, []);

  const mine = useMemo(() => sales.filter((s) => s.userId === user.id), [sales, user.id]);
  const workOptions = useMemo(() => workSuggestions(sales), [sales]);
  // 一度入れた現場・作業員・金額は、次からボタンを押すだけで入る（最近使った順）
  const siteOptions = useMemo(() => recentValues(sales, (s) => s.site), [sales]);
  const hiredOptions = useMemo(() => recentValues(sales, (s) => s.hiredName), [sales]);
  const amountOptions = useMemo(() => recentValues(sales, (s) => (s.amount > 0 ? String(s.amount) : '')), [sales]);

  // 現場を選んだとき、請求先がまだ空なら、その現場で前回使った請求先（締め日・入金日も）を入れる
  function pickSite(site: string) {
    const last = [...sales].filter((s) => s.site === site).sort((a, b) => b.createdAt - a.createdAt)[0];
    setForm((f) =>
      !f.clientName.trim() && last
        ? { ...f, site, clientName: last.clientName, cutoff: last.cutoff, payOffset: last.payOffset, payDay: last.payDay }
        : { ...f, site },
    );
  }
  const set = <K extends keyof SaleInput>(k: K, v: SaleInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function pickClient(c: Client) {
    setForm((f) => ({ ...f, clientName: c.name, cutoff: c.cutoff, payOffset: c.payOffset, payDay: c.payDay }));
  }

  function startEdit(s: Sale) {
    if (s.status === 'approved' && user.role !== 'admin') {
      setMsg({ ok: false, text: '承認済みの記録は変更できません' });
      return;
    }
    setEditing(s);
    const { date, site, work, amount, memo, clientName, cutoff, payOffset, payDay, workType, hiredName } = s;
    setForm({ date, site, work, amount, memo, clientName, cutoff, payOffset, payDay, workType, hiredName });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    if (returnTo) {
      location.href = returnTo;
      return;
    }
    setEditing(null);
    setForm((f) => ({ ...emptyForm(), date: f.date, workType: f.workType }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const input = { ...form, site: form.site.trim(), work: form.work.trim(), clientName: form.clientName.trim(), hiredName: form.hiredName.trim() };
    try {
      if (editing) await updateSale(editing.id, input);
      else await createSale(input);
      setMsg({ ok: true, text: editing ? '変更しました' : '保存しました' });
      reset();
      await Promise.all([reload(), loadClients()]);
    } catch (e) {
      setMsg({ ok: false, text: (e instanceof ApiError && ERRORS[e.code]) || '保存できませんでした' });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || !confirm('この記録を削除しますか？')) return;
    try {
      await deleteSale(editing.id);
      setMsg({ ok: true, text: '削除しました' });
      reset();
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: (e instanceof ApiError && ERRORS[e.code]) || '削除できませんでした' });
    }
  }

  const closing = form.date ? closingDate(form.date, form.cutoff) : '';
  const pay = closing ? paymentDate(closing, form) : '';
  const canSave = !busy && form.site.trim() && form.amount > 0 && form.clientName.trim() && form.date;

  return (
    <Screen
      title={editing ? '売上を直す' : '売上入力'}
      back={
        returnTo
          ? { href: returnTo, label: returnTo.startsWith('/calendar') ? 'カレンダー' : 'ホーム' }
          : { href: '/', label: 'ホーム' }
      }
      footer={
        <>
          {msg && <p className={`text-center text-sm ${msg.ok ? 'text-fw-green' : 'text-fw-red'}`}>{msg.text}</p>}
          <button onClick={save} disabled={!canSave} className="w-full rounded-xl bg-fw-green py-3.5 font-bold text-white disabled:opacity-40">
            {busy ? '保存中…' : editing ? '変更を保存する' : '保存する'}
          </button>
          {editing && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={reset} className="rounded-xl bg-fw-fill py-2.5 text-sm font-semibold">
                やめる
              </button>
              <button onClick={remove} className="rounded-xl bg-fw-fill py-2.5 text-sm font-semibold text-fw-red">
                削除する
              </button>
            </div>
          )}
        </>
      }
    >
      {editing && editing.userId !== user.id && (
        <p className="mx-4 mb-3 rounded-xl bg-fw-orange/15 px-3 py-2 text-sm font-semibold text-fw-orange">
          {editing.userName}さんの売上を直しています
        </p>
      )}
      <Section>
        <Card className="grid gap-3 p-4">
          <Field label="区分">
            <div className="grid grid-cols-3 rounded-[10px] bg-fw-fill p-0.5 text-[14px] font-semibold">
              {WORK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('workType', t)}
                  className={`rounded-lg py-2 ${form.workType === t ? 'bg-fw-card shadow-sm' : 'text-fw-ink/70'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          {form.workType === '作業員手配' && (
            <Field label="手配した作業員">
              <input id="hired" value={form.hiredName} onChange={(e) => set('hiredName', e.target.value)} placeholder="例: 鈴木" className="input" />
              <Suggest options={hiredOptions} value={form.hiredName} onPick={(v) => set('hiredName', v)} />
            </Field>
          )}
          <Field label="日付">
            <input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input" />
          </Field>
          <Field label="現場">
            <input id="site" value={form.site} onChange={(e) => set('site', e.target.value)} placeholder="例: つくば市 寺具" className="input" />
            <Suggest options={siteOptions} value={form.site} onPick={pickSite} />
          </Field>
          <Field label="作業内容">
            <input id="work" value={form.work} onChange={(e) => set('work', e.target.value)} placeholder="例: 草刈り" className="input" />
            <Suggest options={workOptions} value={form.work} onPick={(v) => set('work', v)} />
          </Field>
          <Field label="金額（税抜）">
            <input
              id="amount"
              type="number"
              inputMode="numeric"
              value={form.amount || ''}
              onChange={(e) => set('amount', Math.max(0, Math.round(Number(e.target.value) || 0)))}
              placeholder="例: 10000"
              className="input text-lg font-bold tabular-nums"
            />
            {form.amount > 0 && <span className="text-sm text-fw-muted tabular-nums">税込 {yen(withTax(form.amount))}</span>}
            <Suggest
              options={amountOptions}
              value={form.amount ? String(form.amount) : ''}
              onPick={(v) => set('amount', Number(v))}
              label={(v) => yen(Number(v))}
              limit={8}
            />
          </Field>
        </Card>
      </Section>

      <Section title="請求先">
        <Card className="grid gap-3 p-4">
          <input id="client" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="請求先の名前（例: B造園）" className="input" />
          {clients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <Chip key={c.id} on={c.name === form.clientName} onClick={() => pickClient(c)}>
                  {c.name}
                </Chip>
              ))}
            </div>
          )}
          <Field label="締め日">
            <div className="flex flex-wrap gap-2">
              {CUTOFF_DAYS.map((d) => (
                <Chip key={d} on={form.cutoff === d} onClick={() => set('cutoff', d)}>
                  {dayLabel(d)}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="入金日">
            <div className="mb-2 flex flex-wrap gap-2">
              {['当月', '翌月', '翌々月'].map((l, i) => (
                <Chip key={l} on={form.payOffset === i} onClick={() => set('payOffset', i)}>
                  {l}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CUTOFF_DAYS.map((d) => (
                <Chip key={d} on={form.payDay === d} onClick={() => set('payDay', d)}>
                  {dayLabel(d)}
                </Chip>
              ))}
            </div>
          </Field>
          {pay && (
            <p className="rounded-xl bg-fw-fill px-3 py-2 text-sm">
              この売上は <b>{shortDate(closing)}締め</b> ・{' '}
              {consolidatedDate(pay) === pay ? (
                <b>{shortDate(pay)}入金予定</b>
              ) : (
                <>
                  {shortDate(pay)}決済予定 → <b>{shortDate(consolidatedDate(pay))}にまとめて入金</b>
                </>
              )}{' '}
              です
            </p>
          )}
          <p className="text-xs text-fw-muted">一度入れた請求先は、上のボタンを押すだけで締め日・入金日まで入ります。</p>
        </Card>
      </Section>

      <Section title="メモ">
        <Card className="p-4">
          <input id="memo" value={form.memo} onChange={(e) => set('memo', e.target.value)} placeholder="なくてもOK" className="input" />
        </Card>
      </Section>

      <Section title="自分の入力（押すと直せます）">
        <Card>
          {mine.length === 0 ? (
            <p className="p-6 text-center text-sm text-fw-muted">まだ入力がありません</p>
          ) : (
            mine.slice(0, 50).map((s) => <SaleRow key={s.id} sale={s} onClick={() => startEdit(s)} />)
          )}
        </Card>
      </Section>
    </Screen>
  );
}

// 作業内容の候補：これまでの売上の作業内容（よく使う順）＋以前のアプリがこの端末に覚えていた候補
const OLD_MEMOS_KEY = 'income-memos';

function workSuggestions(sales: Sale[]): string[] {
  const count = new Map<string, { n: number; last: number }>();
  for (const s of sales) {
    const w = s.work.trim();
    if (!w) continue;
    const c = count.get(w) ?? { n: 0, last: 0 };
    count.set(w, { n: c.n + 1, last: Math.max(c.last, s.createdAt) });
  }
  const list = [...count.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last).map(([w]) => w);
  try {
    const old = JSON.parse(localStorage.getItem(OLD_MEMOS_KEY) || '[]');
    if (Array.isArray(old)) for (const w of old) if (typeof w === 'string' && w.trim() && !list.includes(w.trim())) list.push(w.trim());
  } catch {
    /* 以前の候補が読めなくても続ける */
  }
  return list;
}

// 過去の売上から、値を最近使った順に重複なしで並べる
function recentValues(sales: Sale[], pick: (s: Sale) => string): string[] {
  const last = new Map<string, number>();
  for (const s of sales) {
    const v = pick(s).trim();
    if (v) last.set(v, Math.max(last.get(v) ?? 0, s.createdAt));
  }
  return [...last.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

// 入力欄の下の候補ボタン。入力中は文字を含む候補だけに絞る（候補をそのまま選んだ後は全部出す）
function Suggest({
  options,
  value,
  onPick,
  label = (v) => v,
  limit = 12,
}: {
  options: string[];
  value: string;
  onPick: (v: string) => void;
  label?: (v: string) => string;
  limit?: number;
}) {
  const q = value.trim();
  const shown = options.filter((o) => !q || options.includes(q) || o.includes(q)).slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {shown.map((o) => (
        <Chip key={o} on={o === q} onClick={() => onPick(o)}>
          {label(o)}
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
