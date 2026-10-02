"use client";

// 온보딩 폼: 이름(기본값 소셜 닉네임) + 개인정보 안내 동의

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, choice, fieldLabel, input, muted, primaryButton, subtleBox } from "@/components/styles";
import { createProfile, errorMessage } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "@/lib/validation";

export default function OnboardingForm({
  userId,
  defaultName,
  avatarUrl,
  next,
}: {
  userId: string;
  defaultName: string;
  avatarUrl: string | null;
  next: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const v = useValidation("onboarding");
  const [name, setName] = useState(defaultName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.validate(e.currentTarget)) return;
    setPending(true);
    setError("");
    try {
      await createProfile(supabase, userId, name.trim(), avatarUrl);
    } catch (err) {
      // 이미 온보딩을 마친 경우(다른 탭 등)에는 그냥 넘어간다
      if ((err as { code?: string }).code !== "23505") {
        setError(errorMessage(err));
        setPending(false);
        return;
      }
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card}>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>여가에서 쓸 이름</span>
          <span className="flex items-center gap-3">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 소셜 계정의 외부 프로필 사진
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-11 shrink-0 rounded-full bg-slate-200 object-cover" />
            )}
            <input
              {...v.field("name")}
              type="text"
              className={input}
              required
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </span>
        </label>
        <FieldError id={v.errorId("name")} message={v.errors.name} />
        <p className={muted}>소셜 닉네임을 기본으로 채웠어요. 친구들이 알아볼 이름으로 바꿔도 돼요. (10자 이내)</p>
      </div>

      <div className={`${subtleBox} space-y-1`}>
        <p className="font-semibold">개인정보 수집·이용 안내</p>
        <ul className="list-inside list-disc space-y-0.5 text-slate-600 dark:text-slate-300">
          <li>받는 정보: 닉네임, 프로필 사진</li>
          <li>사용 목적: 여행방 참여자 표시</li>
          <li>이메일·연락처는 받지 않아요. 탈퇴하면 삭제돼요.</li>
        </ul>
        <p>
          <Link href="/privacy" target="_blank" className="font-medium text-sky-700 underline dark:text-sky-300">
            자세히 보기
          </Link>
        </p>
      </div>

      <div className="space-y-1">
        <label className={choice}>
          <input {...v.field("consent")} type="checkbox" required data-msg-required="동의해야 시작할 수 있어요." />
          <span className="text-sm">위 개인정보 수집·이용에 동의해요 (필수)</span>
        </label>
        <FieldError id={v.errorId("consent")} message={v.errors.consent} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`w-full ${primaryButton} py-3 text-base`}>
        {pending ? "저장하는 중…" : "동의하고 시작하기"}
      </button>
    </form>
  );
}
