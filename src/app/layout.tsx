import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "여행준비 한번에!",
  description: "여행 가볼까? 에서 바로 계획까지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">{children}</main>
      </body>
    </html>
  );
}
