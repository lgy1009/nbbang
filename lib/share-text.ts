// 카카오톡에 붙여 넣기 좋은 정산 글 만들기
import { convert, formatMoney, otherCurrency } from "./money";
import type { SettleResult } from "./settle";
import type { Trip } from "./types";

export function buildShareText(trip: Trip, result: SettleResult): string {
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? "?";
  const cur = result.currency;
  const other = otherCurrency(cur);
  const approx = (amount: number) => {
    const v = convert(amount, cur, other, trip.krwPerEur);
    return v === null ? "" : ` (약 ${formatMoney(v, other)})`;
  };

  const lines: string[] = [];
  lines.push(`🧾 [${trip.name}] N빵 정산`);
  lines.push(`총 ${formatMoney(result.total, cur)} · ${trip.members.length}명 · 지출 ${trip.expenses.length}건`);
  lines.push("");

  if (result.transfers.length === 0) {
    lines.push("✨ 보낼 돈이 없어요. 이미 딱 맞아요!");
  } else {
    lines.push(`💸 이렇게 보내면 끝! (${result.transfers.length}번)`);
    for (const t of result.transfers) {
      lines.push(`• ${name(t.from)} → ${name(t.to)}  ${formatMoney(t.amount, cur)}${approx(t.amount)}`);
    }
  }

  lines.push("");
  lines.push("👛 각자 쓴 돈");
  for (const p of result.people) {
    lines.push(`• ${name(p.id)}: ${formatMoney(p.share, cur)} (낸 돈 ${formatMoney(p.paid, cur)})`);
  }

  if (trip.expenses.length > 0) {
    lines.push("");
    lines.push("📋 지출 내역");
    trip.expenses.forEach((e, i) => {
      const who =
        e.splitIds.length === trip.members.length ? "전원" : e.splitIds.map(name).join("·");
      lines.push(`${i + 1}. ${e.title} ${formatMoney(e.amount, e.currency)} — ${name(e.payerId)} 냄 / ${who}`);
    });
  }

  const mixed = trip.expenses.some((e) => e.currency !== cur);
  if (trip.krwPerEur && (mixed || result.transfers.length > 0)) {
    lines.push("");
    lines.push(`💱 환율 1 EUR = ${trip.krwPerEur.toLocaleString("ko-KR")} KRW`);
  }
  if (result.approximate) {
    lines.push("※ 인원이 많아 송금 횟수는 근사 계산이에요.");
  }
  return lines.join("\n");
}
