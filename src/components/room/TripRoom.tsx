"use client";

// 여행방: 데이터를 불러와 Context 로 내려주고, 단계(모으기·조율 / 준비)에 맞는 화면을 보여준다

import { useCallback, useMemo, useState } from "react";
import InvitePanel from "@/components/room/InvitePanel";
import MembersCard from "@/components/room/MembersCard";
import { RoomContext, type Room } from "@/components/room/RoomContext";
import TripHeader from "@/components/room/TripHeader";
import { ghostButton, muted, secondaryButton } from "@/components/styles";
import { errorMessage } from "@/lib/db";
import { stageOf } from "@/lib/stage";
import { useRoom } from "./useRoom";

const won = (n: number) => `${Math.round(n / 10000).toLocaleString("ko-KR")}만 원`;

export default function TripRoom({ tripId, me, created }: { tripId: string; me: string; created: boolean }) {
  const { supabase, data, error, live, refresh } = useRoom(tripId);
  const [actionError, setActionError] = useState("");
  const [showInvite, setShowInvite] = useState(created);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        setActionError("");
        await refresh();
        return true;
      } catch (e) {
        setActionError(errorMessage(e));
        return false;
      }
    },
    [refresh],
  );

  const room = useMemo<Room | null>(() => {
    if (!data) return null;
    const names = new Map(data.members.map((m) => [m.user_id, m.display_name]));
    return {
      data,
      supabase,
      me,
      isHost: data.trip.host_id === me,
      run,
      refresh,
      nameOf: (id) => (id ? (names.get(id) ?? "나간 사람") : "-"),
      going: data.trip.status === "confirmed" ? data.members.filter((m) => m.going) : data.members,
    };
  }, [data, supabase, me, run, refresh]);

  if (!room) {
    return error ? (
      <div className="space-y-3">
        <p role="alert">{error}</p>
        <button type="button" className={secondaryButton} onClick={refresh}>다시 시도</button>
      </div>
    ) : (
      <p className={muted}>불러오는 중…</p>
    );
  }

  const { trip, responses } = room.data;
  const stage = stageOf(trip, responses.length);
  const people = trip.status === "confirmed" ? `${room.going.length}명` : `${room.data.members.length}명 참여`;
  const budget = trip.budget_per_person ? won(trip.budget_per_person) : "조율 중";

  return (
    <RoomContext.Provider value={room}>
      <div className="space-y-6">
        {(actionError || error) && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {actionError || error}
          </p>
        )}

        <TripHeader trip={trip} stage={stage} people={people} budget={budget} />

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={secondaryButton} onClick={() => setShowInvite((v) => !v)} aria-expanded={showInvite}>
            친구 초대
          </button>
          <button type="button" className={ghostButton} onClick={refresh}>
            새로고침
          </button>
          <span className={`ml-auto ${muted}`}>{live ? "● 실시간 반영 중" : "○ 새로고침으로 최신 내용 보기"}</span>
        </div>

        {showInvite && <InvitePanel trip={trip} onClose={() => setShowInvite(false)} />}

        <MembersCard />
      </div>
    </RoomContext.Provider>
  );
}
