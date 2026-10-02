import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "여가 - 다같이 여행가자!", template: "%s · 여가" },
  description: "사람을 모으고, 날짜와 예산을 함께 정하고, 같이 준비하는 여행 계획 서비스",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1318" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-sky-700 dark:text-sky-400">
              여가
            </Link>
            {user && (
              <nav className="flex items-center gap-1 text-sm text-slate-500">
                <Link href="/me" className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  내 정보
                </Link>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                    로그아웃
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
