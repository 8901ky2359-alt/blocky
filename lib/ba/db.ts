// Before/Afterの現場（複数）を保存するIndexedDB。家計簿とは別DB。
// v1時代は「1件だけ」保存する作りだったため、初回だけ自動で移行する。

import { Project, normalizeProject } from './types';

const DB_NAME = 'ba-photos';
const OLD_STORE = 'project'; // v1: 単一プロジェクト（key='current'）
const OLD_KEY = 'current';
const STORE = 'projects'; // v2: 複数プロジェクト（keyPath='id'）
const VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OLD_STORE)) db.createObjectStore(OLD_STORE);
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let migrated = false;

// v1で保存されていた「進行中の1件」があれば、v2の一覧に取り込む（初回のみ）
async function migrateOnce(db: IDBDatabase): Promise<void> {
  if (migrated) return;
  migrated = true;
  try {
    if (!db.objectStoreNames.contains(OLD_STORE)) return;
    const old = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(OLD_STORE, 'readonly').objectStore(OLD_STORE).get(OLD_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!old) return;
    const project = normalizeProject(old);
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(OLD_STORE, 'readwrite').objectStore(OLD_STORE).delete(OLD_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* noop */
  }
}

export async function listProjects(): Promise<Project[]> {
  try {
    const db = await openDb();
    await migrateOnce(db);
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = ((req.result as Project[]) || [])
          .map(normalizeProject)
          .filter((p) => !p.deleted);
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const db = await openDb();
    await migrateOnce(db);
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result ? normalizeProject(req.result) : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function putProject(project: Project): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(project);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
