// 일정 시간대 규칙 (FRD 9장): 12시 전 오전, 18시 전 오후, 그 뒤 저녁

import type { Slot } from "@/types/trip";

export const slotFromTime = (time: string): Slot => {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};
