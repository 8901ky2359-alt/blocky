// 現場ルート報告の作業状態を端末に自動保存（IndexedDB）。オフライン対応。

import { SiteProgress } from './types';

const DB_NAME = 'genba-report';
const STORE = 'progress';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'workNo' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAll(): Promise<Record<string, SiteProgress>> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => {
        const map: Record<string, SiteProgress> = {};
        for (const s of (req.result as SiteProgress[]) || []) map[s.workNo] = s;
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}

export async function saveProgress(p: SiteProgress): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(p);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
