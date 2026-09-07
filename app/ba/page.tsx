'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Project, Shot, doneCount, emptyItems, isProjectDone } from '@/lib/ba/types';
import { listProjects, putProject, deleteProject as removeProject } from '@/lib/ba/db';
import { formatJpDate } from '@/lib/format';
import AppNav from '@/components/AppNav';
import AppMenu from '@/components/AppMenu';
import RequireRole from '@/components/RequireRole';
import ProjectForm from '@/components/ba/ProjectForm';
import WorkScreen from '@/components/ba/WorkScreen';
import BaMap from '@/components/ba/BaMap';

type View = { kind: 'browse' } | { kind: 'form'; editing: Project | null } | { kind: 'work'; id: string };

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function BAPage() {
  return (
    <RequireRole role="admin">
      {() => <BAPageInner />}
    </RequireRole>
  );
}

function BAPageInner() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [view, setView] = useState<View>({ kind: 'browse' });

  const refresh = useCallback(async () => {
    setProjects(await listProjects());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [refresh]);

  const activeProject = useMemo(
    () => (view.kind === 'work' ? projects.find((p) => p.id === view.id) ?? null : null),
    [projects, view],
  );

  async function createProject(input: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    startDate: string;
    count: number;
    showSign: boolean;
  }) {
    const now = Date.now();
    const project: Project = {
      id: newId(),
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      startDate: input.startDate,
      count: input.count,
      items: emptyItems(input.count),
      showSign: input.showSign,
      createdAt: now,
      updatedAt: now,
    };
    await putProject(project);
    await refresh();
    setView({ kind: 'work', id: project.id });
  }

  async function updateProjectInfo(
    editing: Project,
    input: {
      name: string;
      address: string;
      lat?: number;
      lng?: number;
      startDate: string;
      count: number;
      showSign: boolean;
    },
  ) {
    const next: Project = { ...editing, ...input, updatedAt: Date.now() };
    await putProject(next);
    await refresh();
    setView({ kind: 'work', id: editing.id });
  }

  async function deleteProject(id: string) {
    if (!confirm('この現場の記録を削除しますか？（写真もすべて削除されます）')) return;
    await removeProject(id);
    await refresh();
    setView({ kind: 'browse' });
  }

  async function setShot(project: Project, index: number, kind: 'before' | 'after', shot: Shot | null) {
    const items = project.items.map((it, i) => (i === index ? { ...it, [kind]: shot } : it));
    await putProject({ ...project, items, updatedAt: Date.now() });
    await refresh();
  }

  async function addItems(project: Project, n: number) {
    const add = Math.max(1, Math.floor(n) || 1);
    const items = [...project.items, ...emptyItems(add)];
    await putProject({ ...project, items, count: items.length, updatedAt: Date.now() });
    await refresh();
  }

  // 一括アップロード：空いている枠に古い方から順に割り当て、足りなければ枠を追加する
  async function bulkImport(project: Project, kind: 'before' | 'after', shots: Shot[]) {
    const items = project.items.map((it) => ({ ...it }));
    const emptySlots: number[] = [];
    items.forEach((it, i) => {
      if (!it[kind]) emptySlots.push(i);
    });
    let s = 0;
    for (; s < shots.length && s < emptySlots.length; s++) {
      items[emptySlots[s]][kind] = shots[s];
    }
    for (; s < shots.length; s++) {
      const empty = { before: null, after: null };
      items.push({ ...empty, [kind]: shots[s] });
    }
    await putProject({ ...project, items, count: items.length, updatedAt: Date.now() });
    await refresh();
  }

  return (
    <div className="min-h-[100dvh] hud-bg text-slate-100">
      <div className="px-4 pt-3">
        <div className="mx-auto flex max-w-md items-start gap-2">
          <div className="min-w-0 flex-1">
            <AppNav />
          </div>
          <AppMenu />
        </div>
      </div>

      <div className="mx-auto max-w-md bg-white text-slate-900">
        {loading ? (
          <div className="grid min-h-[60vh] place-items-center text-slate-400">読み込み中…</div>
        ) : view.kind === 'form' ? (
          <ProjectForm
            editing={view.editing}
            onSave={(input) => (view.editing ? updateProjectInfo(view.editing, input) : createProject(input))}
            onCancel={() => setView(view.editing ? { kind: 'work', id: view.editing.id } : { kind: 'browse' })}
          />
        ) : view.kind === 'work' && activeProject ? (
          <>
            <WorkScreen
              project={activeProject}
              onSetShot={(i, k, shot) => setShot(activeProject, i, k, shot)}
              onBulkImport={(k, shots) => bulkImport(activeProject, k, shots)}
              onAddItems={(n) => addItems(activeProject, n)}
              onEdit={() => setView({ kind: 'form', editing: activeProject })}
              onBack={() => setView({ kind: 'browse' })}
            />
            <div className="mx-auto max-w-md px-4 pb-24">
              <button
                onClick={() => deleteProject(activeProject.id)}
                className="w-full py-2 text-center text-xs text-rose-400"
              >
                この現場を削除する
              </button>
            </div>
          </>
        ) : (
          <div className="px-4 py-4">
            {/* リスト / 地図 切替 */}
            <div className="mb-3 flex overflow-hidden rounded-full border border-slate-200">
              <button
                onClick={() => setMode('list')}
                className={`flex-1 py-2 text-xs font-bold ${mode === 'list' ? 'bg-brand-accent text-white' : 'text-slate-500'}`}
              >
                ☰ リスト表示
              </button>
              <button
                onClick={() => setMode('map')}
                className={`flex-1 border-l border-slate-200 py-2 text-xs font-bold ${mode === 'map' ? 'bg-brand-accent text-white' : 'text-slate-500'}`}
              >
                🗺 地図表示
              </button>
            </div>

            <button
              onClick={() => setView({ kind: 'form', editing: null })}
              className="mb-3 w-full rounded-none bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20"
            >
              ＋ 記録する
            </button>

            {mode === 'map' ? (
              <BaMap projects={projects} onOpen={(p) => setView({ kind: 'work', id: p.id })} />
            ) : projects.length === 0 ? (
              <p className="rounded-sm border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
                まだ現場が登録されていません。
                <br />
                「＋ 記録する」から始めましょう。
              </p>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} onOpen={() => setView({ kind: 'work', id: p.id })} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const done = isProjectDone(project);
  const thumb = project.items.find((it) => it.after || it.before);
  const thumbUrl = thumb?.after?.dataUrl ?? thumb?.before?.dataUrl;

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-sm border border-slate-200 bg-white p-3 text-left shadow-sm"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-sm bg-slate-100">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl text-slate-300">📷</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-slate-800">{project.name || '（現場名なし）'}</span>
          {done && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              ✓ 完了
            </span>
          )}
        </div>
        <div className="truncate text-xs text-slate-400">
          {project.startDate ? formatJpDate(project.startDate) : '日付未設定'}
          {project.address ? `　${project.address}` : ''}
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-slate-500">
        {doneCount(project)}/{project.items.length}
      </span>
      <span className="shrink-0 text-lg text-slate-300">›</span>
    </button>
  );
}
