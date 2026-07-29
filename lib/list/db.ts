// 現場リストの作業状態（完了フラグ・写真）を端末に自動保存（IndexedDB）。
// 家計簿(genba-kakeibo)・B/A(ba-photos)とは別DB。オフラインでも動作する。

import { SiteState } from './types';

const DB_NAME = 'genba-list';
const STORE = 'sites';
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

export async function loadAllStates(): Promise<Record<string, SiteState>> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => {
        const map: Record<string, SiteState> = {};
        for (const s of (req.result as SiteState[]) || []) map[s.workNo] = s;
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return {};
  }
}

export async function saveState(state: SiteState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(state);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
