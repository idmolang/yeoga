"use client";

// 여행방 데이터 불러오기 + 다른 참여자의 변경을 Realtime 으로 받아 다시 불러오기 (N-03)
// 실시간 연결이 안 되는 환경을 위해 창으로 돌아올 때와 "새로고침" 버튼으로도 다시 불러온다.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage, loadRoom } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import type { RoomData } from "@/types/db";

const TABLES = [
  "members",
  "responses",
  "destination_options",
  "destination_votes",
  "todos",
  "schedule_slots",
  "slot_comments",
  "slot_likes",
  "expenses",
  "settlements",
  "packing_items",
];

export function useRoom(tripId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const dataRef = useRef<RoomData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await loadRoom(supabase, tripId);
      dataRef.current = next;
      setData(next);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [supabase, tripId]);

  // 변경이 한꺼번에 여러 개 와도 한 번만 다시 불러오게 잠깐 모았다가 실행
  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(refresh, 300);
  }, [refresh]);

  useEffect(() => {
    // 처음 불러오기 (구독 콜백처럼 비동기로 상태를 바꾼다)
    const first = setTimeout(refresh, 0);

    const channel = supabase.channel(`trip-${tripId}`);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, scheduleRefresh);
    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        scheduleRefresh,
      );
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `trip_id=eq.${tripId}` },
        scheduleRefresh,
      );
      // 삭제 이벤트는 필터를 쓸 수 없어서 (Supabase 제약) 모두 받고, 우리 방 데이터일 때만 다시 불러온다
      channel.on("postgres_changes", { event: "DELETE", schema: "public", table }, (payload) => {
        const old = payload.old as Record<string, unknown>;
        const room = dataRef.current;
        if (!room) return;
        if (old.trip_id === tripId) return scheduleRefresh();
        const id = old.id ?? old.slot_id ?? old.option_id;
        const ids = new Set<unknown>([
          ...room.todos, ...room.slots, ...room.comments, ...room.expenses, ...room.settlements,
          ...room.packing, ...room.options,
        ].map((r) => r.id));
        if (ids.has(id) || old.user_id !== undefined) scheduleRefresh();
      });
    }
    channel.subscribe((status) => setLive(status === "SUBSCRIBED"));

    const onFocus = () => scheduleRefresh();
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(first);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [supabase, tripId, refresh, scheduleRefresh]);

  return { supabase, data, error, live, refresh };
}
