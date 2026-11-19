import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "여가 - 다같이 여행가자!", template: "%s · 여가" },
  description: "사람을 모으고, 날짜와 예산을 함께 정하고, 같이 준비하는 여행 계획 서비스",
};

export const viewport: Viewport = {
  viewportFit: "cover", // 하단 고정 버튼이 safe area 를 반영하도록
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#17171c" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();

  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard 동적 서브셋(jsdelivr). display: swap이라 불러오기 전·실패 시 시스템 글꼴로 보인다 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-6">
            <Link href="/" className="text-xl font-extrabold tracking-[-0.02em] text-brand-text">
              여가
            </Link>
            {user && (
              <nav className="flex items-center gap-1 text-sm text-text-tertiary">
                <Link href="/me" className="rounded-md px-2 py-1 transition-colors duration-(--dur-fast) hover:bg-surface-sunken">
                  내 정보
                </Link>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="rounded-md px-2 py-1 transition-colors duration-(--dur-fast) hover:bg-surface-sunken">
                    로그아웃
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
