'use client';

import { useEffect, useMemo, useState } from 'react';
import { checklist, summary, type Photo } from '@/lib/checklist';

type Filter = 'all' | '高' | '中' | '低' | '-' | 'todo';

const STORAGE_KEY = 'nishi-hiroshima-checklist-done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: `すべて（${summary.total}）` },
  { key: '高', label: `高（${summary.high}）` },
  { key: '中', label: `中（${summary.mid}）` },
  { key: '低', label: `低（${summary.low}）` },
  { key: '-', label: `点検継続（${summary.watch}）` },
  { key: 'todo', label: '未チェックのみ' },
];

export default function Home() {
  const [filter, setFilter] = useState<Filter>('all');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState<Photo | null>(null);

  // 対応チェック状態を localStorage から復元
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  }, [done, loaded]);

  // Escでライトボックスを閉じる
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const doneCount = useMemo(
    () => checklist.filter((i) => done[i.no]).length,
    [done]
  );
  const progress = Math.round((100 * doneCount) / summary.total);

  const toggle = (no: string) =>
    setDone((prev) => ({ ...prev, [no]: !prev[no] }));

  const visible = (no: string, priority: string) => {
    if (filter === 'all') return true;
    if (filter === 'todo') return !done[no];
    return priority === filter;
  };

  return (
    <>
      <div className="top">
        <div className="top-in">
          <p className="eyebrow">西広島サイト｜土木カルテ点検フォロー</p>
          <h1>水路工 現地調査結果 チェックリスト</h1>
          <p className="meta">
            現地調査日：2026年4月28日（株式会社環境地質）／ 出典：表4-1
            現地調査結果・図4-3 現地写真集
          </p>
          <div className="progress-wrap">
            <div className="pbar">
              <div style={{ width: `${progress}%` }} />
            </div>
            <p className="pnum">
              <b>{doneCount}</b> / {summary.total} 箇所 対応チェック済み
            </p>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="summary">
          <div className="sum s-hi">
            <b>{summary.high}</b>
            <span>優先度 高</span>
          </div>
          <div className="sum s-mid">
            <b>{summary.mid}</b>
            <span>優先度 中</span>
          </div>
          <div className="sum">
            <b>{summary.low}</b>
            <span>優先度 低</span>
          </div>
          <div className="sum">
            <b>{summary.watch}</b>
            <span>点検継続</span>
          </div>
        </div>
        <p className="legend">
          <b>数量合計</b>（優先度 中＋高）：クラック 110m ／ 土砂堆積 255m ／
          軽微な堆積 376m ／ 洗掘 60m　<b>全体</b>：クラック 110m ／ 土砂堆積
          287m ／ 軽微な堆積 666m ／ 洗掘 60m
        </p>

        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? 'on' : undefined}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {checklist.map((item) => {
          const isDone = !!done[item.no];
          return (
            <section
              key={item.no}
              className={`card${isDone ? ' done' : ''}`}
              style={{ display: visible(item.no, item.priority) ? '' : 'none' }}
            >
              <header className="card-h">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggle(item.no)}
                  />
                  <span className="box" />
                </label>
                <div className="card-t">
                  <div className="row1">
                    <span className="no">{item.no}</span>
                    <span className={`badge pri-${item.badgeKind}`}>
                      {item.badgeLabel}
                    </span>
                    {item.gid && <span className="gid">{item.gid}</span>}
                  </div>
                  <h2>{item.title}</h2>
                  {item.other && <p className="other">{item.other}</p>}
                  {item.chips.length > 0 && (
                    <div className="chips">
                      {item.chips.map((c, i) => (
                        <span key={i} className={`chip chip-${c.kind}`}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.note && <p className="note">{item.note}</p>}
                  {item.action && (
                    <div className="action">
                      <span className="a-label">対策</span>
                      {item.action}
                    </div>
                  )}
                </div>
              </header>
              {item.photos.length > 0 && (
                <div className="photos">
                  {item.photos.map((p) => (
                    <figure key={p.id}>
                      <button
                        type="button"
                        className="photo-btn"
                        onClick={() => setZoom(p)}
                        aria-label={`${p.alt} を拡大`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt={p.alt} loading="lazy" />
                      </button>
                      <figcaption>
                        <b>{p.id}</b>　{p.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.alt} />
          <p className="lb-cap">
            <b>{zoom.id}</b>　{zoom.caption}
          </p>
        </div>
      )}
    </>
  );
}
