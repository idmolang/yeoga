// F-07 데이터 저장: 모든 여행을 localStorage "trips" 키 하나에 저장
// 나중에 서버 DB로 바꿀 때는 이 파일의 함수 내부만 바꾸면 된다.

import type { QuickStartAnswers, Trip } from "@/types/trip";

const TRIPS_KEY = "trips";
const DRAFT_KEY = "quickstart-draft";

export function loadTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

function saveTrips(trips: Trip[]): boolean {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    return true;
  } catch {
    return false;
  }
}

export function getTrip(id: string): Trip | undefined {
  return loadTrips().find((t) => t.id === id);
}

/** 있으면 교체, 없으면 추가. 저장 성공 여부를 돌려준다. */
export function upsertTrip(trip: Trip): boolean {
  const trips = loadTrips();
  const next = { ...trip, updatedAt: new Date().toISOString() };
  const index = trips.findIndex((t) => t.id === trip.id);
  if (index >= 0) trips[index] = next;
  else trips.unshift(next);
  return saveTrips(trips);
}

export function deleteTrip(id: string): boolean {
  return saveTrips(loadTrips().filter((t) => t.id !== id));
}

// 빠른 시작 중간 저장 (나갔다 와도 이어서 작성)
export function loadDraft(): Partial<QuickStartAnswers> & { step?: number } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDraft(draft: Partial<QuickStartAnswers> & { step?: number }) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 임시 저장 실패는 무시 (작성은 계속 가능)
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 무시
  }
}
