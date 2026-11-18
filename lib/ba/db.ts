// Before/Afterプロジェクトの自動保存（IndexedDB）。家計簿とは別DB。
// - project：箇所数・名前・看板と、各写真の ID だけ（小さいので何度保存しても軽い）
// - photos：写真1枚ごと（元の画質 full と一覧用の小さい thumb）。撮るたびにその1枚だけを書き込む
// 以前は全部の写真を project に入れて毎回まるごと書き直していたため、100枚を超えると
// 保存に時間がかかったり、途中で落ちて保存されなかったりしていた。開いたときに新しい形へ移す。

import { Item, Project, Shot } from './types';

const DB_NAME = 'ba-photos';
const STORE = 'project';
const PHOTOS = 'photos';
const KEY = 'current';
const VERSION = 2;

type StoredPhoto = { full: ArrayBuffer; thumb: ArrayBuffer; type: string };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        let result: T;
        if (req) req.onsuccess = () => (result = req.result);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// 写真1枚を保存して ID を返す（書き込みが終わってから返すので、返ってきた時点で保存済み）
export async function putPhoto(full: Blob, thumb: Blob): Promise<string> {
  const id = newId();
  const rec: StoredPhoto = { full: await full.arrayBuffer(), thumb: await thumb.arrayBuffer(), type: full.type || 'image/jpeg' };
  await run(PHOTOS, 'readwrite', (s) => s.put(rec, id));
  return id;
}

async function getPhoto(id: string): Promise<StoredPhoto | undefined> {
  return run<StoredPhoto | undefined>(PHOTOS, 'readonly', (s) => s.get(id));
}

// 元の画質の写真（保存・共有・拡大表示用）
export async function getFull(id: string): Promise<Blob> {
  const rec = await getPhoto(id);
  if (!rec) throw new Error('photo-missing');
  return new Blob([rec.full], { type: rec.type });
}

export async function deletePhoto(id: string): Promise<void> {
  await run(PHOTOS, 'readwrite', (s) => s.delete(id)).catch(() => {});
}

// 一覧用の小さい画像の object URL を付ける
async function withThumbs(p: Project): Promise<Project> {
  const attach = async (shot: Shot | null): Promise<Shot | null> => {
    if (!shot) return null;
    const rec = await getPhoto(shot.id).catch(() => undefined);
    if (!rec) return null; // 写真が見つからない（消えた）ときは空にする
    return { id: shot.id, thumb: URL.createObjectURL(new Blob([rec.thumb], { type: 'image/jpeg' })) };
  };
  const items: Item[] = [];
  for (const it of p.items) items.push({ before: await attach(it.before), after: await attach(it.after) });
  return { ...p, items };
}

// 以前の形（写真を data URL のまま project に入れていた）を、1枚ずつの保存に移す
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function migrate(p: any, makeThumb: (full: Blob) => Promise<Blob>): Promise<Project> {
  const conv = async (shot: { dataUrl?: string; id?: string } | null): Promise<Shot | null> => {
    if (!shot) return null;
    if (shot.id) return { id: shot.id };
    if (!shot.dataUrl) return null;
    const full = await (await fetch(shot.dataUrl)).blob();
    return { id: await putPhoto(full, await makeThumb(full)) };
  };
  const items: Item[] = [];
  for (const it of p.items ?? []) items.push({ before: await conv(it.before), after: await conv(it.after) });
  const next: Project = { ...p, items };
  await saveProject(next);
  return next;
}

export async function loadProject(makeThumb: (full: Blob) => Promise<Blob>): Promise<Project | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p = await run<any>(STORE, 'readonly', (s) => s.get(KEY));
    if (!p) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((p.items ?? []).some((it: any) => it?.before?.dataUrl || it?.after?.dataUrl)) p = await migrate(p, makeThumb);
    return await withThumbs(p);
  } catch {
    return null;
  }
}

// project は写真の ID だけを書く（thumb の URL は保存しない）
export async function saveProject(project: Project): Promise<void> {
  const strip = (s: Shot | null) => (s ? { id: s.id } : null);
  const rec: Project = { ...project, items: project.items.map((it) => ({ before: strip(it.before), after: strip(it.after) })) };
  await run(STORE, 'readwrite', (s) => s.put(rec, KEY));
}

export async function clearProject(): Promise<void> {
  try {
    await run(STORE, 'readwrite', (s) => s.delete(KEY));
    await run(PHOTOS, 'readwrite', (s) => s.clear());
  } catch {
    /* noop */
  }
}
