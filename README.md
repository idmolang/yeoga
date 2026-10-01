# 여행준비 한번에!

"여행 가볼까?"라는 말이 나온 순간, 질문 5개에 답하면 여행 계획의 뼈대(할 일·일정·예산·준비물)를 만들어 주고 엑셀로 내려받을 수 있는 웹 서비스입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · SheetJS(xlsx) · localStorage

## 폴더 구조

```
src/
├─ app/
│  ├─ page.tsx            # 메인: 여행 목록 (F-09)
│  ├─ new/page.tsx        # 빠른 시작 단계형 폼 (F-01)
│  └─ trip/[id]/page.tsx  # 여행 상세 탭 + 엑셀 다운로드 (F-08)
├─ components/
│  └─ ClientOnly.tsx      # localStorage를 브라우저에서만 읽게 해주는 래퍼
├─ data/
│  └─ rules.json          # 자동 생성 규칙 (할 일, 준비물, 예산 비율)
├─ lib/
│  ├─ date.ts             # 날짜 계산, D-day
│  ├─ excel.ts            # 엑셀 내보내기 (F-08)
│  ├─ generate.ts         # 뼈대 자동 생성 (F-03)
│  └─ storage.ts          # localStorage 저장 (F-07)
└─ types/
   └─ trip.ts             # 데이터 타입 (FRD 8장)
```

## FRD 기능 구현 현황

| ID | 기능 | 상태 | 위치 |
| --- | --- | --- | --- |
| F-01 | 빠른 시작 폼 (단계형) | 완료 | `app/new/page.tsx` |
| F-02 | 여행지 추천 | TODO | `app/new/page.tsx` |
| F-03 | 뼈대 자동 생성 | 완료 | `lib/generate.ts`, `data/rules.json` |
| F-04 | 일정 관리 | 보기만 됨, 수정 폼 TODO | `app/trip/[id]/page.tsx` |
| F-05 | 할 일 체크리스트 | 체크 가능, 추가 폼 TODO | `app/trip/[id]/page.tsx` |
| F-06 | 예산 관리 | 보기만 됨, 추가 폼 TODO | `app/trip/[id]/page.tsx` |
| F-07 | 데이터 저장 | 완료 | `lib/storage.ts` |
| F-08 | 엑셀 다운로드 | 완료 | `lib/excel.ts` |
| F-09 | 여행 목록 | 완료 | `app/page.tsx` |
| F-10 | 준비물 관리 | 체크 가능, 추가 폼 TODO | `app/trip/[id]/page.tsx` |

과제 기준(응답 받기 → 저장 → 엑셀 다운로드)은 F-01, F-07, F-08로 이미 충족됩니다. 코드에서 `TODO(F-xx)` 를 검색하면 다음에 만들 곳을 찾을 수 있어요.

## 자동 생성 규칙 바꾸기

`src/data/rules.json` 만 수정하면 됩니다. `when` 조건으로 `always`, `domestic`, `overseas`, `style:food` 같은 스타일 조건, `nights>=3` 같은 숙박 수 조건을 쓸 수 있어요.

## 배포 (Vercel)

1. GitHub에 저장소를 만들어 push 합니다.
2. vercel.com 에서 New Project → 저장소 Import → Deploy.
3. 환경변수는 필요 없습니다.

## 참고

- `xlsx` npm 패키지(0.18.5)는 파일을 **읽을 때** 관련 보안 권고가 있습니다. 이 프로젝트는 쓰기만 해서 영향이 작지만, 최신 버전을 쓰려면 SheetJS 공식 안내대로 `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` 로 설치하세요.
- `AGENTS.md` / `CLAUDE.md` 는 Next.js가 만든 AI 코딩 도구용 안내 파일입니다. Claude Code 등으로 이어서 개발할 때 그대로 두세요.
