'use client';

// 請求書の発行者情報（ログインしている人ごと）

import { useState } from 'react';
import { saveProfile } from '@/lib/fw/api';
import { Profile } from '@/lib/fw/types';
import Sheet from './Sheet';

const FIELDS: { key: keyof Profile; label: string; placeholder: string }[] = [
  { key: 'issuerName', label: '請求書に載せる名前', placeholder: '' },
  { key: 'tradeName', label: '屋号（あれば）', placeholder: '例: 佐藤緑化' },
  { key: 'address', label: '住所', placeholder: '例: 茨城県つくば市…' },
  { key: 'phone', label: '電話番号', placeholder: '例: 090-0000-0000' },
  { key: 'bank', label: '振込先', placeholder: '例: 常陽銀行 つくば支店 普通 1234567 サトウ タロウ' },
  { key: 'invoiceNo', label: 'インボイス登録番号（あれば）', placeholder: '例: T1234567890123' },
];

export default function ProfileSheet({
  profile,
  fallbackName,
  onSaved,
  onClose,
}: {
  profile: Profile;
  fallbackName: string;
  onSaved: (p: Profile) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<Profile>({ ...profile, issuerName: profile.issuerName || fallbackName });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true);
    setErr('');
    try {
      onSaved((await saveProfile(p)).profile);
    } catch {
      setErr('保存できませんでした');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="発行者情報" onClose={onClose}>
      <p className="px-4 pb-3 text-sm text-fw-muted">請求書とLINEの文章に、ここの内容が入ります。</p>
      <div className="mx-4 grid gap-3 rounded-2xl bg-fw-card p-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="grid gap-1.5">
            <span className="text-[13px] text-fw-muted">{f.label}</span>
            <input
              id={`profile-${f.key}`}
              value={p[f.key]}
              onChange={(e) => setP({ ...p, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="input"
            />
          </label>
        ))}
      </div>
      <div className="grid gap-2 px-4 pt-3">
        <button onClick={save} disabled={busy} className="rounded-xl bg-fw-green py-3 font-bold text-white disabled:opacity-50">
          {busy ? '保存中…' : '保存する'}
        </button>
        {err && <p className="text-center text-sm text-fw-red">{err}</p>}
      </div>
    </Sheet>
  );
}
