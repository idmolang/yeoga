// F-16 엑셀 다운로드 (FRD 13장): 단계에 따라 시트 구성이 달라진다
// - 조율 단계: 요약 · 응답 원본 · 날짜 조율 · 예산·여행지 조율
// - 준비 단계: 위 4개 + 할 일 · 일정 · 예산·지출 · 정산 · 준비물
// 계산은 화면과 같은 함수(coordinate, settle, summarizeBudget, 정렬)를 그대로 쓴다.

import { summarizeBudget } from "@/lib/budget";
import { coordinate } from "@/lib/coordinate";
import { ddayLabel, todayISO, weekdayLabel } from "@/lib/date";
import { settle } from "@/lib/settle";
import { sortExpenses, sortPacking, sortSlots, sortTodos } from "@/lib/sort";
import { stageLabel, stageOf } from "@/lib/stage";
import type { DepartSlot, RoomData } from "@/types/db";
import { LABELS } from "@/types/trip";

type Row = Record<string, string | number>;

const ox = (v: boolean) => (v ? "O" : "X");
const DEPART: Record<DepartSlot, string> = { morning: "오전", afternoon: "오후", evening: "저녁", any: "상관없음" };

/** ISO 시각 → "YYYY-MM-DD HH:mm" (한국 시간) */
const kst = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16).replace("T", " ");
};

export async function exportRoomToExcel(data: RoomData) {
  // xlsx 는 무거워서 버튼을 누를 때만 불러온다
  const XLSX = await import("xlsx");

  /** 행 배열 → 시트. 금액 열에 천 단위 서식, 열 너비 지정 */
  const toSheet = (rows: Row[], moneyColumns: string[] = [], headers?: string[]) => {
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([headers ?? []]);
    const keys = rows.length ? Object.keys(rows[0]) : (headers ?? []);
    ws["!cols"] = keys.map((h) => ({
      wch: Math.min(40, Math.max(10, h.length * 2 + 2, ...rows.map((r) => String(r[h] ?? "").length + 2))),
    }));
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    keys.forEach((h, c) => {
      if (!moneyColumns.includes(h)) return;
      for (let r = 1; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && typeof cell.v === "number") cell.z = "#,##0";
      }
    });
    return ws;
  };

  const { trip, members, responses, options, votes } = data;
  const wb = XLSX.utils.book_new();
  const add = (name: string, ws: ReturnType<typeof toSheet>) => XLSX.utils.book_append_sheet(wb, ws, name);
  const nameOf = (id: string | null) => (id ? (members.find((m) => m.user_id === id)?.display_name ?? "나간 사람") : "");
  const c = coordinate(data);
  const stage = stageOf(trip, responses.length);
  const confirmed = trip.status === "confirmed";
  const going = confirmed ? members.filter((m) => m.going) : members;

  // 1) 요약
  add(
    "요약",
    toSheet(
      [
        {
          "여행 이름": trip.name,
          방장: nameOf(trip.host_id),
          단계: stageLabel(stage),
          [confirmed ? "확정 날짜" : "후보 시기"]: confirmed
            ? `${trip.start_date} ~ ${trip.end_date}`
            : `${trip.window_start} ~ ${trip.window_end}`,
          여행지: trip.destination ?? "미정",
          "국내/해외": LABELS.region[trip.region],
          "참여 인원": going.length,
          "응답 인원": responses.length,
          "1인 예산(원)": trip.budget_per_person ?? c.budget.recommended,
          ...(confirmed ? {} : { "응답 마감일": trip.response_deadline }),
        },
      ],
      ["1인 예산(원)"],
    ),
  );

  // 2) 응답 원본
  add(
    "응답 원본",
    toSheet(
      responses.map((r) => ({
        이름: nameOf(r.user_id),
        "가능한 날짜": [...r.available_dates].sort().join(", "),
        "희망 1인 예산(원)": r.budget,
        스타일: r.styles.map((s) => LABELS.style[s]).join(", "),
        "투표한 여행지": votes
          .filter((v) => v.user_id === r.user_id)
          .map((v) => options.find((o) => o.id === v.option_id)?.name)
          .filter(Boolean)
          .join(", "),
        "선호 출발 시간대": DEPART[r.depart_slot],
        "응답 시각": kst(r.updated_at),
      })),
      ["희망 1인 예산(원)"],
      ["이름", "가능한 날짜", "희망 1인 예산(원)", "스타일", "투표한 여행지", "선호 출발 시간대", "응답 시각"],
    ),
  );

  // 3) 날짜 조율
  add(
    "날짜 조율",
    toSheet(
      c.days.map((d) => ({
        날짜: d.date,
        요일: weekdayLabel(d.date),
        "가능 인원": d.available.length,
        "가능한 사람": d.available.map(nameOf).join(", "),
        "불가능한 사람": d.unavailable.map(nameOf).join(", "),
      })),
    ),
  );

  // 4) 예산·여행지 조율
  const coordRows: Row[] = [
    { 구분: "예산", 항목: "최소", 값: c.budget.min, 비고: "" },
    { 구분: "예산", 항목: "최대", 값: c.budget.max, 비고: "" },
    { 구분: "예산", 항목: "중간값", 값: c.budget.median, 비고: "" },
    { 구분: "예산", 항목: "추천 1인 예산", 값: c.budget.recommended, 비고: "중간값을 1만 원 단위로 내림" },
    ...c.styleCounts.map((s) => ({
      구분: "스타일",
      항목: LABELS.style[s.style],
      값: s.count,
      비고: c.planStyles.includes(s.style) ? "계획에 반영" : "",
    })),
    ...c.destinations.map((d) => ({
      구분: "여행지",
      항목: d.option.name,
      값: d.voters.length,
      비고: d.voters.map(nameOf).join(", "),
    })),
    ...(c.periods.length
      ? c.periods.map((p, i) => ({ 구분: "날짜", 항목: i === 0 ? "추천 기간" : `${i + 1}순위 기간`, 값: `${p.start} ~ ${p.end}`, 비고: "전원 가능" }))
      : c.fallback
        ? [{ 구분: "날짜", 항목: "차선 기간", 값: `${c.fallback.start} ~ ${c.fallback.end}`, 비고: `빠지는 사람: ${c.fallback.missing.map(nameOf).join(", ")}` }]
        : []),
  ];
  // 금액 서식은 예산 행에만
  const coordSheet = toSheet(coordRows);
  coordRows.forEach((r, i) => {
    const cell = coordSheet[XLSX.utils.encode_cell({ r: i + 1, c: 2 })];
    if (r.구분 === "예산" && cell) cell.z = "#,##0";
  });
  add("예산·여행지 조율", coordSheet);

  if (confirmed) {
    // 5) 할 일: 마감일 순 (마감일 없는 항목은 맨 뒤)
    add(
      "할 일",
      toSheet(
        sortTodos(data.todos).map((t) => ({
          완료: ox(t.done),
          "할 일": t.title,
          마감일: t.due_date ?? "-",
          "D-day": t.due_date ? ddayLabel(t.due_date) : "-",
          담당자: nameOf(t.assignee_id),
        })),
        [],
        ["완료", "할 일", "마감일", "D-day", "담당자"],
      ),
    );

    // 6) 일정: 날짜 → 시간대 → 시간 순
    add(
      "일정",
      toSheet(
        sortSlots(data.slots).map((s) => ({
          날짜: s.date,
          시간대: LABELS.slot[s.slot],
          시간: s.time,
          장소: s.place,
          "할 일": s.activity,
          "예상 비용(원)": s.cost,
          "예약 필요": ox(s.needs_booking),
          "좋아요 수": data.likes.filter((l) => l.slot_id === s.id).length,
          메모: s.memo,
        })),
        ["예상 비용(원)"],
      ),
    );

    // 7) 예산·지출: 카테고리 순 + 합계·1인당 (예산과 실제 지출 각각)
    const budget = summarizeBudget(data.expenses, going.length);
    const expenseRows: Row[] = sortExpenses(data.expenses).map((e) => ({
      카테고리: LABELS.budgetCategory[e.category],
      항목: e.title,
      구분: e.kind === "plan" ? "예산" : "실제 지출",
      "금액(원)": e.amount,
      "결제한 사람": nameOf(e.paid_by),
      "함께 쓴 사람": e.shared_with.map(nameOf).join(", "),
    }));
    const blank = { 항목: "", "결제한 사람": "", "함께 쓴 사람": "" };
    expenseRows.push(
      { ...blank, 카테고리: "합계", 구분: "예산", "금액(원)": budget.plan },
      { ...blank, 카테고리: "합계", 구분: "실제 지출", "금액(원)": budget.actual },
      { ...blank, 카테고리: `1인당 (${going.length}명)`, 구분: "예산", "금액(원)": budget.planPerPerson },
      { ...blank, 카테고리: `1인당 (${going.length}명)`, 구분: "실제 지출", "금액(원)": budget.actualPerPerson },
    );
    add("예산·지출", toSheet(expenseRows, ["금액(원)"]));

    // 8) 정산
    const result = settle(data.expenses, going.map((m) => m.user_id));
    add(
      "정산",
      toSheet(
        result.transfers.map((t) => ({
          "보내는 사람": nameOf(t.from),
          "받는 사람": nameOf(t.to),
          "금액(원)": t.amount,
          완료: ox(data.settlements.some((s) => s.from_id === t.from && s.to_id === t.to && s.amount === t.amount && s.done)),
        })),
        ["금액(원)"],
        ["보내는 사람", "받는 사람", "금액(원)", "완료"],
      ),
    );

    // 9) 준비물: 분류 순
    add(
      "준비물",
      toSheet(
        sortPacking(data.packing).map((p) => ({
          챙김: ox(p.packed),
          분류: p.category,
          "공용/개인": p.shared ? "공용" : "개인",
          준비물: p.name,
          담당자: p.shared ? "" : nameOf(p.owner_id),
        })),
      ),
    );
  }

  const safeName = trip.name.replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `${safeName}_${stageLabel(stage)}_${todayISO()}.xlsx`);
}
