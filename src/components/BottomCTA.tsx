// 화면 맨 아래 고정 버튼 영역: 56px 버튼 하나, 좌우 24px, 아래는 safe area 반영,
// 위쪽에는 배경색 → 투명 보호 그라디언트. 안쪽에 primaryButtonXl + "w-full" 버튼/링크를 넣는다.
// 본문이 가려지지 않도록 같은 높이의 빈 공간도 함께 둔다.
// 주의: 이 컴포넌트를 transform 이 걸리는 요소(Reveal/Intro) 안에 넣지 말 것 (fixed 기준이 바뀐다).

import type { ReactNode } from "react";

export default function BottomCTA({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-32" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background from-60% to-transparent pt-8">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </>
  );
}
