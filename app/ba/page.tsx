'use client';

import { useCallback, useEffect, useState } from 'react';
import { Project, Shot, emptyItems } from '@/lib/ba/types';
import { clearProject, loadProject, saveProject } from '@/lib/ba/db';
import AppNav from '@/components/AppNav';
import Setup from '@/components/ba/Setup';
import WorkScreen from '@/components/ba/WorkScreen';

export default function BAPage() {
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

  function start(count: number) {
    persist({ name: '', count, items: emptyItems(count), updatedAt: Date.now() });
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
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-slate-50 text-slate-400">読み込み中…</div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <div className="px-4 pt-3">
        <div className="mx-auto max-w-md">
          <AppNav />
        </div>
      </div>
      {project ? (
        <WorkScreen project={project} onSetShot={setShot} onSetName={setName} onReset={reset} onAddItems={addItems} />
      ) : (
        <Setup onStart={start} />
      )}
    </div>
  );
}
