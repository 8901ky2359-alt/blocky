// 締日グループ（同じ請求先でも締日が違う現場を A/B/C で振り分ける）
import { toDateStr } from './format';

export const BILL_GROUPS = ['A', 'B', 'C'] as const;
export type BillGroup = (typeof BILL_GROUPS)[number];

// 各グループの締日ルール（day: 締め/請求日。'end' は月末日）
const RULE: Record<BillGroup, { day: number | 'end'; text: string }> = {
  A: { day: 5, text: '毎月5日請求' },
  B: { day: 25, text: '毎月25日請求' },
  C: { day: 'end', text: '月末日請求' },
};

export function isBillGroup(v?: string): v is BillGroup {
  return !!v && (BILL_GROUPS as readonly string[]).includes(v);
}

// 「毎月25日請求」などの説明文
export function billGroupText(g?: string): string {
  return isBillGroup(g) ? RULE[g].text : '';
}

// セレクトの表示ラベル「A（毎月5日請求）」
export function billGroupOptionLabel(g: BillGroup): string {
  return `${g}（${RULE[g].text}）`;
}

// 対象月(mKey='YYYY-MM')の「翌月」の締日を支払期限の目安として計算
export function billGroupDueDate(mKey: string, g?: string): string | null {
  if (!isBillGroup(g)) return null;
  const [y, m] = mKey.split('-').map(Number);
  const yy = m === 12 ? y + 1 : y;
  const mm = m === 12 ? 1 : m + 1; // 翌月
  const lastDay = new Date(yy, mm, 0).getDate();
  const rule = RULE[g];
  const day = rule.day === 'end' ? lastDay : Math.min(rule.day, lastDay);
  return toDateStr(new Date(yy, mm - 1, day));
}
