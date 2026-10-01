"use client";

// 여행방 화면 어디서나 같은 데이터와 "저장 후 다시 불러오기" 함수를 쓰게 해 주는 Context
// v0.1의 update(next) 함수 패턴을 DB 버전으로 옮긴 것: 모든 변경은 run(...) 하나를 거친다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext } from "react";
import type { MemberRow, RoomData } from "@/types/db";

export interface Room {
  data: RoomData;
  supabase: SupabaseClient;
  me: string; // 내 user id
  isHost: boolean;
  /** 저장 작업을 실행하고, 성공하면 다시 불러온다. 실패하면 화면 위에 오류를 띄우고 false */
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  refresh: () => Promise<void>;
  /** user id → 표시 이름 */
  nameOf: (userId: string | null | undefined) => string;
  /** 확정 때 참여 인원으로 고른 사람 (확정 전에는 전원) */
  going: MemberRow[];
}

export const RoomContext = createContext<Room | null>(null);

export function useRoomContext() {
  const room = useContext(RoomContext);
  if (!room) throw new Error("RoomContext 안에서만 쓸 수 있어요");
  return room;
}
