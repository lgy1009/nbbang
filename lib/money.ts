// 금액 변환·표시. 금액은 항상 정수(EUR=센트, KRW=원)로 다룬다.
import { LIMITS, type Currency } from "./types";

/** 화면에 적은 글자("12,50", "1.234,5", "15000")를 정수 금액으로. 잘못되면 null */
export function parseAmount(text: string, currency: Currency): number | null {
  let s = text.trim().replace(/\s/g, "").replace(/[€₩원]/g, "");
  if (!s) return null;
  if (currency === "KRW") {
    s = s.replace(/,/g, "");
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isSafeInteger(n) || n <= 0 || n > LIMITS.maxKrw) return null;
    return n;
  }
  // EUR: 쉼표를 소수점으로 쓰는 경우도 받아 준다 (스페인식 12,50)
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // 둘 다 있으면 뒤에 오는 것이 소수점
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > LIMITS.maxEur * 100) return null;
  return cents;
}

/** 정수 금액을 입력칸에 다시 넣을 글자로 */
export function amountToInput(amount: number, currency: Currency): string {
  if (currency === "KRW") return String(amount);
  const whole = Math.floor(amount / 100);
  const cents = amount % 100;
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, "0")}`;
}

/** 표시용: €12.50 / ₩15,000 */
export function formatMoney(amount: number, currency: Currency): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (currency === "KRW") return `${sign}₩${abs.toLocaleString("ko-KR")}`;
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}€${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** 환율 입력값 검사: 1 EUR = ? KRW */
export function parseRate(text: string): number | null {
  const s = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (n < LIMITS.minRate || n > LIMITS.maxRate) return null;
  return n;
}

/** 통화 바꾸기 (정수 → 정수, 반올림). 환율이 필요한데 없으면 null */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  krwPerEur: number | null,
): number | null {
  if (from === to) return amount;
  if (!krwPerEur) return null;
  if (from === "EUR") return Math.round((amount * krwPerEur) / 100); // 센트 → 원
  return Math.round((amount / krwPerEur) * 100); // 원 → 센트
}

export function otherCurrency(c: Currency): Currency {
  return c === "EUR" ? "KRW" : "EUR";
}
