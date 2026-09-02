'use client';

import { useEffect, useMemo, useState } from 'react';
import { Entry, workTypeOf } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth, todayStr, toDateStr, yen } from '@/lib/format';
import { Profile, loadProfile, saveProfile } from '@/lib/profile';
import { BankInfo, getBanks, addBank, removeBank, bankLabel } from '@/lib/banks';
import { BILL_GROUPS, billGroupOptionLabel, billGroupText, billGroupDueDate, isBillGroup } from '@/lib/billgroup';
import { INVOICE_PROJECT_PROMPT } from '@/lib/invoicePrompt';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function shortDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${m}/${day}(${WEEK[new Date(y, m - 1, day).getDay()]})`;
}

// 作業内容欄の文言（雇用は「作業員手配（氏名）」／それ以外はメモ、なければ種別）
function contentOf(e: Entry): string {
  if (workTypeOf(e) === '雇用') return `作業員手配${e.hiredName ? `（${e.hiredName}）` : ''}`;
  const m = (e.memo || '').trim();
  if (m) return m;
  return workTypeOf(e) === '常駐' ? '常駐' : '請負';
}

// 既定の支払期限：発行月の翌月末日
function defaultDue(): string {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 2, 0));
}

export default function InvoiceView({ entries, onBack }: { entries: Entry[]; onBack: () => void }) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [profile, setProfile] = useState<Profile>(() => ({
    businessName: '',
    name: '',
    postal: '',
    address: '',
    phone: '',
    regNo: '',
    bankName: '',
    bankBranch: '',
    bankType: '普通',
    bankNumber: '',
    bankHolder: '',
    lastClient: '',
  }));
  const [client, setClient] = useState('');
  const [billFilter, setBillFilter] = useState('すべて'); // 請求先で絞り込む
  const [groupFilter, setGroupFilter] = useState('すべて'); // 締日グループ(A/B/C)で絞り込む
  const [honorific, setHonorific] = useState('様'); // 個人=様 / 法人=御中
  const [invoiceNo, setInvoiceNo] = useState('');
  const [dueDate, setDueDate] = useState(defaultDue());
  const [taxRate, setTaxRate] = useState(0); // 既定なし（インボイス登録後に10%へ）
  const [note, setNote] = useState('');
  const [banks, setBanks] = useState<BankInfo[]>([]);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setClient(p.lastClient);
    setBanks(getBanks());
  }, []);

  function pickBank(b: BankInfo) {
    setProfile((prev) => ({
      ...prev,
      bankName: b.bankName,
      bankBranch: b.bankBranch,
      bankType: b.bankType || '普通',
      bankNumber: b.bankNumber,
      bankHolder: b.bankHolder,
    }));
  }

  // 請求先の候補（記録に入っている請求先）
  const billCandidates = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.kind === 'income' && e.billTo && e.billTo.trim()) set.add(e.billTo.trim());
    }
    return [...set];
  }, [entries]);

  const { displayRows, subtotal } = useMemo(() => {
    let income = entries.filter((e) => e.kind === 'income' && e.date.slice(0, 7) === mKey);
    if (billFilter !== 'すべて') income = income.filter((e) => (e.billTo || '').trim() === billFilter);
    if (groupFilter !== 'すべて') income = income.filter((e) => (e.billGroup || '') === groupFilter);
    income = income.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const rows = income.map((e) => ({
      date: e.date,
      dateShort: shortDate(e.date),
      site: e.site || '',
      content: contentOf(e),
      amount: e.amount,
    }));
    return { displayRows: rows, subtotal: income.reduce((s, e) => s + e.amount, 0) };
  }, [entries, mKey, billFilter, groupFilter]);

  // 締日グループを選ぶと、支払期限を締日ルールから自動で入れる（後から手直し可）
  useEffect(() => {
    const d = billGroupDueDate(mKey, groupFilter);
    if (d) setDueDate(d);
  }, [mKey, groupFilter]);

  function pickBill(v: string) {
    setBillFilter(v);
    if (v !== 'すべて') setClient(v); // 宛名を請求先に自動入力
  }

  const tax = Math.floor((subtotal * taxRate) / 100);
  const total = subtotal + tax;
  const shownNo = invoiceNo || `${mKey.replace('-', '')}-${isBillGroup(groupFilter) ? groupFilter : '01'}`;
  const hasBank = profile.bankName || profile.bankNumber;

  // Claudeに貼り付ける請求データ（テキスト）
  const invoiceText = useMemo(() => {
    const L: string[] = [];
    L.push('■請求データ（この内容から請求書を作成してください）');
    L.push('');
    L.push(`宛名: ${client || '（未設定）'} ${client ? honorific : ''}`.trim());
    if (isBillGroup(groupFilter)) L.push(`締日グループ: ${groupFilter}（${billGroupText(groupFilter)}）`);
    if (billFilter !== 'すべて') L.push(`請求先: ${billFilter}`);
    L.push(`対象月: ${formatJpMonth(mKey)}分`);
    L.push(`請求書番号: ${shownNo}`);
    L.push(`発行日: ${todayStr()}`);
    L.push(`支払期限: ${dueDate}`);
    L.push(`消費税: ${taxRate > 0 ? `${taxRate}%` : 'なし（対象外）'}`);
    L.push('');
    L.push('―― 明細（日付 / 現場名 / 作業内容 / 金額）――');
    if (displayRows.length === 0) {
      L.push('（この条件の売上記録がありません）');
    } else {
      for (const r of displayRows) {
        L.push(`${r.date} / ${r.site || '—'} / ${r.content} / ${yen(r.amount)}`);
      }
    }
    L.push('');
    L.push(`小計: ${yen(subtotal)}`);
    if (taxRate > 0) L.push(`消費税(${taxRate}%): ${yen(tax)}`);
    L.push(`合計: ${yen(total)}`);
    L.push('');
    L.push('―― 振込先 ――');
    L.push(
      hasBank
        ? `${profile.bankName} ${profile.bankBranch}　${profile.bankType} ${profile.bankNumber}${
            profile.bankHolder ? `　${profile.bankHolder}` : ''
          }`
        : '（未設定）',
    );
    L.push('');
    L.push('―― 発行元 ――');
    if (profile.businessName) L.push(profile.businessName);
    L.push(profile.name || '（氏名未設定）');
    if (profile.postal) L.push(`〒${profile.postal}`);
    if (profile.address) L.push(profile.address);
    if (profile.phone) L.push(`TEL ${profile.phone}`);
    L.push(`登録番号: ${profile.regNo || '（未登録）'}`);
    if (note.trim()) {
      L.push('');
      L.push(`備考: ${note.trim()}`);
    }
    return L.join('\n');
  }, [
    client,
    honorific,
    groupFilter,
    billFilter,
    mKey,
    shownNo,
    dueDate,
    taxRate,
    displayRows,
    subtotal,
    tax,
    total,
    hasBank,
    profile,
    note,
  ]);

  const [copied, setCopied] = useState('');
  async function copyText(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // クリップボードAPIが使えない環境向けのフォールバック
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* noop */
      }
      document.body.removeChild(ta);
    }
    persist();
    setCopied(which);
    setTimeout(() => setCopied(''), 2000);
  }

  function persist() {
    saveProfile({ ...profile, lastClient: client });
    if (profile.bankName.trim() || profile.bankNumber.trim()) {
      setBanks(
        addBank({
          bankName: profile.bankName,
          bankBranch: profile.bankBranch,
          bankType: profile.bankType,
          bankNumber: profile.bankNumber,
          bankHolder: profile.bankHolder,
        }),
      );
    }
  }
  const setP = (k: keyof Profile, v: string) => setProfile({ ...profile, [k]: v });

  return (
    <div className="space-y-4 pb-4">
      <div className="no-print flex items-center gap-2">
        <button onClick={onBack} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm">
          ‹ 戻る
        </button>
        <h2 className="text-lg font-bold">請求書を作る</h2>
      </div>

      <div className="no-print rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
        支払期限・振込先・宛名を埋めると審査で有利です。インボイス登録番号は、登録後に「登録番号」欄へ入れてください（未登録の今は空欄でOK・消費税は「なし」）。
        個人の取引先は敬称「様」を選びます。
      </div>

      {/* 入力欄（印刷されない） */}
      <div className="no-print space-y-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={() => setMKey(shiftMonth(mKey, -1))} className="px-2 text-lg">
            ‹
          </button>
          <span className="font-semibold">{formatJpMonth(mKey)} 分</span>
          <button onClick={() => setMKey(shiftMonth(mKey, 1))} className="px-2 text-lg">
            ›
          </button>
        </div>
        <Row label="請求先で絞り込む">
          <select className="input" value={billFilter} onChange={(e) => pickBill(e.target.value)}>
            <option value="すべて">すべて（全件）</option>
            {billCandidates.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Row>
        <Row label="締日グループで絞り込む（同じ請求先で締日が違うとき）">
          <select className="input" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="すべて">すべて（締日で分けない）</option>
            {BILL_GROUPS.map((g) => (
              <option key={g} value={g}>
                {billGroupOptionLabel(g)}
              </option>
            ))}
          </select>
          {isBillGroup(groupFilter) && (
            <p className="mt-1 text-[11px] text-emerald-700">
              {groupFilter}グループ（{billGroupText(groupFilter)}）の現場だけを請求します。
            </p>
          )}
        </Row>
        <Row label="宛名（取引先名）">
          <div className="flex items-stretch gap-2">
            <input
              className="input min-w-0 flex-1"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="例: 山田 太郎"
            />
            <select
              className="input w-20 shrink-0"
              value={honorific}
              onChange={(e) => setHonorific(e.target.value)}
            >
              <option value="様">様</option>
              <option value="御中">御中</option>
            </select>
          </div>
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="請求書番号">
            <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder={shownNo} />
          </Row>
          <Row label="支払期限">
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Row>
        </div>
        <Row label="屋号（任意）">
          <input className="input" value={profile.businessName} onChange={(e) => setP('businessName', e.target.value)} placeholder="〇〇造園" />
        </Row>
        <Row label="氏名">
          <input className="input" value={profile.name} onChange={(e) => setP('name', e.target.value)} placeholder="山田 太郎" />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="郵便番号">
            <input className="input" value={profile.postal} onChange={(e) => setP('postal', e.target.value)} placeholder="000-0000" />
          </Row>
          <Row label="電話番号">
            <input className="input" value={profile.phone} onChange={(e) => setP('phone', e.target.value)} placeholder="000-0000-0000" />
          </Row>
        </div>
        <Row label="住所">
          <input className="input" value={profile.address} onChange={(e) => setP('address', e.target.value)} placeholder="〇〇県〇〇市…" />
        </Row>
        <Row label="登録番号（インボイス・T＋13桁）">
          <input className="input" value={profile.regNo} onChange={(e) => setP('regNo', e.target.value)} placeholder="T1234567890123" />
        </Row>

        <p className="pt-1 text-xs font-semibold text-black/60">お振込先</p>
        {banks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {banks.map((b) => (
              <span key={bankLabel(b)} className="flex items-center gap-1 rounded-full border border-black/15 bg-white pl-3 pr-1 text-xs">
                <button type="button" onClick={() => pickBank(b)} className="py-1 text-black/70">
                  {bankLabel(b)}
                </button>
                <button
                  type="button"
                  onClick={() => setBanks(removeBank(b))}
                  className="grid h-5 w-5 place-items-center text-black/30"
                  aria-label="削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Row label="銀行名">
            <input className="input" value={profile.bankName} onChange={(e) => setP('bankName', e.target.value)} placeholder="〇〇銀行" />
          </Row>
          <Row label="支店名">
            <input className="input" value={profile.bankBranch} onChange={(e) => setP('bankBranch', e.target.value)} placeholder="〇〇支店" />
          </Row>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Row label="種別">
            <select className="input" value={profile.bankType} onChange={(e) => setP('bankType', e.target.value)}>
              <option value="普通">普通</option>
              <option value="当座">当座</option>
            </select>
          </Row>
          <Row label="口座番号">
            <input className="input" value={profile.bankNumber} onChange={(e) => setP('bankNumber', e.target.value)} placeholder="1234567" />
          </Row>
          <Row label="消費税">
            <select className="input" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))}>
              <option value={0}>なし</option>
              <option value={8}>8%</option>
              <option value={10}>10%</option>
            </select>
          </Row>
        </div>
        <Row label="口座名義">
          <input className="input" value={profile.bankHolder} onChange={(e) => setP('bankHolder', e.target.value)} placeholder="ヤマダ カズキ" />
        </Row>
        <Row label="備考">
          <textarea className="input h-16" value={note} onChange={(e) => setNote(e.target.value)} />
        </Row>
      </div>

      {/* 請求データ（テキスト）→ コピーしてClaudeへ */}
      <div className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">請求データ（コピーしてClaudeに送信）</h3>
          <span className="text-xs text-black/40">合計 {yen(total)} / {displayRows.length}件</span>
        </div>
        <textarea
          readOnly
          value={invoiceText}
          onFocus={(e) => e.currentTarget.select()}
          className="input h-72 w-full whitespace-pre font-mono text-xs leading-relaxed"
        />
        <button
          onClick={() => copyText(invoiceText, 'data')}
          className="w-full rounded-xl bg-brand-primary py-3 font-bold text-white"
        >
          {copied === 'data' ? '✓ コピーしました' : '📋 請求データをコピー'}
        </button>
        <p className="text-center text-xs text-black/40">
          コピーして、Claudeの「請求書作成」プロジェクトに貼り付けてください。
        </p>
      </div>

      {/* Claudeプロジェクト用プロンプト（初回だけ設定） */}
      <details className="rounded-xl border border-black/10 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-black/70">
          Claudeプロジェクト用プロンプト（初回だけ設定）
        </summary>
        <p className="mt-2 text-xs text-black/50">
          Claudeで「プロジェクト」を1つ作り、下のプロンプトを「プロジェクトの指示」に貼り付けてください。以後はそのプロジェクトに請求データを送るだけで請求書ができ、確認が必要なときは質問してくれます。
        </p>
        <textarea
          readOnly
          value={INVOICE_PROJECT_PROMPT}
          onFocus={(e) => e.currentTarget.select()}
          className="input mt-2 h-52 w-full whitespace-pre-wrap text-xs leading-relaxed"
        />
        <button
          onClick={() => copyText(INVOICE_PROJECT_PROMPT, 'prompt')}
          className="mt-2 w-full rounded-xl border border-brand-primary py-2.5 text-sm font-semibold text-brand-primary"
        >
          {copied === 'prompt' ? '✓ コピーしました' : '📋 プロンプトをコピー'}
        </button>
      </details>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}
