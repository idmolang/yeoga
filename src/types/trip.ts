// FRD 8장 데이터 구조

export type Companion = "solo" | "friends" | "family" | "couple";
export type Region = "domestic" | "overseas";
export type Style = "food" | "sightseeing" | "relax" | "activity";
export type BudgetCategory = "transport" | "lodging" | "food" | "tour" | "etc";
export type Slot = "morning" | "afternoon" | "evening";

export interface Todo {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  assignee: string;
  done: boolean;
  urgent: boolean;
}

export interface ScheduleItem {
  id: string;
  date: string;
  slot: Slot;
  time: string;
  place: string;
  activity: string;
  cost: number;
  needsBooking: boolean;
  memo: string;
}

export interface BudgetItem {
  id: string;
  title: string;
  category: BudgetCategory;
  amount: number;
  kind: "plan" | "actual";
}

export interface PackingItem {
  id: string;
  name: string;
  group: string;
  packed: boolean;
}

/** 빠른 시작(F-01)에서 받는 응답 */
export interface QuickStartAnswers {
  name: string;
  companion: Companion;
  people: number;
  startDate: string;
  endDate: string;
  region: Region;
  destination: string;
  wantsRecommendation: boolean;
  budgetPerPerson: number;
  styles: Style[];
}

export interface Trip extends QuickStartAnswers {
  id: string;
  todos: Todo[];
  schedule: ScheduleItem[];
  budget: BudgetItem[];
  packing: PackingItem[];
  createdAt: string;
  updatedAt: string;
}

// 화면·엑셀에 표시할 한국어 라벨
export const LABELS = {
  companion: { solo: "혼자", friends: "친구", family: "가족", couple: "연인" },
  region: { domestic: "국내", overseas: "해외" },
  style: { food: "맛집", sightseeing: "관광", relax: "휴양", activity: "액티비티" },
  budgetCategory: {
    transport: "교통",
    lodging: "숙소",
    food: "식비",
    tour: "관광",
    etc: "기타",
  },
  slot: { morning: "오전", afternoon: "오후", evening: "저녁" },
} as const;

/** 준비물 분류 (FRD 6장 준비물 추가 폼). 화면·엑셀은 이 순서로 묶는다 */
export const PACKING_GROUPS = ["필수품", "의류", "세면", "전자기기", "기타"] as const;
