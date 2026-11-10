"use client";

import { useState } from "react";
import { newId } from "@/lib/storage";
import { LIMITS, type Trip } from "@/lib/types";

export default function MembersTab({
  trip,
  onChange,
}: {
  trip: Trip;
  onChange: (fn: (t: Trip) => Trip) => void;
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const used = (id: string) =>
    trip.expenses.some((e) => e.payerId === id || e.splitIds.includes(id));

  function nameError(n: string, exceptId?: string): string {
    if (!n) return "이름을 적어 주세요.";
    if (trip.members.some((m) => m.name === n && m.id !== exceptId)) return `"${n}"은(는) 이미 있어요.`;
    return "";
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = text.trim().slice(0, LIMITS.memberName);
    const err = nameError(n) || (trip.members.length >= LIMITS.maxMembers ? `최대 ${LIMITS.maxMembers}명까지예요.` : "");
    if (err) return setMsg(err);
    // 새 사람은 앞으로 추가하는 지출의 기본 나눔(전원)에 들어간다. 이미 적은 지출은 그대로 둔다.
    onChange((t) => ({ ...t, members: [...t.members, { id: newId(), name: n }] }));
    setText("");
    setMsg("");
  }

  function rename(id: string) {
    const n = editText.trim().slice(0, LIMITS.memberName);
    const err = nameError(n, id);
    if (err) return setMsg(err);
    onChange((t) => ({ ...t, members: t.members.map((m) => (m.id === id ? { ...m, name: n } : m)) }));
    setEditId(null);
    setMsg("");
  }

  function remove(id: string, name: string) {
    if (used(id)) {
      setMsg(`${name}님이 들어간 지출이 있어서 뺄 수 없어요. 지출에서 먼저 빼 주세요.`);
      return;
    }
    if (trip.members.length <= 1) return setMsg("최소 1명은 있어야 해요.");
    onChange((t) => ({ ...t, members: t.members.filter((m) => m.id !== id) }));
    setMsg("");
  }

  return (
    <div className="card space-y-4">
      <ul className="divide-y-2 divide-dashed divide-ink/20">
        {trip.members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-2">
            {editId === m.id ? (
              <>
                <input
                  className="field"
                  value={editText}
                  maxLength={LIMITS.memberName}
                  aria-label="이름 고치기"
                  autoFocus
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) rename(m.id);
                  }}
                />
                <button type="button" className="btn shrink-0 bg-coral px-3" onClick={() => rename(m.id)}>
                  저장
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate text-lg">{m.name}</span>
                <button
                  type="button"
                  className="btn px-3 text-base"
                  onClick={() => {
                    setEditId(m.id);
                    setEditText(m.name);
                    setMsg("");
                  }}
                >
                  고치기
                </button>
                <button
                  type="button"
                  className="btn px-3 text-base"
                  aria-label={`${m.name} 빼기`}
                  onClick={() => remove(m.id, m.name)}
                >
                  빼기
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex gap-2">
        <input
          className="field"
          value={text}
          maxLength={LIMITS.memberName}
          placeholder="이름 추가"
          aria-label="추가할 사람 이름"
          onChange={(e) => {
            setText(e.target.value);
            setMsg("");
          }}
        />
        <button type="submit" className="btn shrink-0">
          추가
        </button>
      </form>
      {msg && (
        <p role="alert" className="text-sm text-coral-dark">
          {msg}
        </p>
      )}
    </div>
  );
}
