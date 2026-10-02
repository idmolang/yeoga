"use client";

// 내 정보: 여가에서 쓸 이름 수정. 새로 만드는 방·참여할 방의 기본 이름이 되고, 이미 참여한 방의 이름은 그대로예요.

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, fieldLabel, h2, input, muted, secondaryButton } from "@/components/styles";
import { errorMessage, renameProfile } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "@/lib/validation";

export default function ProfileForm({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const v = useValidation("profile");
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!v.validate(e.currentTarget)) return;
    setPending(true);
    try {
      await renameProfile(supabase, userId, value.trim());
      setValue(value.trim());
      setMessage("저장했어요.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
    setPending(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card} aria-labelledby="profile-title">
      <h2 id="profile-title" className={h2}>
        이름
      </h2>
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className={fieldLabel}>여가에서 쓸 이름</span>
          <span className="flex items-center gap-3">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 소셜 계정의 외부 프로필 사진
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-11 shrink-0 rounded-full bg-slate-200 object-cover" />
            )}
            <input {...v.field("name")} type="text" className={input} required maxLength={10} value={value} onChange={(e) => setValue(e.target.value)} />
          </span>
        </label>
        <FieldError id={v.errorId("name")} message={v.errors.name} />
        <p className={muted}>새로 만들거나 참여하는 방의 기본 이름이에요. 이미 참여한 방의 이름은 방 안에서 바꿔요.</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || value.trim() === name} className={secondaryButton}>
          {pending ? "저장하는 중…" : "저장"}
        </button>
        {message && (
          <span role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
