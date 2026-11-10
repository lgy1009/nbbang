"use client";

import { useState } from "react";
import { LIMITS } from "@/lib/types";

/** "가영, 민지" 같은 글자를 이름 목록에 더한다 (중복·인원 초과는 빼고 안내) */
export function mergeNames(names: string[], text: string): { names: string[]; msg: string } {
  const next = [...names];
  let msg = "";
  for (const p of text.split(/[,，\n]/)) {
    const n = p.trim().slice(0, LIMITS.memberName);
    if (!n) continue;
    if (next.includes(n)) {
      msg = `"${n}"은(는) 이미 있어요.`;
      continue;
    }
    if (next.length >= LIMITS.maxMembers) {
      msg = `최대 ${LIMITS.maxMembers}명까지예요.`;
      break;
    }
    next.push(n);
  }
  return { names: next, msg };
}

/** 이름을 하나씩 적어 칩으로 쌓는 입력칸 (새 여행 만들기용) */
export default function NameChipsInput({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  function add() {
    if (!text.trim()) return;
    const r = mergeNames(names, text);
    onChange(r.names);
    setMsg(r.msg);
    setText("");
  }

  return (
    <div className="space-y-2">
      {names.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="추가한 사람">
          {names.map((n) => (
            <li key={n}>
              <button
                type="button"
                className="chip border-ink bg-soft"
                aria-label={`${n} 빼기`}
                onClick={() => onChange(names.filter((x) => x !== n))}
              >
                {n} ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className="field"
          value={text}
          maxLength={LIMITS.memberName * 4}
          placeholder="이름 (쉼표로 여러 명)"
          aria-label="사람 이름"
          name="pendingNames"
          enterKeyHint="done"
          onChange={(e) => {
            setText(e.target.value);
            setMsg("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn shrink-0" onClick={add}>
          추가
        </button>
      </div>
      {msg && <p className="text-sm text-coral-dark">{msg}</p>}
    </div>
  );
}
