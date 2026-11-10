"use client";

import { use, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { loadTrips, newId, saveTrips } from "@/lib/storage";
import { LIMITS, type Trip } from "@/lib/types";
import TripList from "./TripList";
import TripView from "./TripView";

function tripIdFromHash(): string | null {
  const m = /^#trip=([\w-]{1,64})$/.exec(window.location.hash);
  return m ? m[1] : null;
}

export default function NbbangApp() {
  // localStorage는 브라우저에만 있으므로 이 부분은 브라우저에서만 그린다
  use(browser("여행 기록은 이 기기 브라우저(localStorage)에만 저장돼요."));

  const [trips, setTrips] = useState<Trip[]>(() => loadTrips());
  const [openId, setOpenId] = useState<string | null>(() => tripIdFromHash());
  const [saveFailed, setSaveFailed] = useState(false);
  const pushedRef = useRef(false);

  // 휴대폰 "뒤로" 버튼으로 목록에 돌아가게 주소 끝(#trip=...)을 따라간다
  useEffect(() => {
    const onHash = () => setOpenId(tripIdFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function commit(next: Trip[]) {
    setTrips(next);
    setSaveFailed(!saveTrips(next));
  }

  function updateTrip(id: string, fn: (t: Trip) => Trip) {
    commit(trips.map((t) => (t.id === id ? { ...fn(t), updatedAt: Date.now() } : t)));
  }

  function openTrip(id: string) {
    pushedRef.current = true;
    window.location.hash = `trip=${id}`;
  }

  function closeTrip() {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname);
      setOpenId(null);
    }
  }

  function createTrip(name: string, memberNames: string[]) {
    const now = Date.now();
    const trip: Trip = {
      id: newId(),
      name: name.slice(0, LIMITS.tripName),
      members: memberNames.map((n) => ({ id: newId(), name: n })),
      expenses: [],
      settleCurrency: "EUR",
      krwPerEur: null,
      createdAt: now,
      updatedAt: now,
    };
    commit([trip, ...trips]);
    openTrip(trip.id);
  }

  function deleteTrip(id: string) {
    commit(trips.filter((t) => t.id !== id));
    closeTrip();
  }

  const open = openId ? trips.find((t) => t.id === openId) : undefined;

  return (
    <>
      {saveFailed && (
        <p role="alert" className="mb-4 rounded-xl border-2 border-coral-dark bg-coral/30 p-3 text-sm">
          저장하지 못했어요. 브라우저의 저장 공간이 꽉 찼거나 시크릿 모드일 수 있어요.
        </p>
      )}
      {open ? (
        <TripView
          key={open.id}
          trip={open}
          onChange={(fn) => updateTrip(open.id, fn)}
          onBack={closeTrip}
          onDelete={() => deleteTrip(open.id)}
        />
      ) : (
        <TripList
          trips={trips}
          canCreate={trips.length < LIMITS.maxTrips}
          onOpen={openTrip}
          onCreate={createTrip}
        />
      )}
    </>
  );
}
