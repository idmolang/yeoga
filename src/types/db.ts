// Supabase 테이블 행 타입 (supabase/schema.sql 과 1:1, FRD 12장)

import type { BudgetCategory, Region, Slot, Style } from "@/types/trip";

export type TripStatus = "collecting" | "closed" | "confirmed";
export type DepartSlot = Slot | "any";
export type PackingCategory = "필수품" | "의류" | "세면" | "전자기기" | "기타";

export interface TripRow {
  id: string;
  invite_code: string;
  host_id: string;
  name: string;
  region: Region;
  window_start: string; // YYYY-MM-DD
  window_end: string;
  destination_fixed: boolean;
  response_deadline: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  depart_time: string | null; // HH:MM
  return_time: string | null;
  destination: string | null;
  budget_per_person: number | null;
  styles: Style[];
  created_at: string;
  updated_at: string;
}

export interface MemberRow {
  trip_id: string;
  user_id: string;
  display_name: string;
  going: boolean;
  withdrawn: boolean; // 탈퇴한 사용자 (display_name 은 '탈퇴한 사용자')
  joined_at: string;
}

export interface ProfileRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  consented_at: string;
  created_at: string;
}

export interface ResponseRow {
  trip_id: string;
  user_id: string;
  available_dates: string[];
  budget: number;
  styles: Style[];
  depart_slot: DepartSlot;
  updated_at: string;
}

export interface OptionRow {
  id: string;
  trip_id: string;
  name: string;
  proposed_by: string | null;
  created_at: string;
}

export interface VoteRow {
  option_id: string;
  trip_id: string;
  user_id: string;
}

export interface TodoRow {
  id: string;
  trip_id: string;
  title: string;
  due_date: string | null;
  assignee_id: string | null;
  done: boolean;
  urgent: boolean;
  created_at: string;
}

export interface SlotRow {
  id: string;
  trip_id: string;
  date: string;
  slot: Slot;
  time: string; // "" 또는 HH:MM
  place: string;
  activity: string;
  cost: number;
  needs_booking: boolean;
  memo: string;
  marker: "depart" | "return" | null;
  created_at: string;
}

export interface CommentRow {
  id: string;
  slot_id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface LikeRow {
  slot_id: string;
  trip_id: string;
  user_id: string;
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  title: string;
  category: BudgetCategory;
  amount: number;
  kind: "plan" | "actual";
  paid_by: string | null;
  shared_with: string[];
  created_at: string;
}

export interface SettlementRow {
  id: string;
  trip_id: string;
  from_id: string;
  to_id: string;
  amount: number;
  done: boolean;
}

export interface PackingRow {
  id: string;
  trip_id: string;
  name: string;
  category: PackingCategory;
  shared: boolean;
  owner_id: string | null;
  packed: boolean;
  created_at: string;
}

/** 여행방 하나의 모든 데이터 (화면·엑셀이 이것 하나를 본다) */
export interface RoomData {
  trip: TripRow;
  /** 지금 참여 중인 사람 */
  members: MemberRow[];
  /** 탈퇴했지만 지출·정산 기록에 남아 이름만 보여주는 사람 */
  withdrawn: MemberRow[];
  responses: ResponseRow[];
  options: OptionRow[];
  votes: VoteRow[];
  todos: TodoRow[];
  slots: SlotRow[];
  comments: CommentRow[];
  likes: LikeRow[];
  expenses: ExpenseRow[];
  settlements: SettlementRow[];
  packing: PackingRow[];
}

/** 초대 링크 미리보기 (참여 전에도 볼 수 있는 정보) */
export interface TripPreview {
  id: string;
  name: string;
  host_name: string | null;
  region: Region;
  window_start: string;
  window_end: string;
  status: TripStatus;
  member_count: number;
  is_member: boolean;
}
