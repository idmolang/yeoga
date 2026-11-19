// 화면이 열릴 때 보이는 요소를 순서대로 등장시킨다 (제목 → 설명 → ...). CSS 애니메이션만 쓰므로 서버 컴포넌트에서도 쓴다.
// step 순서 × 간격만큼 늦게 시작한다. lg 는 첫 화면 큰 섹션용(600ms), 기본은 앱 안쪽 화면용(280ms).

import type { CSSProperties, ReactNode } from "react";

type Props = {
  as?: "div" | "section" | "header" | "h1" | "h2" | "p" | "li" | "span";
  step?: number;
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
  id?: string;
};

export default function Intro({ as = "div", step = 0, size = "md", className = "", children, ...rest }: Props) {
  const Tag = as as "div";
  const style = { "--intro-delay": `${step * (size === "lg" ? 140 : 60)}ms` } as CSSProperties;
  return (
    <Tag className={`intro ${size === "lg" ? "intro-lg" : ""} ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
