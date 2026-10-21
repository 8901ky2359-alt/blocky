'use client';

// 総合管理画面：以前の「売上管理」に入れていた売上を取り込む（取り込む物が残っているときだけ表示）

import { useEffect, useState } from 'react';
import { LegacySummary, importLegacy, legacySummary } from '@/lib/fw/api';
import { yen } from '@/lib/format';
import { withTax } from '@/lib/tax';

export default function LegacyImportCard({ onImported }: { onImported: () => void }) {
  const [summary, setSummary] = useState<LegacySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    legacySummary()
      .then(setSummary)
      .catch(() => {});
  }, []);

  async function run() {
    setBusy(true);
    try {
      const r = await importLegacy();
      setDone(`${r.imported}件を取り込みました`);
      setSummary(null);
      onImported();
    } catch {
      setDone('取り込めませんでした。電波の良いところでもう一度開いてください');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="mx-4 mb-5 rounded-2xl bg-fw-card p-4 text-center text-sm text-fw-green">{done}</p>;
  if (!summary || summary.importable === 0) return null;
  return (
    <div className="mx-4 mb-5 grid gap-2 rounded-2xl bg-fw-card p-4">
      <p className="font-bold">以前の売上管理のデータがあります</p>
      <p className="text-sm text-fw-muted">
        売上 {summary.importable}件（税込 {yen(withTax(summary.importableTotal))}・税抜 {yen(summary.importableTotal)}）を取り込めます。入金日を過ぎた分は「入金済み」、
        まだ先の{summary.unpaid}件は次回入金予定に入ります。
        {summary.skippedExpense > 0 && ` 経費など${summary.skippedExpense}件は取り込みません。`}
      </p>
      <button onClick={run} disabled={busy} className="rounded-xl bg-fw-green py-3 font-bold text-white disabled:opacity-50">
        {busy ? '取り込み中…' : '取り込む'}
      </button>
    </div>
  );
}
