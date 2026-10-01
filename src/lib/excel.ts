// F-08 엑셀 다운로드: 여행 하나를 시트 5개짜리 .xlsx 로 내보낸다

import * as XLSX from "xlsx";
import { ddayLabel } from "@/lib/date";
import { summarizeBudget } from "@/lib/budget";
import { sortBudget, sortPacking, sortTodos } from "@/lib/sort";
import { LABELS, type Trip } from "@/types/trip";

const ox = (v: boolean) => (v ? "O" : "X");
const percent = (done: number, total: number) =>
  total === 0 ? "-" : `${Math.round((done / total) * 100)}%`;

/** 행 배열 → 시트. 금액 열에 천 단위 서식, 열 너비 지정 */
function toSheet(rows: Record<string, string | number>[], moneyColumns: string[] = []) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (rows.length === 0) return ws;

  const headers = Object.keys(rows[0]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(10, h.length * 2 + 4) }));

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  headers.forEach((h, c) => {
    if (!moneyColumns.includes(h)) return;
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") cell.z = "#,##0";
    }
  });
  return ws;
}

export function exportTripToExcel(trip: Trip) {
  const wb = XLSX.utils.book_new();

  // 1) 요약: 빠른 시작 응답 + 진행률
  const total = trip.budgetPerPerson * trip.people;
  XLSX.utils.book_append_sheet(
    wb,
    toSheet(
      [
        {
          "여행 이름": trip.name,
          여행지: trip.destination,
          "국내/해외": LABELS.region[trip.region],
          기간: `${trip.startDate} ~ ${trip.endDate}`,
          인원: trip.people,
          동행: LABELS.companion[trip.companion],
          "1인 예산(원)": trip.budgetPerPerson,
          "총예산(원)": total,
          "여행 스타일": trip.styles.map((s) => LABELS.style[s]).join(", "),
          "할 일 완료율": percent(trip.todos.filter((t) => t.done).length, trip.todos.length),
          "준비물 완료율": percent(trip.packing.filter((p) => p.packed).length, trip.packing.length),
        },
      ],
      ["1인 예산(원)", "총예산(원)"],
    ),
    "요약",
  );

  // 2) 할 일: 마감일 순 (마감일 없는 항목은 맨 뒤)
  XLSX.utils.book_append_sheet(
    wb,
    toSheet(
      sortTodos(trip.todos).map((t) => ({
        완료: ox(t.done),
        "할 일": t.title,
        마감일: t.dueDate || "-",
        "D-day": t.dueDate ? ddayLabel(t.dueDate) : "-",
        담당자: t.assignee,
      })),
    ),
    "할 일",
  );

  // 3) 일정: 날짜 → 시간대 순 (생성 순서가 이미 날짜·시간대 순)
  XLSX.utils.book_append_sheet(
    wb,
    toSheet(
      trip.schedule.map((s) => ({
        날짜: s.date,
        시간대: LABELS.slot[s.slot],
        시간: s.time,
        장소: s.place,
        "할 일": s.activity,
        "예상 비용(원)": s.cost,
        "예약 필요": ox(s.needsBooking),
        메모: s.memo,
      })),
      ["예상 비용(원)"],
    ),
    "일정",
  );

  // 4) 예산: 카테고리 순 + 합계·1인당 행 (예산과 실제 지출 각각)
  const budget = summarizeBudget(trip);
  const budgetRows: Record<string, string | number>[] = sortBudget(trip.budget).map((b) => ({
    카테고리: LABELS.budgetCategory[b.category],
    항목: b.title,
    구분: b.kind === "plan" ? "예산" : "실제 지출",
    "금액(원)": b.amount,
  }));
  budgetRows.push(
    { 카테고리: "합계", 항목: "", 구분: "예산", "금액(원)": budget.plan },
    { 카테고리: "합계", 항목: "", 구분: "실제 지출", "금액(원)": budget.actual },
    { 카테고리: "1인당", 항목: "", 구분: "예산", "금액(원)": budget.planPerPerson },
    { 카테고리: "1인당", 항목: "", 구분: "실제 지출", "금액(원)": budget.actualPerPerson },
  );
  XLSX.utils.book_append_sheet(wb, toSheet(budgetRows, ["금액(원)"]), "예산");

  // 5) 준비물: 분류 순 (필수품 → 의류 → 세면 → 전자기기 → 기타)
  XLSX.utils.book_append_sheet(
    wb,
    toSheet(
      sortPacking(trip.packing).map((p) => ({ 챙김: ox(p.packed), 분류: p.group, 준비물: p.name })),
    ),
    "준비물",
  );

  const safeName = trip.name.replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `${safeName}_여행계획_${trip.startDate}.xlsx`);
}
