// F-17 데이터 저장: Supabase 읽기·쓰기를 이 파일에 모은다.
// (v0.1 storage.ts 의 역할. 화면 코드는 여기 함수만 부르고, 권한은 DB의 RLS가 지킨다)

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberRow, RoomData, TripPreview, TripRow } from "@/types/db";

type DB = SupabaseClient;

/** Supabase 오류를 사용자에게 보여줄 한국어 문구로 */
export function errorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  if (!e) return "알 수 없는 오류가 났어요.";
  if (e.code === "23505") return "이미 같은 이름이 있어요.";
  if (e.code === "PGRST116") return "여행을 찾을 수 없어요. 방장이 방을 삭제했거나 방에서 나갔을 수 있어요.";
  if (e.code === "42501" || e.message?.includes("row-level security"))
    return "권한이 없어요. 응답 마감이나 방장 권한을 확인해 주세요.";
  if (e.code === "23514") return "입력값이 규칙에 맞지 않아요.";
  // 우리 함수(RPC)가 던진 오류는 이미 한국어
  if (e.message && /[가-힣]/.test(e.message)) return e.message;
  return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

/** 오류가 있으면 throw (화면에서는 try/catch 로 한 번에 처리) */
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

// ───────── 방 목록·만들기·참여 ─────────

export interface TripListItem extends TripRow {
  members: { count: number }[];
  responses: { count: number }[];
}

/** 내가 참여한 모든 방 (내가 만든 방 포함. RLS가 참여한 방만 돌려준다) */
export async function listMyTrips(db: DB) {
  return check(
    await db
      .from("trips")
      .select("*, members(count), responses(count)")
      .order("created_at", { ascending: false }),
  ) as TripListItem[];
}

export interface NewTrip {
  name: string;
  hostName: string;
  region: TripRow["region"];
  windowStart: string;
  windowEnd: string;
  destinationFixed: boolean;
  destination: string;
  candidates: string[];
  deadline: string;
}

/** 방 만들기 → 초대코드 */
export async function createTrip(db: DB, t: NewTrip) {
  return check(
    await db.rpc("create_trip", {
      p_name: t.name,
      p_host_name: t.hostName,
      p_region: t.region,
      p_window_start: t.windowStart,
      p_window_end: t.windowEnd,
      p_destination_fixed: t.destinationFixed,
      p_destination: t.destination,
      p_candidates: t.candidates,
      p_deadline: t.deadline,
    }),
  ) as string;
}

export async function previewTrip(db: DB, code: string) {
  const { data, error } = await db.rpc("trip_preview", { p_code: code }).maybeSingle();
  if (error) throw error;
  return data as TripPreview | null;
}

export async function joinTrip(db: DB, code: string, displayName: string) {
  return check(await db.rpc("join_trip", { p_code: code, p_display_name: displayName })) as string;
}

// ───────── 여행방 전체 데이터 ─────────

export async function loadRoom(db: DB, tripId: string): Promise<RoomData> {
  const byTrip = (table: string) => db.from(table).select("*").eq("trip_id", tripId);
  const [trip, members, responses, options, votes, todos, slots, comments, likes, expenses, settlements, packing] =
    await Promise.all([
      db.from("trips").select("*").eq("id", tripId).single(),
      byTrip("members").order("joined_at"),
      byTrip("responses").order("updated_at"),
      byTrip("destination_options").order("created_at"),
      byTrip("destination_votes"),
      byTrip("todos").order("created_at"),
      byTrip("schedule_slots").order("created_at"),
      byTrip("slot_comments").order("created_at"),
      byTrip("slot_likes"),
      byTrip("expenses").order("created_at"),
      byTrip("settlements"),
      byTrip("packing_items").order("created_at"),
    ]);
  const everyone = (check(members) ?? []) as MemberRow[];
  return {
    trip: check(trip),
    members: everyone.filter((m) => !m.withdrawn),
    withdrawn: everyone.filter((m) => m.withdrawn),
    responses: check(responses) ?? [],
    options: check(options) ?? [],
    votes: check(votes) ?? [],
    todos: check(todos) ?? [],
    slots: check(slots) ?? [],
    comments: check(comments) ?? [],
    likes: check(likes) ?? [],
    expenses: check(expenses) ?? [],
    settlements: check(settlements) ?? [],
    packing: check(packing) ?? [],
  } as RoomData;
}

// ───────── 회원 ─────────

/** 온보딩: 이름 확인 + 개인정보 안내 동의 (consented_at 은 DB가 지금 시각으로 채운다) */
export async function createProfile(db: DB, userId: string, name: string, avatarUrl: string | null) {
  check(await db.from("profiles").insert({ user_id: userId, name, avatar_url: avatarUrl }));
}

export async function renameProfile(db: DB, userId: string, name: string) {
  check(await db.from("profiles").update({ name }).eq("user_id", userId));
}

/** 회원 탈퇴. hosted: 내가 방장인 방마다 "delete" 또는 새 방장의 user_id */
export async function deleteAccount(db: DB, hosted: Record<string, string>) {
  check(await db.rpc("delete_account", { p_hosted: hosted }));
}

// ───────── 방장 전용 ─────────

export async function updateTrip(db: DB, tripId: string, patch: Partial<TripRow>) {
  check(await db.from("trips").update(patch).eq("id", tripId));
}

export async function deleteTrip(db: DB, tripId: string) {
  check(await db.from("trips").delete().eq("id", tripId));
}

// ───────── 참여자 ─────────

export async function renameMe(db: DB, tripId: string, userId: string, displayName: string) {
  check(
    await db.from("members").update({ display_name: displayName }).eq("trip_id", tripId).eq("user_id", userId),
  );
}

export async function leaveTrip(db: DB, tripId: string, userId: string) {
  check(await db.from("members").delete().eq("trip_id", tripId).eq("user_id", userId));
}

// ───────── 행 단위 공용 함수 (준비 단계 테이블) ─────────

export type PlanTable =
  | "todos"
  | "schedule_slots"
  | "slot_comments"
  | "slot_likes"
  | "expenses"
  | "settlements"
  | "packing_items"
  | "destination_options"
  | "destination_votes"
  | "responses";

export async function insertRow(db: DB, table: PlanTable, row: Record<string, unknown>) {
  check(await db.from(table).insert(row));
}

export async function insertRows(db: DB, table: PlanTable, rows: Record<string, unknown>[]) {
  if (rows.length > 0) check(await db.from(table).insert(rows));
}

export async function updateRow(db: DB, table: PlanTable, id: string, patch: Record<string, unknown>) {
  check(await db.from(table).update(patch).eq("id", id));
}

export async function deleteRow(db: DB, table: PlanTable, id: string) {
  check(await db.from(table).delete().eq("id", id));
}

export async function deleteWhere(db: DB, table: PlanTable, match: Record<string, string>) {
  check(await db.from(table).delete().match(match));
}

export async function upsertRow(db: DB, table: PlanTable, row: Record<string, unknown>, onConflict: string) {
  check(await db.from(table).upsert(row, { onConflict }));
}

export async function confirmTrip(db: DB, tripId: string, plan: unknown) {
  check(await db.rpc("confirm_trip", { p_trip: tripId, p_plan: plan }));
}

// ───────── 조율 응답 ─────────

export interface ResponseInput {
  availableDates: string[];
  budget: number;
  styles: string[];
  departSlot: string;
  /** 투표할 기존 후보 id */
  voteIds: string[];
  /** 새로 제안하는 여행지 이름 (제안하면 바로 투표까지) */
  proposals: string[];
}

/** 내 응답 저장: 응답 1행 upsert → 제안한 여행지 추가 → 투표를 원하는 상태로 맞춘다 */
export async function saveResponse(db: DB, room: RoomData, me: string, input: ResponseInput) {
  const tripId = room.trip.id;
  check(
    await db.from("responses").upsert(
      {
        trip_id: tripId,
        user_id: me,
        available_dates: [...input.availableDates].sort(),
        budget: input.budget,
        styles: input.styles,
        depart_slot: input.departSlot,
      },
      { onConflict: "trip_id,user_id" },
    ),
  );

  const wanted = new Set(input.voteIds);
  for (const name of input.proposals) {
    const existing = room.options.find((o) => o.name === name);
    if (existing) {
      wanted.add(existing.id);
      continue;
    }
    const { data, error } = await db
      .from("destination_options")
      .insert({ trip_id: tripId, name })
      .select("id")
      .single();
    if (error) throw error;
    wanted.add(data.id);
  }

  const mine = room.votes.filter((v) => v.user_id === me).map((v) => v.option_id);
  const remove = mine.filter((id) => !wanted.has(id));
  const add = [...wanted].filter((id) => !mine.includes(id));
  if (remove.length) {
    check(await db.from("destination_votes").delete().eq("user_id", me).in("option_id", remove));
  }
  if (add.length) {
    check(await db.from("destination_votes").insert(add.map((option_id) => ({ option_id, trip_id: tripId, user_id: me }))));
  }
}

/** 여행지 후보 올리기 (추천 후보를 투표에 올릴 때) */
export async function addOption(db: DB, tripId: string, name: string) {
  check(await db.from("destination_options").insert({ trip_id: tripId, name }));
}
