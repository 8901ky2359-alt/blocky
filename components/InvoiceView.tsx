'use client';

import { useEffect, useMemo, useState } from 'react';
import { Entry } from '@/lib/types';
import { currentMonthKey, formatJpMonth, shiftMonth, todayStr, yen } from '@/lib/format';
import { Profile, loadProfile, saveProfile } from '@/lib/profile';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function shortDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${m}/${day}(${WEEK[new Date(y, m - 1, day).getDay()]})`;
}

export default function InvoiceView({ entries, onBack }: { entries: Entry[]; onBack: () => void }) {
  const [mKey, setMKey] = useState(currentMonthKey());
  const [profile, setProfile] = useState<Profile>({
    businessName: '',
    name: '',
    contact: '',
    lastClient: '',
  });
  const [client, setClient] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [taxRate, setTaxRate] = useState(0); // 0 or 10

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setClient(p.lastClient);
  }, []);

  const rows = useMemo(
    () =>
      entries
        .filter((e) => e.kind === 'income' && e.date.slice(0, 7) === mKey)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries, mKey],
  );

  const subtotal = rows.reduce((s, e) => s + e.amount, 0);
  const tax = Math.floor((subtotal * taxRate) / 100);
  const total = subtotal + tax;

  function persist() {
    saveProfile({ ...profile, lastClient: client });
  }

  function doPrint() {
    persist();
    setTimeout(() => window.print(), 50);
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="no-print flex items-center gap-2">
        <button onClick={onBack} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm">
          ‹ 戻る
        </button>
        <h2 className="text-lg font-bold">請求書を作る</h2>
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
        <Row label="宛名（元請け名）">
          <input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="〇〇建設 様" />
        </Row>
        <Row label="屋号">
          <input
            className="input"
            value={profile.businessName}
            onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
            placeholder="（任意）〇〇造園"
          />
        </Row>
        <Row label="氏名">
          <input
            className="input"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="山田 太郎"
          />
        </Row>
        <Row label="連絡先（住所・電話）">
          <input
            className="input"
            value={profile.contact}
            onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
            placeholder="TEL 000-0000-0000"
          />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="請求番号（任意）">
            <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Row>
          <Row label="消費税">
            <select className="input" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))}>
              <option value={0}>なし</option>
              <option value={10}>10%</option>
            </select>
          </Row>
        </div>
      </div>

      {/* 請求書プレビュー（このまま印刷される） */}
      <div id="invoice-print" className="rounded-xl border border-black/10 bg-white p-6 text-sm text-black">
        <h1 className="mb-4 text-center text-2xl font-bold tracking-widest">請 求 書</h1>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="border-b border-black pb-1 text-lg font-semibold">{client || '　　　　　'} 御中</p>
          </div>
          <div className="text-right text-xs">
            <p>発行日: {todayStr()}</p>
            {invoiceNo && <p>No. {invoiceNo}</p>}
          </div>
        </div>

        <div className="mb-4 text-right text-xs leading-relaxed">
          {profile.businessName && <p className="text-sm font-semibold">{profile.businessName}</p>}
          <p className="text-sm font-semibold">{profile.name || '（氏名）'}</p>
          {profile.contact && <p>{profile.contact}</p>}
        </div>

        <p className="mb-2">下記の通りご請求申し上げます。</p>
        <div className="mb-4 inline-block bg-brand-soft px-4 py-2 text-lg font-bold">
          ご請求金額　{yen(total)}
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-black/40 bg-black/5">
              <th className="p-1.5 text-left">日付</th>
              <th className="p-1.5 text-left">内容（現場・作業）</th>
              <th className="p-1.5 text-right">金額</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-3 text-center text-black/40">
                  この月の売上記録がありません
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.id} className="border-b border-black/10">
                  <td className="p-1.5">{shortDate(e.date)}</td>
                  <td className="p-1.5">
                    {e.site}
                    {e.site && '　'}
                    {e.category}
                    {e.memo ? `（${e.memo}）` : ''}
                  </td>
                  <td className="p-1.5 text-right">{yen(e.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
      </div>

      <button
        onClick={doPrint}
        className="no-print w-full rounded-xl bg-brand-primary py-3 font-bold text-white"
      >
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
