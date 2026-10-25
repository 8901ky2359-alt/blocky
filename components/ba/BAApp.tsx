'use client';

// ビフォーアフター本体（/ba と /report/ba で使う。ログイン不要）。最初に看板の有無と枚数を選び、左ビフォー／右アフターで撮る。
// 写真はこの端末の中に保存される。

import { useCallback, useEffect, useState } from 'react';
import { Project, Shot, SignSettings, emptyItems } from '@/lib/ba/types';
import { clearProject, loadProject, saveProject } from '@/lib/ba/db';
import Setup from '@/components/ba/Setup';
import WorkScreen from '@/components/ba/WorkScreen';

// back があれば左上に戻るリンクを出す（ツールボックスから開いたとき）
export default function BAApp({ back }: { back?: { href: string; label: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 復帰
  useEffect(() => {
    loadProject().then((p) => {
      setProject(p);
      setLoaded(true);
    });
  }, []);

  // サービスワーカー登録（オフライン対応）
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const persist = useCallback((p: Project) => {
    const next = { ...p, updatedAt: Date.now() };
    setProject(next);
    saveProject(next).catch(() => {});
  }, []);

  function start(count: number, sign: SignSettings | null) {
    persist({ name: sign?.place ?? '', count, items: emptyItems(count), sign, updatedAt: Date.now() });
  }

  const setShot = useCallback(
    (index: number, kind: 'before' | 'after', shot: Shot | null) => {
      setProject((cur) => {
        if (!cur) return cur;
        const items = cur.items.map((it, i) => (i === index ? { ...it, [kind]: shot } : it));
        const next = { ...cur, items, updatedAt: Date.now() };
        saveProject(next).catch(() => {});
        return next;
      });
    },
    [],
  );

  const setName = useCallback((name: string) => {
    setProject((cur) => {
      if (!cur) return cur;
      const next = { ...cur, name, updatedAt: Date.now() };
      saveProject(next).catch(() => {});
      return next;
    });
  }, []);

  // 箇所を追加（何箇所でも増やせる）
  const addItems = useCallback((n: number) => {
    setProject((cur) => {
      if (!cur) return cur;
      const add = Math.max(1, Math.floor(n) || 1);
      const items = [...cur.items, ...emptyItems(add)];
      const next = { ...cur, count: items.length, items, updatedAt: Date.now() };
      saveProject(next).catch(() => {});
      return next;
    });
  }, []);

  function reset() {
    if (!confirm('新しい案件を始めますか？（今の写真はこの端末から消えます。共有・保存は済ませてください）')) {
      return;
    }
    clearProject().finally(() => setProject(null));
  }

  if (!loaded) {
    return <div className="fw-light grid min-h-[100dvh] place-items-center text-fw-muted">読み込み中…</div>;
  }

  return (
    <div className="fw-light min-h-[100dvh]">
      {project ? (
        <WorkScreen project={project} onSetShot={setShot} onSetName={setName} onReset={reset} onAddItems={addItems} back={back} />
      ) : (
        <Setup onStart={start} back={back} />
      )}
    </div>
  );
}
