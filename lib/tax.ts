// 消費税（インボイス）関連の計算

export const TAX_RATE = 0.1;

// 消費税込みの金額（10%・切り捨て）
export function withTax(n: number): number {
  return n + Math.floor(n * TAX_RATE);
}
