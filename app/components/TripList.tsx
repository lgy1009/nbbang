"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { settleTrip } from "@/lib/settle";
import { LIMITS, type Trip } from "@/lib/types";
import NameChipsInput from "./NameChipsInput";
import { tapeStyle } from "./ui";

const TAPES = ["var(--color-butter)", "var(--color-mint)", "var(--color-sky)", "var(--color-coral)", "var(--color-lilac)"];

export default function TripList({
  trips,
  canCreate,
  onOpen,
  onCreate,
}: {
  trips: Trip[];
  canCreate: boolean;
  onOpen: (id: string) => void;
  onCreate: (name: string, members: string[]) => void;
}) {
  const [creating, setCreating] = useState(trips.length === 0);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("여행 이름을 적어 주세요.");
    if (members.length < 2) return setError("함께 간 사람을 2명 이상 적어 주세요. (나 포함)");
    onCreate(n, members);
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <p className="font-hand text-lg text-ink-soft">✈️ 우리 여행 정산 다이어리</p>
        <h1 className="mt-1 font-hand text-5xl font-bold">
          N빵 <span className="text-coral-dark">계산기</span>
        </h1>
        <p className="mt-2 text-sm text-ink-soft">누가 누구에게 얼마 보내면 끝나는지, 송금 횟수는 가장 적게!</p>
      </header>

      {creating ? (
        <form onSubmit={submit} className="card space-y-4" aria-label="새 여행 만들기">
          <span className="tape" style={tapeStyle("var(--color-mint)")}>
            새 여행
          </span>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">여행 이름</span>
            <input
              className="field"
              value={name}
              maxLength={LIMITS.tripName}
              placeholder="예: 그라나다 주말여행"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div>
            <span className="mb-1 block text-sm font-bold">함께 간 사람</span>
            <NameChipsInput names={members} onChange={setMembers} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-coral-dark">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn flex-1 bg-coral">
              여행 만들기
            </button>
            {trips.length > 0 && (
              <button type="button" className="btn bg-white" onClick={() => setCreating(false)}>
                취소
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn w-full bg-coral text-2xl"
          disabled={!canCreate}
          onClick={() => {
            setCreating(true);
            setError("");
          }}
        >
          ＋ 새 여행
        </button>
      )}

      {trips.length > 0 && (
        <section aria-label="저장된 여행" className="space-y-3">
          <h2 className="font-hand text-2xl font-bold">📒 저장된 여행</h2>
          <ul className="space-y-3">
            {trips.map((t, i) => {
              const r = settleTrip(t);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(t.id)}
                    className="card block w-full text-left transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    style={{ rotate: i % 2 ? "0.4deg" : "-0.4deg" }}
                  >
                    <span className="tape text-xl" style={tapeStyle(TAPES[i % TAPES.length])}>
                      {t.name}
                    </span>
                    <span className="mt-2 flex items-end justify-between gap-2 text-sm text-ink-soft">
                      <span className="truncate">
                        👥 {t.members.map((m) => m.name).join(", ")}
                      </span>
                      <span className="money shrink-0 font-bold text-ink">
                        {r.ok ? formatMoney(r.total, r.currency) : "환율 필요"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-center text-xs leading-relaxed text-ink-soft">
        🔒 기록은 이 휴대폰(브라우저)에만 저장돼요. 서버로 보내지 않아요.
        <br />
        브라우저 기록을 지우면 함께 지워지니, 정산이 끝나면 카톡으로 복사해 두세요.
      </p>
    </div>
  );
}
