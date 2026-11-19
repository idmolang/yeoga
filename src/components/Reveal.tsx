"use client";

// 스크롤 등장 애니메이션: 화면 아래쪽에 있던 요소가 처음 보일 때 한 번만 페이드 + 10px 위로 이동한다.
// - 서버가 그린 HTML과 JS 실패 시에는 항상 보이는 상태다. 숨김은 JS가 뜬 뒤 "화면 아래쪽 요소"에만 건다.
// - 이미 화면 안에 있는 요소, prefers-reduced-motion 사용자, IntersectionObserver 가 없는 환경은 애니메이션 없이 그대로 둔다.
// - 관찰자가 1.5초 안에 한 번도 응답하지 않으면 숨긴 요소를 강제로 보이게 한다.
// 스타일은 globals.css 의 [data-reveal] 규칙이 맡는다.

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Props = {
  as?: "div" | "section" | "li" | "ul" | "ol" | "header";
  /** 목록에서의 순서. 순서 × 40ms 지연 (최대 5번째, 200ms) */
  index?: number;
  className?: string;
  children?: ReactNode;
  "aria-labelledby"?: string;
};

export default function Reveal({ as = "div", index = 0, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!("IntersectionObserver" in window)) return;
      if (el.getBoundingClientRect().top < window.innerHeight) return; // 이미 보이는 요소

      const show = () => {
        el.dataset.reveal = "shown";
      };
      let responded = false;
      const io = new IntersectionObserver(
        (entries) => {
          responded = true;
          if (entries.some((e) => e.isIntersecting)) {
            show();
            io.disconnect();
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
      );
      el.dataset.reveal = "hidden";
      io.observe(el);
      const failsafe = window.setTimeout(() => {
        if (!responded) {
          show();
          io.disconnect();
        }
      }, 1500);
      return () => {
        window.clearTimeout(failsafe);
        io.disconnect();
        delete el.dataset.reveal;
      };
    } catch {
      el.dataset.reveal = "shown";
    }
  }, []);

  // 모든 태그가 HTMLElement 이므로 div 로 간주해 ref 타입을 맞춘다
  const Tag = as as "div";
  const style = { "--reveal-delay": `${Math.min(index, 5) * 40}ms` } as CSSProperties;
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} style={style} {...rest}>
      {children}
    </Tag>
  );
}
