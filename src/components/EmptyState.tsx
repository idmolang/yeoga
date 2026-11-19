// 비어 있는 상태·완료 상태: 가운데 정렬 아이콘 + 제목 + 한 줄 설명

import type { ReactNode } from "react";

const icons = {
  people: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17.5" cy="8" r="2.5" />
      <path d="M17.5 13.5c2.4 0 4 1.7 4 4.5" />
    </>
  ),
  trip: (
    <>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 13l9 4.5 9-4.5M3 17l9 4.5 9-4.5" />
    </>
  ),
};

export default function EmptyState({
  icon = "people",
  title,
  children,
}: {
  icon?: keyof typeof icons;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-text" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {icons[icon]}
        </svg>
      </span>
      <p className="text-[17px] font-semibold">{title}</p>
      {children && <p className="max-w-xs text-sm text-text-tertiary">{children}</p>}
    </div>
  );
}
