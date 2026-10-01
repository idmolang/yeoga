"use client";

// 참여자 목록 + 이 방에서 쓸 내 이름 바꾸기 + 나가기/방 삭제

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import FieldError from "@/components/FieldError";
import { useRoomContext } from "@/components/room/RoomContext";
import { badge, badgeTone, card, dangerButton, ghostButton, h2, input, muted, secondaryButton } from "@/components/styles";
import { deleteTrip, leaveTrip, renameMe } from "@/lib/db";
import { useValidation } from "@/lib/validation";

export default function MembersCard() {
  const { data, me, isHost, supabase, run } = useRoomContext();
  const router = useRouter();
  const v = useValidation("rename");
  const mine = data.members.find((m) => m.user_id === me);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mine?.display_name ?? "");
  const responded = new Set(data.responses.map((r) => r.user_id));
  const confirmed = data.trip.status === "confirmed";

  const handleRename = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    const taken = data.members.some((m) => m.user_id !== me && m.display_name === trimmed);
    if (!v.validate(e.currentTarget, { displayName: taken ? "이미 같은 이름의 참여자가 있어요." : undefined })) return;
    if (await run(() => renameMe(supabase, data.trip.id, me, trimmed))) setEditing(false);
  };

  const handleLeave = async () => {
    if (!confirm(`"${data.trip.name}"에서 나갈까요? 내 응답도 함께 사라져요.`)) return;
    if (await run(() => leaveTrip(supabase, data.trip.id, me))) router.push("/");
  };

  const handleDelete = async () => {
    if (!confirm(`"${data.trip.name}" 방을 삭제할까요? 모든 참여자의 응답과 계획이 지워지고 되돌릴 수 없어요.`)) return;
    if (await run(() => deleteTrip(supabase, data.trip.id))) router.push("/");
  };

  return (
    <section className={card} aria-labelledby="members-title">
      <h2 id="members-title" className={h2}>
        참여자 <span className="text-base font-normal text-slate-500">{data.members.length}명</span>
      </h2>
      <ul className="flex flex-wrap gap-2">
        {data.members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
            <span className="font-medium">{m.display_name}</span>
            {m.user_id === data.trip.host_id && <span className={`${badge} ${badgeTone.sky}`}>방장</span>}
            {m.user_id === me && <span className={`${badge} ${badgeTone.gray}`}>나</span>}
            {!confirmed && responded.has(m.user_id) && <span className={`${badge} ${badgeTone.green}`}>응답</span>}
            {confirmed && !m.going && <span className={`${badge} ${badgeTone.gray}`}>불참</span>}
          </li>
        ))}
      </ul>

      {editing ? (
        <form noValidate onSubmit={handleRename} onChangeCapture={v.clearOnChange} className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">이 방에서 쓸 내 이름</span>
            <input {...v.field("displayName")} className={input} required maxLength={10} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <FieldError id={v.errorId("displayName")} message={v.errors.displayName} />
          <div className="flex gap-2">
            <button type="submit" className={secondaryButton}>저장</button>
            <button type="button" className={ghostButton} onClick={() => setEditing(false)}>취소</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={secondaryButton} onClick={() => { setName(mine?.display_name ?? ""); setEditing(true); }}>
            내 이름 바꾸기
          </button>
          {isHost ? (
            <button type="button" className={dangerButton} onClick={handleDelete}>방 삭제</button>
          ) : (
            <button type="button" className={dangerButton} onClick={handleLeave}>방 나가기</button>
          )}
        </div>
      )}
      <p className={muted}>이름 외의 개인정보(연락처, 계좌번호)는 받지 않아요.</p>
    </section>
  );
}
