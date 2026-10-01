"use client";

// F-03 참여하기: 초대 링크로 들어온 사람이 표시 이름을 정하고 참여한다 (기본값은 소셜 닉네임)

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, fieldLabel, h1, input, muted, primaryButton } from "@/components/styles";
import { formatRange } from "@/lib/date";
import { errorMessage, joinTrip } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "@/lib/validation";
import { LABELS } from "@/types/trip";
import type { TripPreview } from "@/types/db";

export default function JoinCard({ code, preview, defaultName }: { code: string; preview: TripPreview; defaultName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const v = useValidation("join");
  const [name, setName] = useState(defaultName);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.validate(e.currentTarget)) return;
    setPending(true);
    try {
      await joinTrip(supabase, code, name.trim());
      router.refresh(); // 서버 컴포넌트가 다시 그려지며 여행방이 보인다
    } catch (err) {
      const msg = errorMessage(err);
      v.setError("displayName", msg.includes("같은 이름") ? "이미 같은 이름의 참여자가 있어요. 다른 이름을 써 주세요." : msg);
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
          {preview.host_name ?? "친구"}님이 여행에 초대했어요
        </p>
        <h1 className={h1}>{preview.name}</h1>
        <p className={muted}>
          {LABELS.region[preview.region]} · 후보 시기 {formatRange(preview.window_start, preview.window_end)} · {preview.member_count}명 참여 중
        </p>
      </div>
      <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className={card}>
        <div className="space-y-1">
          <label className="block space-y-1">
            <span className={fieldLabel}>이 방에서 쓸 이름</span>
            <input
              {...v.field("displayName")}
              type="text"
              className={input}
              required
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <FieldError id={v.errorId("displayName")} message={v.errors.displayName} />
          <p className={muted}>친구들이 알아볼 수 있는 이름으로 정해 주세요. 나중에 바꿀 수 있어요.</p>
        </div>
        <button type="submit" disabled={pending} className={`w-full ${primaryButton}`}>
          {pending ? "참여하는 중…" : "참여하기"}
        </button>
      </form>
    </div>
  );
}
