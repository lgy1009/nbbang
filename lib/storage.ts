// 이 기기 브라우저(localStorage)에만 저장한다. 서버로 보내지 않는다.
import { LIMITS, type Currency, type Expense, type Member, type Trip } from "./types";

const KEY = "nbbang:v1";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || !Array.isArray(data.trips)) return [];
    return data.trips.map(toTrip).filter((t): t is Trip => t !== null).slice(0, LIMITS.maxTrips);
  } catch {
    return [];
  }
}

/** 저장에 성공하면 true (저장 공간이 꽉 찼거나 막혀 있으면 false) */
export function saveTrips(trips: Trip[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, trips }));
    return true;
  } catch {
    return false;
  }
}

// ---- 저장값 형식 검사: 이상한 값은 버린다 ----

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= 200 ? v.slice(0, max) : null;
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Date.now();
}
function cur(v: unknown): Currency | null {
  return v === "EUR" || v === "KRW" ? v : null;
}

function toMember(v: unknown): Member | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name, LIMITS.memberName);
  return id && name ? { id, name } : null;
}

function toExpense(v: unknown): Expense | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const title = str(v.title, LIMITS.expenseTitle);
  const currency = cur(v.currency);
  const payerId = str(v.payerId, 64);
  const amount = v.amount;
  if (!id || !title || !currency || !payerId) return null;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) return null;
  const max = currency === "KRW" ? LIMITS.maxKrw : LIMITS.maxEur * 100;
  if (amount > max) return null;
  const splitIds = Array.isArray(v.splitIds)
    ? v.splitIds.filter((s): s is string => typeof s === "string").slice(0, LIMITS.maxMembers)
    : [];
  if (splitIds.length === 0) return null;
  return { id, title, amount, currency, payerId, splitIds, createdAt: num(v.createdAt) };
}

function toTrip(v: unknown): Trip | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name, LIMITS.tripName);
  if (!id || !name) return null;
  const members = Array.isArray(v.members)
    ? v.members.map(toMember).filter((m): m is Member => m !== null).slice(0, LIMITS.maxMembers)
    : [];
  const ids = new Set(members.map((m) => m.id));
  const expenses = Array.isArray(v.expenses)
    ? v.expenses
        .map(toExpense)
        .filter((e): e is Expense => e !== null && ids.has(e.payerId))
        .map((e) => ({ ...e, splitIds: e.splitIds.filter((s) => ids.has(s)) }))
        .filter((e) => e.splitIds.length > 0)
        .slice(0, LIMITS.maxExpenses)
    : [];
  const rate =
    typeof v.krwPerEur === "number" &&
    v.krwPerEur >= LIMITS.minRate &&
    v.krwPerEur <= LIMITS.maxRate
      ? v.krwPerEur
      : null;
  return {
    id,
    name,
    members,
    expenses,
    settleCurrency: cur(v.settleCurrency) ?? "EUR",
    krwPerEur: rate,
    createdAt: num(v.createdAt),
    updatedAt: num(v.updatedAt),
  };
}
