// 締日グループ（同じ請求先でも支払日が違う現場を A/B/C で振り分ける）
// 考え方：締めは毎月末（対象月の1ヶ月分をまとめて請求）。支払日（入金日）がグループごとに違う。
//   A＝翌月5日払い／B＝翌月25日払い／C＝翌月末払い
import { formatJpDate, formatJpMonth, toDateStr } from './format';

export const BILL_GROUPS = ['A', 'B', 'C'] as const;
export type BillGroup = (typeof BILL_GROUPS)[number];

// 各グループの支払日ルール（day: 翌月の支払日。'end' は翌月末日）
const RULE: Record<BillGroup, { day: number | 'end'; text: string; shortText: string }> = {
  A: { day: 5, text: '月末締め・翌月5日払い', shortText: '翌月5日払い' },
  B: { day: 25, text: '月末締め・翌月25日払い', shortText: '翌月25日払い' },
  C: { day: 'end', text: '月末締め・翌月末払い', shortText: '翌月末払い' },
};

export function isBillGroup(v?: string): v is BillGroup {
  return !!v && (BILL_GROUPS as readonly string[]).includes(v);
}

// 「月末締め・翌月25日払い」など、締め・支払いの考え方を表す説明文
export function billGroupText(g?: string): string {
  return isBillGroup(g) ? RULE[g].text : '';
}

// 「翌月25日払い」など短い表記（バッジ等の省スペース用）
export function billGroupShortText(g?: string): string {
  return isBillGroup(g) ? RULE[g].shortText : '';
}

// セレクトの表示ラベル「A（月末締め・翌月5日払い）」
export function billGroupOptionLabel(g: BillGroup): string {
  return `${g}（${RULE[g].text}）`;
}

// 対象月(mKey='YYYY-MM')の「翌月」の支払日を計算
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

// 「9月分　→　10月25日 お支払い予定」のように、対象月と入金日の対応を一文で表す
export function billGroupPaymentLine(mKey: string, g?: string): string | null {
  const due = billGroupDueDate(mKey, g);
  if (!due) return null;
  return `${formatJpMonth(mKey)}分　→　${formatJpDate(due)} お支払い予定`;
}
