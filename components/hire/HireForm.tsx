'use client';

import { useEffect, useState } from 'react';
import { HireRecord, DEFAULT_ORDERER, DEFAULT_PAYMENT_TERMS } from '@/lib/hire/types';
import { todayStr } from '@/lib/format';
import {
  getWorkers,
  addWorker,
  removeWorker,
  getContents,
  addContent,
  removeContent,
} from '@/lib/hire/presets';
import SignaturePad from './SignaturePad';

export default function HireForm({
  editing,
  onSave,
  onCancel,
}: {
  editing?: HireRecord | null;
  onSave: (rec: HireRecord) => void;
  onCancel: () => void;
}) {
  const [orderer, setOrderer] = useState(editing?.orderer ?? DEFAULT_ORDERER);
  const [worker, setWorker] = useState(editing?.worker ?? '');
  const [workContent, setWorkContent] = useState(editing?.workContent ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [dateStart, setDateStart] = useState(editing?.dateStart ?? todayStr());
  const [dateEnd, setDateEnd] = useState(editing?.dateEnd ?? '');
  const [rate, setRate] = useState(editing?.rate ?? '1人工 20,000円');
  const [paymentTerms, setPaymentTerms] = useState(editing?.paymentTerms ?? DEFAULT_PAYMENT_TERMS);
  const [travelLodging, setTravelLodging] = useState(editing?.travelLodging ?? '発注者負担（実費）');
  const [ordererSign, setOrdererSign] = useState<string | undefined>(editing?.ordererSign);
  const [workerSign, setWorkerSign] = useState<string | undefined>(editing?.workerSign);
  const [ordererConfirmed, setOrdererConfirmed] = useState(!!editing?.ordererConfirmed);
  const [workerConfirmed, setWorkerConfirmed] = useState(!!editing?.workerConfirmed);
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const [workers, setWorkers] = useState<string[]>([]);
  const [contents, setContents] = useState<string[]>([]);

  useEffect(() => {
    setWorkers(getWorkers());
    setContents(getContents());
  }, []);

  function registerWorker() {
    if (!worker.trim()) return;
    setWorkers(addWorker(worker));
  }
  function registerContent() {
    if (!workContent.trim()) return;
    setContents(addContent(workContent));
  }

  function submit() {
    if (!worker.trim()) {
      alert('作業者名を入力してください');
      return;
    }
    const now = Date.now();
    onSave({
      id: editing?.id ?? Math.random().toString(36).slice(2, 12),
      orderer: orderer.trim() || DEFAULT_ORDERER,
      worker: worker.trim(),
      workContent: workContent.trim(),
      location: location.trim(),
      dateStart,
      dateEnd: dateEnd || undefined,
      rate: rate.trim(),
      paymentTerms: paymentTerms.trim(),
      travelLodging: travelLodging.trim(),
      ordererSign,
      workerSign,
      ordererConfirmed,
      workerConfirmed,
      memo: memo.trim(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">{editing ? '作業依頼を編集' : '作業依頼を作成'}</h2>

      {/* 発注者 */}
      <Field label="発注者名">
        <input value={orderer} onChange={(e) => setOrderer(e.target.value)} className="input" placeholder="山田一貴" />
      </Field>

      {/* 作業者（登録可） */}
      <Field label="作業者名">
        <div className="flex gap-2">
          <input value={worker} onChange={(e) => setWorker(e.target.value)} className="input flex-1" placeholder="例: 田中太郎" />
          <button onClick={registerWorker} className="shrink-0 rounded-xl border border-brand-primary px-3 text-sm font-semibold text-brand-primary">
            登録
          </button>
        </div>
        {workers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {workers.map((w) => (
              <span key={w} className="flex items-center gap-1 rounded-full border border-black/15 pl-3 pr-1 text-xs">
                <button onClick={() => setWorker(w)} className={`py-1 ${worker === w ? 'font-bold text-brand-primary' : 'text-black/60'}`}>
                  {w}
                </button>
                <button onClick={() => setWorkers(removeWorker(w))} className="grid h-5 w-5 place-items-center text-black/30" aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* 作業内容（登録可） */}
      <Field label="作業内容">
        <div className="flex gap-2">
          <input
            value={workContent}
            onChange={(e) => setWorkContent(e.target.value)}
            className="input flex-1"
            placeholder="例: 草刈り作業・防草シート施工"
          />
          <button onClick={registerContent} className="shrink-0 rounded-xl border border-brand-primary px-3 text-sm font-semibold text-brand-primary">
            登録
          </button>
        </div>
        {contents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contents.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-full border border-black/15 pl-3 pr-1 text-xs">
                <button onClick={() => setWorkContent(c)} className={`py-1 ${workContent === c ? 'font-bold text-brand-primary' : 'text-black/60'}`}>
                  {c}
                </button>
                <button onClick={() => setContents(removeContent(c))} className="grid h-5 w-5 place-items-center text-black/30" aria-label="削除">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* 作業場所 */}
      <Field label="作業場所">
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="例: 茨城県◯◯市△△" />
      </Field>

      {/* 作業日・期間 */}
      <Field label="作業日・期間">
        <div className="flex items-center gap-2">
          <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="input flex-1" />
          <span className="shrink-0 text-black/40">〜</span>
          <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="input flex-1" />
        </div>
        <p className="text-[11px] text-black/40">単日なら右側は空欄でOK。</p>
      </Field>

      {/* 報酬額 */}
      <Field label="報酬額">
        <input value={rate} onChange={(e) => setRate(e.target.value)} className="input" placeholder="例: 1人工 20,000円" />
      </Field>

      {/* 支払条件 */}
      <Field label="支払条件">
        <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="input" placeholder="例: 月末締め翌月末払い" />
      </Field>

      {/* 交通費・宿泊費 */}
      <Field label="交通費・宿泊費の負担">
        <input value={travelLodging} onChange={(e) => setTravelLodging(e.target.value)} className="input" placeholder="例: 発注者負担（実費）／各自負担 など" />
      </Field>

      {/* 署名・確認 */}
      <div className="space-y-3 rounded-xl border border-black/10 bg-white p-3">
        <p className="text-sm font-bold text-black/70">署名・確認</p>
        <SignaturePad label={`発注者（${orderer || '発注者'}）の署名`} value={ordererSign} onChange={setOrdererSign} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ordererConfirmed} onChange={(e) => setOrdererConfirmed(e.target.checked)} className="h-5 w-5 accent-brand-primary" />
          発注者が内容を確認
        </label>
        <SignaturePad label={`作業者（${worker || '作業者'}）の署名`} value={workerSign} onChange={setWorkerSign} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={workerConfirmed} onChange={(e) => setWorkerConfirmed(e.target.checked)} className="h-5 w-5 accent-brand-primary" />
          作業者が内容を確認
        </label>
      </div>

      {/* メモ */}
      <Field label="メモ（任意）">
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} className="input h-20" placeholder="備考・特記事項など" />
      </Field>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-black/15 py-3">
          キャンセル
        </button>
        <button onClick={submit} className="flex-[2] rounded-xl bg-brand-primary py-3 font-bold text-white">
          保存する
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-black/70">{label}</span>
      {children}
    </div>
  );
}
