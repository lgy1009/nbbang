// 정산 계산 점검 스크립트 (배포에는 쓰이지 않음)
// 실행: npx.cmd tsc lib/*.ts scripts/check-settle.ts --outDir <임시폴더> --module commonjs --target es2020 --skipLibCheck
//       node <임시폴더>/scripts/check-settle.js
import { formatMoney, parseAmount, convert } from "../lib/money";
import { minTransfers, settleTrip, splitEven } from "../lib/settle";
import { buildShareText } from "../lib/share-text";
import type { Expense, Trip } from "../lib/types";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

// 정답 확인용: 모든 경우를 다 해 보는 최소 송금 수 (작은 인원만)
function bruteMin(bal: number[]): number {
  const b = bal.filter((x) => x !== 0);
  function dfs(start: number): number {
    while (start < b.length && b[start] === 0) start++;
    if (start === b.length) return 0;
    let best = Infinity;
    for (let i = start + 1; i < b.length; i++) {
      if (b[i] * b[start] < 0) {
        b[i] += b[start];
        best = Math.min(best, 1 + dfs(start + 1));
        b[i] -= b[start];
      }
    }
    return best;
  }
  return dfs(0);
}

function verifyTransfers(name: string, balances: { id: string; balance: number }[]) {
  const { transfers } = minTransfers(balances);
  const left = new Map(balances.map((b) => [b.id, b.balance]));
  for (const t of transfers) {
    check(`${name} 양수 송금`, t.amount > 0, JSON.stringify(t));
    left.set(t.from, left.get(t.from)! + t.amount);
    left.set(t.to, left.get(t.to)! - t.amount);
  }
  check(`${name} 모두 0으로 끝남`, [...left.values()].every((v) => v === 0));
  if (balances.length <= 9) {
    const best = bruteMin(balances.map((b) => b.balance));
    check(`${name} 최소 송금 수`, transfers.length === best, `got ${transfers.length} want ${best}`);
  }
}

// 1) 정해진 경우
const fixed: number[][] = [
  [0, 0, 0],
  [100, -100],
  [300, -100, -100, -100],
  [50, 50, -50, -50],
  [10, -10, 20, -20, 30, -30],
  [100, -30, -70, 40, -40],
  [5, 3, -2, -6],
  [1, 1, 1, -3],
  [-1, -1, -1, 3],
  [7, -3, -4, 2, -2],
  [1000, -999, -1],
];
fixed.forEach((arr, k) =>
  verifyTransfers(`고정${k + 1}`, arr.map((balance, i) => ({ id: `p${i}`, balance }))),
);

// 2) 무작위 경우 (합이 0인 차액 목록) — 정답과 비교
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let k = 0; k < 300; k++) {
  const n = 2 + Math.floor(rand() * 7); // 2~8명
  const pool = rand() < 0.5 ? [100, 200, 300, 500] : [1, 2, 3, 5, 7, 11, 13];
  const arr: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const v = pool[Math.floor(rand() * pool.length)] * (rand() < 0.5 ? 1 : -1);
    arr.push(rand() < 0.15 ? 0 : v);
  }
  arr.push(-arr.reduce((a, b) => a + b, 0));
  verifyTransfers(`무작위${k + 1}`, arr.map((balance, i) => ({ id: `p${i}`, balance })));
}

// 3) 큰 인원 (근사 계산 경로) — 0으로 끝나는지만 확인
for (let k = 0; k < 5; k++) {
  const arr = Array.from({ length: 19 }, () => Math.floor(rand() * 10000) - 5000);
  arr.push(-arr.reduce((a, b) => a + b, 0));
  verifyTransfers(`20명${k + 1}`, arr.map((balance, i) => ({ id: `p${i}`, balance })));
}

// 4) 나누기 나머지
for (const [amt, n] of [[100, 3], [1, 4], [1000, 7], [999, 1], [5, 5]]) {
  const parts = splitEven(amt, n);
  check(`나누기 ${amt}/${n}`, parts.reduce((a, b) => a + b, 0) === amt && Math.max(...parts) - Math.min(...parts) <= 1);
}

// 5) 금액 읽기
const parseCases: [string, "EUR" | "KRW", number | null][] = [
  ["12.50", "EUR", 1250], ["12,50", "EUR", 1250], ["12", "EUR", 1200], ["1.234,56", "EUR", 123456],
  ["1,234.56", "EUR", 123456], ["0.5", "EUR", 50], ["€ 3,2", "EUR", 320], ["abc", "EUR", null],
  ["-5", "EUR", null], ["0", "EUR", null], ["1.234", "EUR", null], ["15000", "KRW", 15000],
  ["15,000", "KRW", 15000], ["15000원", "KRW", 15000], ["15.5", "KRW", null], ["", "KRW", null],
  ["100000001", "KRW", null], ["100000.01", "EUR", null],
];
for (const [t, c, want] of parseCases) {
  const got = parseAmount(t, c);
  check(`읽기 "${t}" ${c}`, got === want, `got ${got} want ${want}`);
}
check("환산 €10→₩", convert(1000, "EUR", "KRW", 1450) === 14500);
check("환산 ₩14500→€", convert(14500, "KRW", "EUR", 1450) === 1000);
check("환산 환율 없음", convert(1000, "EUR", "KRW", null) === null);
check("표시 €", formatMoney(123456, "EUR") === "€1,234.56");
check("표시 ₩", formatMoney(-15000, "KRW") === "-₩15,000");

// 6) 실제 여행 같은 예시 (유로·원화 섞임, 일부만 나눔)
const M = ["가영", "민지", "수아", "하린"].map((name, i) => ({ id: `m${i}`, name }));
const all = M.map((m) => m.id);
let t0 = 1;
const ex = (title: string, amount: number, currency: "EUR" | "KRW", payer: number, split = all): Expense => ({
  id: `e${t0}`, title, amount, currency, payerId: `m${payer}`, splitIds: split, createdAt: t0++,
});
const trip: Trip = {
  id: "t1", name: "그라나다 주말여행", members: M, settleCurrency: "EUR", krwPerEur: 1450,
  createdAt: 0, updatedAt: 0,
  expenses: [
    ex("버스표", 6000, "EUR", 0),
    ex("숙소", 18000, "EUR", 1),
    ex("타파스 저녁", 4820, "EUR", 2),
    ex("알람브라 입장권", 7600, "EUR", 0),
    ex("상그리아", 1800, "EUR", 3, ["m1", "m3"]),
    ex("한식당", 87000, "KRW", 2),
    ex("택시", 2350, "EUR", 1, ["m0", "m1", "m2"]),
    ex("아이스크림", 1000, "EUR", 3),
    ex("기념품", 1500, "EUR", 0, ["m0"]),
    ex("커피", 1080, "EUR", 2),
  ],
};
const r = settleTrip(trip);
check("예시 계산 됨", r.ok);
if (r.ok) {
  check("예시 합 0", r.people.reduce((a, p) => a + p.balance, 0) === 0);
  check("예시 낸 돈=총액", r.people.reduce((a, p) => a + p.paid, 0) === r.total);
  check("예시 최소", r.transfers.length === bruteMin(r.people.map((p) => p.balance)));
  console.log("\n--- 카톡용 글 예시 ---\n" + buildShareText(trip, r) + "\n---");
}
const noRate = settleTrip({ ...trip, krwPerEur: null });
check("환율 없으면 안내", !noRate.ok && noRate.reason === "needRate");
const krwTrip = settleTrip({ ...trip, settleCurrency: "KRW" });
check("원화 정산 합 0", krwTrip.ok && krwTrip.people.reduce((a, p) => a + p.balance, 0) === 0);

console.log(`\n점검 결과: 통과 ${pass} / 실패 ${fail}`);
if (fail) process.exit(1);
