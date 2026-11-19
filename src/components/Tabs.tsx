"use client";

// 공용 탭 (화살표 키로 이동하는 접근성 탭)

import type { KeyboardEvent } from "react";

export default function Tabs<T extends string>({
  tabs,
  current,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; badge?: string | number }[];
  current: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={current === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={current === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
          className={`shrink-0 border-b-[2.5px] px-3 py-2.5 text-sm transition-colors duration-(--dur-base) ease-(--ease) ${
            current === t.id
              ? "border-brand-600 font-semibold text-brand-text"
              : "border-transparent text-text-tertiary hover:text-foreground"
          }`}
        >
          {t.label}
          {t.badge !== undefined && t.badge !== "" && <span className="ml-1 text-xs text-text-tertiary">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
      {children}
    </div>
  );
}
