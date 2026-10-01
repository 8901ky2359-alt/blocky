// 休みの保存（IndexedDB）。オフライン対応。

import { Holiday, normalizeHoliday } from './types';

const DB_NAME = 'genba-holiday';
const STORE = 'records';
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
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listHolidays(): Promise<Holiday[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = ((req.result as Holiday[]) || []).map(normalizeHoliday).filter((r) => !r.deleted);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// 同期用：削除済み(墓標)も含めた全件
export async function listHolidaysRaw(): Promise<Holiday[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(((req.result as Holiday[]) || []).map(normalizeHoliday));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function putHoliday(rec: Holiday): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
