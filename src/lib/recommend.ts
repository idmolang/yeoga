// F-07 여행지 후보 추천 (v0.1 F-02 추천 로직 재사용): 국내/해외가 같은 후보 중 기간·1인 예산·스타일 일치 점수가 높은 3곳
// 후보 데이터는 src/data/destinations.json 에 있다. 여행지를 늘리려면 JSON만 고치면 된다.

import destinations from "@/data/destinations.json";
import { diffDays } from "@/lib/date";
import { LABELS, type Region, type Style } from "@/types/trip";

export interface Destination {
  name: string;
  region: Region;
  styles: Style[];
  minNights: number;
  maxNights: number;
  baseCost: number; // 1인 왕복 교통비 (서울 출발 기준 대략)
  nightCost: number; // 1인 1박당 숙소·식비·관광 (대략)
  summary: string;
}

export interface Recommendation {
  destination: Destination;
  score: number;
  estimate: number; // 1인 예상 비용
  reasons: string[];
}

const DESTINATIONS = destinations as Destination[];

const manwon = (n: number) => `${Math.round(n / 10000).toLocaleString("ko-KR")}만 원`;

/** 추천 기준: 국내/해외, 기간, 1인 예산, 스타일 (조율 단계에서는 응답 집계값을 넣는다) */
export interface Criteria {
  region: Region;
  startDate: string;
  endDate: string;
  budgetPerPerson: number;
  styles: Style[];
}

export function recommend(a: Criteria, count = 3): Recommendation[] {
  const nights = Math.max(diffDays(a.startDate, a.endDate), 0);

  return DESTINATIONS.filter((d) => d.region === a.region)
    .map((d) => {
      let score = 0;
      const reasons: string[] = [];

      // 스타일: 겹치는 것 하나당 2점
      const shared = d.styles.filter((s) => a.styles.includes(s));
      score += shared.length * 2;
      if (shared.length > 0) reasons.push(`${shared.map((s) => LABELS.style[s]).join("·")} 여행에 좋아요`);

      // 기간: 추천 박수 안이면 2점, 하루 차이면 1점
      if (nights >= d.minNights && nights <= d.maxNights) {
        score += 2;
        reasons.push(nights === 0 ? "당일치기 가능" : `${nights}박에 딱 맞아요`);
      } else if (nights >= d.minNights - 1 && nights <= d.maxNights + 1) {
        score += 1;
      }

      // 예산: 예상 비용이 1인 예산 안이면 2점, 20% 초과까지는 1점
      const estimate = d.baseCost + d.nightCost * Math.max(nights, 1);
      if (estimate <= a.budgetPerPerson) {
        score += 2;
        reasons.push("예산 안에 들어와요");
      } else if (estimate <= a.budgetPerPerson * 1.2) {
        score += 1;
        reasons.push("예산을 조금 넘어요");
      }

      return { destination: d, score, estimate, reasons };
    })
    .sort((x, y) => y.score - x.score || x.estimate - y.estimate)
    .slice(0, count);
}

export const formatEstimate = (estimate: number) => `1인 약 ${manwon(estimate)}`;
