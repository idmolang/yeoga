"use client";

// localStorage는 브라우저에만 있어서 서버 렌더링 중에는 읽을 수 없다.
// 이 컴포넌트로 감싸면 children은 브라우저에서만 그려지므로,
// 안쪽에서는 useState(() => loadTrips()) 처럼 바로 읽어도 된다.

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true, // 브라우저
    () => false, // 서버
  );
  return isClient ? children : fallback;
}
