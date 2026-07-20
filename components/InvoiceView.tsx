'use client';

import { useEffect, useMemo, useState } from 'react';
import { Entry, workTypeOf } from '@/lib/types';
import { currentMonthKey, formatJpDate, formatJpMonth, shiftMonth, todayStr, toDateStr, yen } from '@/lib/format';
import { Profile, loadProfile, saveProfile } from '@/lib/profile';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function shortDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${m}/${day}(${WEEK[new Date(y, m - 1, day).getDay()]})`;
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
  const [honorific, setHonorific] = useState('様'); // 個人=様 / 法人=御中
  const [invoiceNo, setInvoiceNo] = useState('');
  const [dueDate, setDueDate] = useState(defaultDue());
  const [taxRate, setTaxRate] = useState(0); // 既定なし（インボイス登録後に10%へ）
  const [note, setNote] = useState('お振込手数料は貴社にてご負担くださいますようお願い申し上げます。');

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setClient(p.lastClient);
  }, []);

  const { displayRows, subtotal } = useMemo(() => {
    const income = entries.filter((e) => e.kind === 'income' && e.date.slice(0, 7) === mKey);
    const ukeoi = income.filter((e) => workTypeOf(e) === '請負').sort((a, b) => (a.date < b.date ? -1 : 1));
    const jouchu = income.filter((e) => workTypeOf(e) === '常駐');
    const amtMap = new Map<number, number>();
    for (const e of jouchu) amtMap.set(e.amount, (amtMap.get(e.amount) ?? 0) + 1);
    const rows: { date: string; label: string; amount: number }[] = [];
    for (const e of ukeoi) {
      const label = [e.site, e.address && e.address !== e.site ? e.address : '']
        .filter(Boolean)
        .join('　');
      rows.push({ date: shortDate(e.date), label: label || '請負', amount: e.amount });
    }
    for (const [amt, cnt] of [...amtMap.entries()].sort((a, b) => b[0] - a[0])) {
      rows.push({ date: '', label: `常駐　${yen(amt)} × ${cnt}件`, amount: amt * cnt });
    }
    return { displayRows: rows, subtotal: income.reduce((s, e) => s + e.amount, 0) };
  }, [entries, mKey]);

  const tax = Math.floor((subtotal * taxRate) / 100);
  const total = subtotal + tax;
  const shownNo = invoiceNo || `${mKey.replace('-', '')}-01`;
  const hasBank = profile.bankName || profile.bankNumber;

  function persist() {
    saveProfile({ ...profile, lastClient: client });
  }
  function doPrint() {
    persist();
    setTimeout(() => window.print(), 50);
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
        <Row label="宛名（取引先名）">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="例: 山田 太郎"
            />
            <select
              className="input w-24 shrink-0"
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

      {/* 請求書プレビュー（このまま印刷される） */}
      <div id="invoice-print" className="rounded-xl border border-black/10 bg-white p-6 text-sm text-black">
        <h1 className="mb-4 text-center text-2xl font-bold tracking-[0.3em]">請 求 書</h1>

        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="border-b border-black pb-1 text-lg font-semibold">
              {client || '　　　　　'} {honorific}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs leading-relaxed">
            <p>請求書番号: {shownNo}</p>
            <p>発行日: {todayStr()}</p>
            <p>支払期限: {formatJpDate(dueDate)}</p>
          </div>
        </div>

        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="pt-2">下記の通りご請求申し上げます。</p>
          <div className="shrink-0 text-right text-xs leading-relaxed">
            {profile.businessName && <p className="text-sm font-semibold">{profile.businessName}</p>}
            <div className="flex items-center justify-end gap-2">
              <p className="text-sm font-semibold">{profile.name || '（氏名）'}</p>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-red-300 text-[9px] text-red-300">
                印
              </span>
            </div>
            {profile.postal && <p>〒{profile.postal}</p>}
            {profile.address && <p>{profile.address}</p>}
            {profile.phone && <p>TEL {profile.phone}</p>}
            {profile.regNo && <p>登録番号: {profile.regNo}</p>}
          </div>
        </div>

        <div className="mb-4 inline-block border-b-2 border-brand-primary bg-brand-soft px-4 py-2 text-lg font-bold">
          ご請求金額　{yen(total)}
          {taxRate > 0 ? '（税込）' : ''}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-black/40 bg-black/5">
                <th className="p-1.5 text-left">日付</th>
                <th className="p-1.5 text-left">内容（現場・作業）</th>
                <th className="p-1.5 text-right">金額</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-black/40">
                    この月の売上記録がありません
                  </td>
                </tr>
              ) : (
                displayRows.map((r, i) => (
                  <tr key={i} className="border-b border-black/10">
                    <td className="whitespace-nowrap p-1.5">{r.date}</td>
                    <td className="p-1.5">{r.label}</td>
                    <td className="whitespace-nowrap p-1.5 text-right">{yen(r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 ml-auto w-56 text-xs">
          <div className="flex justify-between border-b border-black/10 py-1">
            <span>小計</span>
            <span>{yen(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between border-b border-black/10 py-1">
              <span>消費税（{taxRate}%）</span>
              <span>{yen(tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-y-2 border-black py-1.5 text-sm font-bold">
            <span>合計</span>
            <span>{yen(total)}</span>
          </div>
        </div>

        {/* お振込先 */}
        <div className="mt-5 rounded-md border border-black/20 p-2 text-xs">
          <p className="mb-1 font-semibold">お振込先</p>
          {hasBank ? (
            <p>
              {profile.bankName} {profile.bankBranch}　{profile.bankType} {profile.bankNumber}
              {profile.bankHolder ? `　${profile.bankHolder}` : ''}
            </p>
          ) : (
            <p className="text-black/40">（振込先を入力してください）</p>
          )}
        </div>

        {note && <p className="mt-3 text-xs text-black/70">※ {note}</p>}
      </div>

      <button onClick={doPrint} className="no-print w-full rounded-xl bg-brand-primary py-3 font-bold text-white">
        🖨 印刷 / PDFで保存する
      </button>
      <p className="no-print text-center text-xs text-black/40">
        印刷画面で「PDFに保存」を選ぶと、PDFファイルとして保存でき、LINEでも送れます。
      </p>
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
