// 공통 값 종류와 한국어 라벨 (DB 행 타입은 types/db.ts)

export type Companion = "solo" | "friends" | "family" | "couple";
export type Region = "domestic" | "overseas";
export type Style = "food" | "sightseeing" | "relax" | "activity";
export type BudgetCategory = "transport" | "lodging" | "food" | "tour" | "etc";
export type Slot = "morning" | "afternoon" | "evening";

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
