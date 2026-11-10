// N빵 계산기에서 쓰는 데이터 형태

export type Currency = "EUR" | "KRW";

export interface Member {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  title: string;
  /** 정수 금액: EUR은 센트, KRW는 원 */
  amount: number;
  currency: Currency;
  payerId: string;
  /** 나눌 사람 id 목록 (최소 1명) */
  splitIds: string[];
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  /** 결과를 어느 통화로 보여 줄지 */
  settleCurrency: Currency;
  /** 1 EUR = ? KRW (직접 입력, 없으면 null) */
  krwPerEur: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Transfer {
  from: string;
  to: string;
  /** 정산 통화의 정수 금액 */
  amount: number;
}

// 입력 제한 (브라우저에서 다시 검사한다)
export const LIMITS = {
  tripName: 30,
  memberName: 12,
  expenseTitle: 40,
  maxMembers: 20,
  maxExpenses: 300,
  maxTrips: 100,
  /** 한 건 최대 금액 (정수 단위가 아니라 화면 단위: 1억 원 / 10만 유로) */
  maxKrw: 100_000_000,
  maxEur: 100_000,
  minRate: 100,
  maxRate: 10_000,
} as const;
