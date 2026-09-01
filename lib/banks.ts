// 一度入力した振込先を保存し、次回から選択できるようにする（localStorage）

export interface BankInfo {
  bankName: string;
  bankBranch: string;
  bankType: string;
  bankNumber: string;
  bankHolder: string;
}

const KEY = 'invoice-banks';
const MAX = 8;

export function getBanks(): BankInfo[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is BankInfo => x && typeof x.bankName === 'string' && typeof x.bankNumber === 'string',
    );
  } catch {
    return [];
  }
}

function saveList(list: BankInfo[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

// 同じ銀行名＋口座番号は同一とみなす
function sameBank(a: BankInfo, b: BankInfo): boolean {
  return a.bankName === b.bankName && a.bankNumber === b.bankNumber;
}

export function addBank(b: BankInfo): BankInfo[] {
  if (!b.bankName.trim() && !b.bankNumber.trim()) return getBanks();
  const list = [b, ...getBanks().filter((x) => !sameBank(x, b))].slice(0, MAX);
  saveList(list);
  return list;
}

export function removeBank(b: BankInfo): BankInfo[] {
  const list = getBanks().filter((x) => !sameBank(x, b));
  saveList(list);
  return list;
}

export function bankLabel(b: BankInfo): string {
  return `${b.bankName} ${b.bankBranch} ${b.bankType} ${b.bankNumber}`.trim();
}
