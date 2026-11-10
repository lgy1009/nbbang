"use client";

import { useState } from "react";
import { convert, formatMoney, otherCurrency, parseRate } from "@/lib/money";
import { settleTrip } from "@/lib/settle";
import { buildShareText } from "@/lib/share-text";
import { LIMITS, type Currency, type Trip } from "@/lib/types";
import { tapeStyle } from "./ui";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 오래된 브라우저·권한 문제일 때 예전 방식으로 한 번 더
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function SettleTab({
  trip,
  onChange,
  onDelete,
}: {
  trip: Trip;
  onChange: (fn: (t: Trip) => Trip) => void;
  onDelete: () => void;
}) {
  const [rateText, setRateText] = useState(trip.krwPerEur ? String(trip.krwPerEur) : "");
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const [showText, setShowText] = useState(false);
  // 입력 중(예: "14")에는 경고하지 않고, 칸을 벗어난 뒤에만 경고한다
  const [rateTouched, setRateTouched] = useState(false);

  const result = settleTrip(trip);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? "?";
  const mixed = trip.expenses.some((e) => e.currency !== trip.settleCurrency);
  const rateInvalid = rateTouched && rateText.trim() !== "" && parseRate(rateText) === null;

  function setRate(text: string) {
    setRateText(text);
    setCopied("");
    const r = text.trim() === "" ? null : parseRate(text);
    if (text.trim() === "" || r !== null) onChange((t) => ({ ...t, krwPerEur: r }));
  }

  function setCurrency(c: Currency) {
    setCopied("");
    onChange((t) => ({ ...t, settleCurrency: c }));
  }

  const text = result.ok ? buildShareText(trip, result) : "";

  async function copy() {
    setCopied((await copyText(text)) ? "ok" : "fail");
    if (!showText) setShowText(true);
  }

  const approx = (amount: number, cur: Currency) => {
    const v = convert(amount, cur, otherCurrency(cur), trip.krwPerEur);
    return v === null ? null : formatMoney(v, otherCurrency(cur));
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold">정산 통화</span>
          <div className="flex overflow-hidden rounded-xl border-2 border-ink" role="group" aria-label="정산 통화">
            {(["EUR", "KRW"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={trip.settleCurrency === c}
                className={`min-h-10 cursor-pointer px-3 font-hand text-lg font-bold ${trip.settleCurrency === c ? "bg-ink text-paper" : "bg-white"}`}
                onClick={() => setCurrency(c)}
              >
                {c === "EUR" ? "€ 유로" : "₩ 원"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-bold">환율 1 EUR =</span>
          <input
            className={`field money text-right ${rateInvalid ? "border-coral-dark" : ""}`}
            value={rateText}
            inputMode="decimal"
            maxLength={9}
            placeholder={mixed ? "꼭 넣어 주세요" : "선택"}
            aria-invalid={rateInvalid}
            onChange={(e) => {
              setRateTouched(false);
              setRate(e.target.value);
            }}
            onBlur={() => setRateTouched(true)}
          />
          <span className="shrink-0 text-sm font-bold">KRW</span>
        </label>
        {rateInvalid && (
          <p className="text-xs text-coral-dark">
            {LIMITS.minRate}~{LIMITS.maxRate.toLocaleString("ko-KR")} 사이 숫자로 적어 주세요. (예: 1450)
          </p>
        )}
        <p className="text-xs text-ink-soft">
          유로와 원화를 섞어 썼다면 환율을 넣어 주세요. 환전한 날 환율이나 카드 명세서 환율을 쓰면 좋아요.
        </p>
      </div>

      {!result.ok ? (
        <div className="card bg-butter/40 text-center">
          <p className="font-hand text-2xl font-bold">💱 환율이 필요해요</p>
          <p className="mt-1 text-sm">
            {otherCurrency(trip.settleCurrency) === "KRW" ? "원화" : "유로"}로 쓴 지출이 있어서, 위에 환율을 넣어야 계산할 수 있어요.
          </p>
        </div>
      ) : trip.expenses.length === 0 ? (
        <div className="card text-center">
          <p className="font-hand text-2xl">아직 지출이 없어요 ✏️</p>
          <p className="mt-1 text-sm text-ink-soft">🧾 지출 탭에서 쓴 돈을 적어 주세요.</p>
        </div>
      ) : (
        <>
          <div className="card space-y-3 bg-mint/30">
            <div className="flex items-baseline justify-between">
              <span className="tape" style={tapeStyle("var(--color-mint)")}>
                이렇게 보내면 끝!
              </span>
              <span className="text-sm text-ink-soft">송금 {result.transfers.length}번</span>
            </div>
            {result.transfers.length === 0 ? (
              <p className="py-2 text-center font-hand text-2xl">✨ 보낼 돈이 없어요. 이미 딱 맞아요!</p>
            ) : (
              <ol className="space-y-2">
                {result.transfers.map((t, i) => {
                  const a = approx(t.amount, result.currency);
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-xl border-2 border-dashed border-ink/40 bg-white px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 text-lg">
                        <b className="break-all">{name(t.from)}</b>
                        <span className="mx-1 text-coral-dark">→</span>
                        <b className="break-all">{name(t.to)}</b>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="money block font-hand text-2xl font-bold">
                          {formatMoney(t.amount, result.currency)}
                        </span>
                        {a && <span className="money block text-xs text-ink-soft">약 {a}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {result.approximate && (
              <p className="text-xs text-ink-soft">※ 인원이 많아 송금 횟수는 근사 계산이에요.</p>
            )}
          </div>

          <button type="button" className="btn w-full bg-butter text-2xl" onClick={copy}>
            {copied === "ok" ? "✅ 복사했어요! 카톡에 붙여 넣기" : "💬 카톡으로 복사"}
          </button>
          {copied === "fail" && (
            <p role="alert" className="text-center text-sm text-coral-dark">
              자동 복사가 안 됐어요. 아래 글을 길게 눌러 직접 복사해 주세요.
            </p>
          )}
          <button
            type="button"
            className="w-full cursor-pointer text-sm text-ink-soft underline"
            onClick={() => setShowText((v) => !v)}
            aria-expanded={showText}
          >
            {showText ? "복사할 글 접기" : "복사할 글 미리 보기"}
          </button>
          {showText && (
            <textarea
              readOnly
              value={text}
              aria-label="카톡에 붙여 넣을 글"
              className="field h-72 bg-white py-2 font-body text-sm leading-relaxed"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}

          <div className="card">
            <span className="tape text-xl" style={tapeStyle("var(--color-sky)")}>
              사람별 요약
            </span>
            <p className="mt-2 text-right text-sm text-ink-soft">
              총 지출 <b className="money text-ink">{formatMoney(result.total, result.currency)}</b>
            </p>
            <table className="mt-2 w-full table-fixed text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-xs text-ink-soft">
                  <th className="w-[28%] py-1 text-left font-normal">이름</th>
                  <th className="py-1 text-right font-normal">낸 돈</th>
                  <th className="py-1 text-right font-normal">쓴 돈</th>
                  <th className="py-1 text-right font-normal">차액</th>
                </tr>
              </thead>
              <tbody className="money">
                {result.people.map((p) => (
                  <tr key={p.id} className="border-b border-dashed border-ink/20">
                    <td className="truncate py-1.5">{name(p.id)}</td>
                    <td className="py-1.5 text-right">{formatMoney(p.paid, result.currency)}</td>
                    <td className="py-1.5 text-right">{formatMoney(p.share, result.currency)}</td>
                    <td
                      className={`py-1.5 text-right font-bold ${p.balance > 0 ? "text-mint-dark" : p.balance < 0 ? "text-coral-dark" : ""}`}
                    >
                      {p.balance > 0 ? "+" : ""}
                      {formatMoney(p.balance, result.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-ink-soft">차액이 +면 받을 돈, −면 보낼 돈이에요. 1센트·1원 나머지는 이름 순서대로 나눠요.</p>
          </div>
        </>
      )}

      <button
        type="button"
        className="w-full cursor-pointer pt-4 text-sm text-coral-dark underline"
        onClick={() => {
          if (window.confirm(`"${trip.name}" 여행을 통째로 지울까요? 되돌릴 수 없어요.`)) onDelete();
        }}
      >
        🗑 이 여행 지우기
      </button>
    </div>
  );
}
