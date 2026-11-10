"use client";

import { useState } from "react";
import { LIMITS, type Trip } from "@/lib/types";
import ExpensesTab from "./ExpensesTab";
import MembersTab from "./MembersTab";
import SettleTab from "./SettleTab";
import { tapeStyle } from "./ui";

type Tab = "expenses" | "members" | "settle";

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: "expenses", label: "🧾 지출", color: "var(--color-butter)" },
  { id: "members", label: "👥 사람", color: "var(--color-sky)" },
  { id: "settle", label: "💸 정산", color: "var(--color-mint)" },
];

export default function TripView({
  trip,
  onChange,
  onBack,
  onDelete,
}: {
  trip: Trip;
  onChange: (fn: (t: Trip) => Trip) => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<Tab>(trip.expenses.length > 0 ? "settle" : "expenses");
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState(trip.name);

  function saveName() {
    const n = nameText.trim();
    if (n) onChange((t) => ({ ...t, name: n.slice(0, LIMITS.tripName) }));
    else setNameText(trip.name);
    setEditingName(false);
  }

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn bg-white px-3 text-lg" onClick={onBack}>
          ← 목록
        </button>
        <span className="text-xs text-ink-soft">
          {trip.members.length}명 · 지출 {trip.expenses.length}건
        </span>
      </div>

      {editingName ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
        >
          <input
            className="field font-hand text-2xl"
            value={nameText}
            maxLength={LIMITS.tripName}
            aria-label="여행 이름"
            autoFocus
            onChange={(e) => setNameText(e.target.value)}
          />
          <button type="submit" className="btn shrink-0 bg-mint">
            저장
          </button>
        </form>
      ) : (
        <h1>
          <button
            type="button"
            className="tape max-w-full cursor-pointer truncate text-left text-3xl"
            style={tapeStyle("var(--color-coral)")}
            title="눌러서 이름 바꾸기"
            onClick={() => setEditingName(true)}
          >
            {trip.name} ✎
          </button>
        </h1>
      )}

      <div role="tablist" aria-label="여행 메뉴" className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`btn px-1 text-lg ${tab === t.id ? "" : "bg-white opacity-70 shadow-none"}`}
            style={tab === t.id ? { background: t.color } : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={current.label}>
        {tab === "expenses" && (
          <ExpensesTab trip={trip} onChange={onChange} onGoMembers={() => setTab("members")} />
        )}
        {tab === "members" && <MembersTab trip={trip} onChange={onChange} />}
        {tab === "settle" && <SettleTab trip={trip} onChange={onChange} onDelete={onDelete} />}
      </section>
    </div>
  );
}
