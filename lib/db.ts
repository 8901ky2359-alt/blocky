// データ保存層
// 現状: 端末内(IndexedDB)。将来: この関数群をSupabase実装に差し替えるだけで同期化できる。

import { Entry } from './types';
import { geocodeAddress } from './geocode';

const DB_NAME = 'genba-kakeibo';
const STORE = 'entries';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function listEntries(): Promise<Entry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => {
      const rows = (req.result as Entry[]) || [];
      rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function putEntry(entry: Entry): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// バックアップ用: 全データをJSON文字列に
export async function exportJson(): Promise<string> {
  const rows = await listEntries();
  return JSON.stringify({ app: DB_NAME, version: VERSION, entries: rows }, null, 2);
}

export async function importJson(json: string): Promise<number> {
  const parsed = JSON.parse(json);
  const entries: Entry[] = parsed.entries || [];
  for (const e of entries) {
    // 住所はあるが位置未取得の記録は、取り込み時に住所検索して地図ピンを付ける
    if (e.address && (e.lat == null || e.lng == null)) {
      try {
        const r = await geocodeAddress(e.address);
        if (r) {
          e.lat = r.lat;
          e.lng = r.lng;
        }
      } catch {
        /* オフライン等はスキップ（後で「地図に登録」可能） */
      }
      await new Promise((res) => setTimeout(res, 250));
    }
    await putEntry(e);
  }
  return entries.length;
}
