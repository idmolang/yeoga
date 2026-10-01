"use client";

// 소셜 로그인 버튼. 누르면 구글/카카오 로그인 화면으로 갔다가 /auth/callback 으로 돌아온다.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "kakao";

const PROVIDERS: { id: Provider; label: string; className: string }[] = [
  {
    id: "kakao",
    label: "카카오로 시작하기",
    className: "bg-[#FEE500] text-[#191919] hover:brightness-95",
  },
  {
    id: "google",
    label: "구글로 시작하기",
    className:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  },
];

export default function LoginButtons({ next }: { next: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  const login = async (provider: Provider) => {
    setPending(provider);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) {
      setError("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => login(p.id)}
          disabled={pending !== null}
          className={`flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-base font-semibold transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${p.className}`}
        >
          {pending === p.id ? "이동하는 중…" : p.label}
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
