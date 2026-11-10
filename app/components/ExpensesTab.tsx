"use client";

import { useState } from "react";
import { amountToInput, formatMoney, parseAmount } from "@/lib/money";
import { newId } from "@/lib/storage";
import { LIMITS, type Currency, type Expense, type Trip } from "@/lib/types";

export default function ExpensesTab({
  trip,
  onChange,
  onGoMembers,
}: {
  trip: Trip;
  onChange: (fn: (t: Trip) => Trip) => void;
  onGoMembers: () => void;
}) {
  // null: 폼 닫힘, "new": 새 지출, 그 밖: 고칠 지출 id
  const [editing, setEditing] = useState<string | null>(trip.expenses.length === 0 ? "new" : null);
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? "?";
  const full = trip.expenses.length >= LIMITS.maxExpenses;

  function save(exp: Expense) {
    onChange((t) => {
      const exists = t.expenses.some((e) => e.id === exp.id);
      return {
        ...t,
        expenses: exists ? t.expenses.map((e) => (e.id === exp.id ? exp : e)) : [...t.expenses, exp],
      };
    });
    setEditing(null);
  }

  function remove(id: string, title: string) {
    if (!window.confirm(`"${title}" 지출을 지울까요?`)) return;
    onChange((t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== id) }));
    setEditing(null);
  }

  const lastCurrency: Currency = trip.expenses.at(-1)?.currency ?? trip.settleCurrency;

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <ExpenseForm
          trip={trip}
          defaultCurrency={lastCurrency}
          onSave={save}
          onCancel={trip.expenses.length > 0 ? () => setEditing(null) : undefined}
        />
      ) : (
        <button
          type="button"
          className="btn w-full bg-coral text-xl"
          disabled={full}
          onClick={() => setEditing("new")}
        >
          ＋ 지출 추가
        </button>
      )}

      {trip.expenses.length > 0 && (
        <ul className="space-y-3">
          {[...trip.expenses].reverse().map((e) =>
            editing === e.id ? (
              <li key={e.id}>
                <ExpenseForm
                  trip={trip}
                  initial={e}
                  defaultCurrency={e.currency}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                  onDelete={() => remove(e.id, e.title)}
                />
              </li>
            ) : (
              <li key={e.id}>
                <button
                  type="button"
                  className="card flex w-full items-start gap-3 py-3 text-left"
                  onClick={() => setEditing(e.id)}
                  aria-label={`${e.title} 고치기`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{e.title}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {name(e.payerId)} 냄 ·{" "}
                      {e.splitIds.length === trip.members.length
                        ? "전원"
                        : e.splitIds.map(name).join(", ")}
                    </span>
                  </span>
                  <span className="money shrink-0 font-hand text-2xl font-bold">
                    {formatMoney(e.amount, e.currency)}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <p className="text-center text-xs text-ink-soft">
        사람을 더하거나 이름을 바꾸려면{" "}
        <button type="button" className="cursor-pointer underline" onClick={onGoMembers}>
          사람
        </button>{" "}
        탭으로 가요.
      </p>
    </div>
  );
}

function ExpenseForm({
  trip,
  initial,
  defaultCurrency,
  onSave,
  onCancel,
  onDelete,
}: {
  trip: Trip;
  initial?: Expense;
  defaultCurrency: Currency;
  onSave: (e: Expense) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const allIds = trip.members.map((m) => m.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? defaultCurrency);
  const [amountText, setAmountText] = useState(initial ? amountToInput(initial.amount, initial.currency) : "");
  const [payerId, setPayerId] = useState(initial?.payerId ?? allIds[0] ?? "");
  const [splitIds, setSplitIds] = useState<string[]>(
    initial ? initial.splitIds.filter((id) => allIds.includes(id)) : allIds,
  );
  const [error, setError] = useState("");

  const everyone = splitIds.length === allIds.length;

  function toggle(id: string) {
    setSplitIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : allIds.filter((x) => x === id || s.includes(x))));
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim().slice(0, LIMITS.expenseTitle);
    const amount = parseAmount(amountText, currency);
    if (!t) return setError("무엇에 썼는지 적어 주세요.");
    if (amount === null) {
      return setError(
        currency === "EUR"
          ? `금액을 확인해 주세요. (예: 12.50, 최대 €${LIMITS.maxEur.toLocaleString("en-US")})`
          : `금액을 확인해 주세요. (예: 15000, 최대 ₩${LIMITS.maxKrw.toLocaleString("ko-KR")})`,
      );
    }
    if (!allIds.includes(payerId)) return setError("낸 사람을 골라 주세요.");
    if (splitIds.length === 0) return setError("나눌 사람을 1명 이상 골라 주세요.");
    onSave({
      id: initial?.id ?? newId(),
      title: t,
      amount,
      currency,
      payerId,
      splitIds,
      createdAt: initial?.createdAt ?? Date.now(),
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4" aria-label={initial ? "지출 고치기" : "지출 추가"}>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">무엇에 썼나요?</span>
        <input
          className="field bg-white"
          value={title}
          maxLength={LIMITS.expenseTitle}
          placeholder="예: 타파스 저녁"
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-bold">얼마?</span>
        <div className="flex gap-2">
          <div className="flex shrink-0 overflow-hidden rounded-xl border-2 border-ink" role="group" aria-label="통화">
            {(["EUR", "KRW"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={currency === c}
                className={`min-h-11 cursor-pointer px-3 font-hand text-xl font-bold ${currency === c ? "bg-ink text-paper" : "bg-white"}`}
                onClick={() => {
                  setCurrency(c);
                  setError("");
                }}
              >
                {c === "EUR" ? "€" : "₩"}
              </button>
            ))}
          </div>
          <input
            className="field money bg-white text-right text-lg"
            value={amountText}
            inputMode={currency === "EUR" ? "decimal" : "numeric"}
            maxLength={16}
            placeholder={currency === "EUR" ? "0.00" : "0"}
            aria-label={`금액 (${currency})`}
            onChange={(e) => {
              setAmountText(e.target.value);
              setError("");
            }}
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-bold">누가 냈나요?</legend>
        <div className="flex flex-wrap gap-2">
          {trip.members.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={payerId === m.id}
              className={`chip ${payerId === m.id ? "border-ink bg-coral" : ""}`}
              onClick={() => setPayerId(m.id)}
            >
              {payerId === m.id ? "✓ " : ""}
              {m.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 flex w-full items-center justify-between text-sm font-bold">
          <span>누구랑 나눌까요? ({splitIds.length}명)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={everyone}
            className={`chip ${everyone ? "border-ink bg-soft" : ""}`}
            onClick={() => setSplitIds(everyone ? [] : allIds)}
          >
            전원
          </button>
          {trip.members.map((m) => {
            const on = splitIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                className={`chip ${on ? "border-ink bg-soft" : "text-ink-soft line-through"}`}
                onClick={() => toggle(m.id)}
              >
                {on ? "✓ " : ""}
                {m.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-coral-dark">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn flex-1 bg-coral">
          {initial ? "고친 내용 저장" : "지출 저장"}
        </button>
        {onCancel && (
          <button type="button" className="btn bg-white" onClick={onCancel}>
            취소
          </button>
        )}
      </div>
      {onDelete && (
        <button type="button" className="w-full cursor-pointer text-sm text-coral-dark underline" onClick={onDelete}>
          이 지출 지우기
        </button>
      )}
    </form>
  );
}
