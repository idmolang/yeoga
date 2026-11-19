"use client";

// 아래에서 올라오는 시트 (가운데 팝업 대신). 네이티브 <dialog> 를 써서
// 포커스 가두기·Esc 닫기·뒤 화면 비활성화가 브라우저 기본 동작으로 처리된다.

import { useEffect, useId, useRef, type ReactNode } from "react";

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // 어두운 바깥 영역을 누르면 닫기
      }}
    >
      <div className="space-y-6 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <h2 id={titleId} className="text-xl font-bold tracking-[-0.015em]">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
