// 一度入力した作業内容を保存し、次回から選択できるようにする（localStorage）

const KEY = 'income-memos';
const MAX = 30;

export function getMemos(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

function saveList(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function addMemo(memo: string): string[] {
  const m = memo.trim();
  if (!m) return getMemos();
  const list = [m, ...getMemos().filter((x) => x !== m)].slice(0, MAX);
  saveList(list);
  return list;
}

export function removeMemo(memo: string): string[] {
  const list = getMemos().filter((x) => x !== memo);
  saveList(list);
  return list;
}
