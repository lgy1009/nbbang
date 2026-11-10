// 정산 계산: 사람별 차액 → 송금 횟수가 가장 적은 송금 목록
import { convert } from "./money";
import type { Currency, Expense, Transfer, Trip } from "./types";

export interface PersonSummary {
  id: string;
  /** 낸 돈 */
  paid: number;
  /** 내 몫으로 쓴 돈 */
  share: number;
  /** 낸 돈 − 쓴 돈 (양수면 받을 돈) */
  balance: number;
}

export interface SettleResult {
  ok: true;
  currency: Currency;
  total: number;
  people: PersonSummary[];
  transfers: Transfer[];
  /** true면 사람이 너무 많아 근사 계산을 썼다 */
  approximate: boolean;
}

export interface SettleError {
  ok: false;
  reason: "needRate";
}

/** 정확히 계산할 최대 인원 (차액이 0이 아닌 사람 수) */
const EXACT_LIMIT = 16;

/** amount를 n명에게 나눈 몫 목록. 나머지는 앞사람부터 1씩 더한다 → 합이 정확히 amount */
export function splitEven(amount: number, n: number): number[] {
  const base = Math.floor(amount / n);
  const rest = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export function settleTrip(trip: Trip): SettleResult | SettleError {
  const cur = trip.settleCurrency;
  const memberIds = new Set(trip.members.map((m) => m.id));
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const m of trip.members) {
    paid.set(m.id, 0);
    share.set(m.id, 0);
  }

  let total = 0;
  for (const e of trip.expenses) {
    const valid = validExpense(e, memberIds);
    if (!valid) continue;
    const amount = convert(e.amount, e.currency, cur, trip.krwPerEur);
    if (amount === null) return { ok: false, reason: "needRate" };
    total += amount;
    paid.set(e.payerId, paid.get(e.payerId)! + amount);
    const parts = splitEven(amount, valid.length);
    valid.forEach((id, i) => share.set(id, share.get(id)! + parts[i]));
  }

  const people: PersonSummary[] = trip.members.map((m) => ({
    id: m.id,
    paid: paid.get(m.id)!,
    share: share.get(m.id)!,
    balance: paid.get(m.id)! - share.get(m.id)!,
  }));

  const { transfers, approximate } = minTransfers(
    people.map((p) => ({ id: p.id, balance: p.balance })),
  );
  return { ok: true, currency: cur, total, people, transfers, approximate };
}

/** 지출이 계산에 쓸 수 있는지 확인하고, 쓸 수 있으면 나눌 사람 목록(중복·없는 사람 제거)을 돌려준다 */
function validExpense(e: Expense, memberIds: Set<string>): string[] | null {
  if (!memberIds.has(e.payerId)) return null;
  if (!Number.isSafeInteger(e.amount) || e.amount <= 0) return null;
  const ids = [...new Set(e.splitIds)].filter((id) => memberIds.has(id));
  return ids.length > 0 ? ids : null;
}

/**
 * 차액 목록 → 송금 목록.
 * 최소 송금 수 = (차액이 있는 사람 수) − (합이 0인 묶음의 최대 개수).
 * 비트마스크 DP로 가장 많은 묶음을 찾고, 묶음마다 큰 금액끼리 맞춰 보낸다.
 */
export function minTransfers(balances: { id: string; balance: number }[]): {
  transfers: Transfer[];
  approximate: boolean;
} {
  const list = balances.filter((b) => b.balance !== 0);
  if (list.length === 0) return { transfers: [], approximate: false };

  if (list.length > EXACT_LIMIT) {
    return { transfers: greedy(list), approximate: true };
  }

  const n = list.length;
  const full = (1 << n) - 1;
  const sum = new Array<number>(1 << n).fill(0);
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask;
    const i = 31 - Math.clz32(low);
    sum[mask] = sum[mask ^ low] + list[i].balance;
  }
  // dp[mask] = mask를 앞에서부터 하나씩 채워 갈 때 지나는 "합이 0인 상태"의 최대 개수
  const dp = new Int8Array(1 << n);
  for (let mask = 1; mask <= full; mask++) {
    let best = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        const v = dp[mask ^ (1 << i)];
        if (v > best) best = v;
      }
    }
    dp[mask] = best + (sum[mask] === 0 ? 1 : 0);
  }

  // 되짚어 가며 묶음 나누기: 지나간 "합이 0인 상태" 사이의 사람들이 한 묶음
  const groups: number[][] = [];
  let mask = full;
  let current: number[] = [];
  while (mask) {
    const need = dp[mask] - (sum[mask] === 0 ? 1 : 0);
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i) && dp[mask ^ (1 << i)] === need) {
        pick = i;
        break;
      }
    }
    if (sum[mask] === 0 && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(pick);
    mask ^= 1 << pick;
  }
  if (current.length) groups.push(current);

  const transfers = groups.flatMap((g) => greedy(g.map((i) => list[i])));
  return { transfers, approximate: false };
}

/** 가장 많이 보낼 사람 → 가장 많이 받을 사람 순서로 맞춰 보낸다 (묶음 크기 − 1번 이하) */
function greedy(list: { id: string; balance: number }[]): Transfer[] {
  const debtors = list.filter((b) => b.balance < 0).map((b) => ({ id: b.id, left: -b.balance }));
  const creditors = list.filter((b) => b.balance > 0).map((b) => ({ id: b.id, left: b.balance }));
  const out: Transfer[] = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.left - a.left);
    creditors.sort((a, b) => b.left - a.left);
    const d = debtors[0];
    const c = creditors[0];
    const amount = Math.min(d.left, c.left);
    out.push({ from: d.id, to: c.id, amount });
    d.left -= amount;
    c.left -= amount;
    if (d.left === 0) debtors.shift();
    if (c.left === 0) creditors.shift();
  }
  return out;
}
