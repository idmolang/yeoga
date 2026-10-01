// F-15 예약 사이트 바로가기 설정 (이 파일 하나만 고치면 된다)
//
// search: 여행지·날짜·인원을 채운 검색 링크. 2026-10-01에 실제 브라우저로 열어
//         결과 화면에 여행지·날짜·인원이 반영되는 것을 확인한 사이트에만 둔다.
//         확인하지 못한 사이트(자동 접속 차단, 지역 ID 필요 등)는 home(첫 화면)으로 연결한다.
// 예약·결제 대행과 가격 수집은 하지 않는다. 링크만 연결한다.

export type BookingKind = "flight" | "stay" | "transit";

export interface SearchInput {
  destination: string;
  /** 항공 검색용 도시/공항 코드 (destinations.json 의 airport). 없으면 항공 검색 링크를 만들지 않는다 */
  airport?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  people: number;
  overseas: boolean;
}

export interface BookingSite {
  id: string;
  name: string;
  kind: BookingKind;
  home: string;
  search?: (q: SearchInput) => string | null;
}

const ORIGIN = "SEL"; // 출발 도시: 서울(인천·김포)
const compact = (iso: string) => iso.replaceAll("-", "");
const enc = encodeURIComponent;

export const BOOKING_SITES: BookingSite[] = [
  // ── 항공 ──
  {
    id: "naver-flight",
    name: "네이버 항공권",
    kind: "flight",
    home: "https://flight.naver.com/",
    // 확인: /flights/international/SEL-OSA-20261110/OSA-SEL-20261113?adult=2 → 오사카·11.10·성인 2 반영
    search: (q) =>
      q.airport
        ? `https://flight.naver.com/flights/${q.overseas ? "international" : "domestic"}/${ORIGIN}-${q.airport}-${compact(q.startDate)}/${q.airport}-${ORIGIN}-${compact(q.endDate)}?adult=${q.people}&fareType=${q.overseas ? "Y" : "YC"}`
        : null,
  },
  {
    id: "skyscanner",
    name: "스카이스캐너",
    kind: "flight",
    home: "https://www.skyscanner.co.kr/",
    // 검색 URL은 자동 접속 확인 화면 때문에 확인하지 못해 첫 화면으로 연결
  },
  {
    id: "google-flights",
    name: "구글 항공편",
    kind: "flight",
    home: "https://www.google.com/travel/flights?hl=ko",
    // 확인: q="Flights to OSA from SEL on 날짜 through 날짜 for 3 adults" → 서울→오사카·날짜·승객 3명 반영
    search: (q) =>
      q.airport
        ? `https://www.google.com/travel/flights?hl=ko&q=${enc(`Flights to ${q.airport} from ${ORIGIN} on ${q.startDate} through ${q.endDate} for ${q.people} adults`)}`
        : null,
  },

  // ── 숙소 ──
  { id: "yanolja", name: "야놀자", kind: "stay", home: "https://nol.yanolja.com/" },
  { id: "yeogi", name: "여기어때", kind: "stay", home: "https://www.yeogi.com/" },
  { id: "agoda", name: "아고다", kind: "stay", home: "https://www.agoda.com/ko-kr/" },
  {
    id: "booking",
    name: "부킹닷컴",
    kind: "stay",
    home: "https://www.booking.com/index.ko.html",
    // 확인: searchresults.ko.html?ss=오사카&checkin=…&checkout=…&group_adults=2 → 오사카·11월 10일·성인 2 반영
    search: (q) =>
      `https://www.booking.com/searchresults.ko.html?ss=${enc(q.destination)}&checkin=${q.startDate}&checkout=${q.endDate}&group_adults=${q.people}&no_rooms=1`,
  },
  {
    id: "airbnb",
    name: "에어비앤비",
    kind: "stay",
    home: "https://www.airbnb.co.kr/",
    // 확인: /s/오사카/homes?checkin=…&checkout=…&adults=2 → 오사카·게스트 2명 반영
    search: (q) =>
      `https://www.airbnb.co.kr/s/${enc(q.destination)}/homes?checkin=${q.startDate}&checkout=${q.endDate}&adults=${q.people}`,
  },

  // ── 국내 교통 ──
  { id: "korail", name: "코레일", kind: "transit", home: "https://www.korail.com/" },
  { id: "srt", name: "SRT", kind: "transit", home: "https://etk.srail.kr/" },
  { id: "kobus", name: "고속버스", kind: "transit", home: "https://www.kobus.co.kr/" },
];

export const KIND_LABEL: Record<BookingKind, string> = { flight: "항공", stay: "숙소", transit: "국내 교통" };
