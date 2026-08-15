// 作業者名・作業内容の登録リスト（localStorage）

const WORKERS_KEY = 'hire-workers';
const CONTENTS_KEY = 'hire-contents';

function load(key: string): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function save(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function getWorkers(): string[] {
  return load(WORKERS_KEY);
}
export function addWorker(name: string): string[] {
  const n = name.trim();
  if (!n) return getWorkers();
  const list = [n, ...getWorkers().filter((x) => x !== n)];
  save(WORKERS_KEY, list);
  return list;
}
export function removeWorker(name: string): string[] {
  const list = getWorkers().filter((x) => x !== name);
  save(WORKERS_KEY, list);
  return list;
}

export function getContents(): string[] {
  return load(CONTENTS_KEY);
}
export function addContent(text: string): string[] {
  const n = text.trim();
  if (!n) return getContents();
  const list = [n, ...getContents().filter((x) => x !== n)];
  save(CONTENTS_KEY, list);
  return list;
}
export function removeContent(text: string): string[] {
  const list = getContents().filter((x) => x !== text);
  save(CONTENTS_KEY, list);
  return list;
}
