import { Suspense } from "react";
import NbbangApp from "./components/NbbangApp";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pt-6 pb-16">
      {/* 기록은 이 기기 브라우저에만 있으므로, 앱 화면은 브라우저에서만 그린다 */}
      <Suspense
        fallback={
          <p className="mt-24 text-center font-hand text-2xl text-ink-soft">불러오는 중…</p>
        }
      >
        <NbbangApp />
      </Suspense>
    </main>
  );
}
