"use client";

// 회원 탈퇴: 내가 방장인 방마다 "삭제" 또는 "방장 넘기기"를 고르게 하고, 마지막으로 한 번 더 확인받는다.

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { card, dangerButton, fieldLabel, ghostButton, h2, input, muted, subtleBox } from "@/components/styles";
import { deleteAccount, errorMessage } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { useValidation } from "@/lib/validation";

export interface HostedTrip {
  id: string;
  name: string;
  others: { userId: string; name: string }[];
}

const DELETE = "delete";

export default function WithdrawSection({ hosted }: { hosted: HostedTrip[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const v = useValidation("withdraw");
  const [open, setOpen] = useState(false);
  // 방마다 고른 처리: "delete" 또는 새 방장의 user_id (참여자가 없으면 삭제뿐이라 미리 정해 둔다)
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(hosted.filter((t) => t.others.length === 0).map((t) => [t.id, DELETE])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!v.validate(e.currentTarget)) return;
    const deleting = hosted.filter((t) => choices[t.id] === DELETE).map((t) => t.name);
    const lines = ["정말 탈퇴할까요? 되돌릴 수 없어요."];
    if (deleting.length > 0) lines.push(`삭제되는 방: ${deleting.join(", ")}`);
    if (!confirm(lines.join("\n"))) return;

    setPending(true);
    setError("");
    try {
      await deleteAccount(supabase, choices);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
      return;
    }
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    router.replace("/");
    router.refresh();
  };

  return (
    <section className={card} aria-labelledby="withdraw-title">
      <h2 id="withdraw-title" className={h2}>
        회원 탈퇴
      </h2>
      {!open ? (
        <>
          <p className={muted}>탈퇴하면 내 정보와 응답이 삭제되고 되돌릴 수 없어요.</p>
          <button type="button" className={dangerButton} onClick={() => setOpen(true)}>
            탈퇴하기
          </button>
        </>
      ) : (
        <form noValidate onSubmit={handleSubmit} onChangeCapture={v.clearOnChange} className="space-y-4">
          <ul className={`${subtleBox} list-inside list-disc space-y-1`}>
            <li>닉네임·프로필 사진, 내 응답·의견·좋아요, 개인 준비물이 삭제돼요.</li>
            <li>다른 사람과 연결된 지출·정산 기록은 남고, 내 이름은 &quot;탈퇴한 사용자&quot;로 보여요.</li>
            <li>내가 방장인 방은 아래에서 정해 주세요.</li>
          </ul>

          {hosted.map((t) => (
            <div key={t.id} className="space-y-1">
              <label className="block space-y-1">
                <span className={fieldLabel}>
                  &quot;{t.name}&quot; 방 <span className="font-normal text-slate-500">(내가 방장)</span>
                </span>
                <select
                  {...v.field(`trip-${t.id}`)}
                  className={input}
                  required
                  data-msg-required="방을 삭제할지 방장을 넘길지 골라 주세요."
                  value={choices[t.id] ?? ""}
                  onChange={(e) => setChoices((prev) => ({ ...prev, [t.id]: e.target.value }))}
                >
                  <option value="" disabled>
                    선택
                  </option>
                  <option value={DELETE}>방 삭제 (모든 참여자의 기록이 지워져요)</option>
                  {t.others.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}님에게 방장 넘기기
                    </option>
                  ))}
                </select>
              </label>
              <FieldError id={v.errorId(`trip-${t.id}`)} message={v.errors[`trip-${t.id}`]} />
              {t.others.length === 0 && <p className={muted}>다른 참여자가 없어서 방이 삭제돼요.</p>}
            </div>
          ))}

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={`${dangerButton} border border-red-300 dark:border-red-900`}>
              {pending ? "탈퇴하는 중…" : "탈퇴하기"}
            </button>
            <button type="button" className={ghostButton} onClick={() => setOpen(false)} disabled={pending}>
              취소
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
