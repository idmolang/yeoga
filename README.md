# 여가 — 다같이 여행가자!

"여가"(여행가자의 줄임말)는 단톡방에서 날짜·예산을 맞추다 흐지부지되는 여행을 끝까지 데려가는 웹 서비스입니다.

1. **모으기**: 방장이 방을 만들고 초대 링크를 단톡방에 보낸다.
2. **조율**: 참여자가 가능한 날짜·예산·스타일·여행지에 답하면 자동으로 집계되고, 방장이 추천값으로 확정한다.
3. **준비**: 확정과 동시에 할 일·일정·예산·준비물이 만들어지고, 다 같이 고치고 정산한다.

기능 요구사항은 [FRD.md](FRD.md)에 있습니다. 혼자 계획하던 v0.1(localStorage) 버전은 Git 태그 `v0.1`로 남아 있습니다 (`git checkout v0.1`).

## 실행 방법

```bash
npm install
npm run dev
```

`.env.local`에 아래 두 값이 필요합니다 (Supabase 대시보드 → Project Settings → API Keys).

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

처음 한 번은 Supabase 설정이 필요합니다 → [Supabase 설정](#supabase-설정)

## 기술 스택

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres·Auth·Realtime) · `@supabase/ssr` · SheetJS(xlsx)

## 폴더 구조

```
supabase/
└─ schema.sql              # 테이블·RLS 정책·RPC 함수·Realtime 등록 (SQL Editor에 붙여넣기)
src/
├─ proxy.ts                # 요청마다 로그인 세션 갱신 (Next 16의 middleware)
├─ app/
│  ├─ page.tsx             # 메인: 소개 / 내가 만든 방·참여한 방 (F-04)
│  ├─ login/page.tsx       # 구글·카카오 로그인 (?next= 로 돌아갈 주소)
│  ├─ auth/callback/       # OAuth 콜백: code → 세션, next로 복귀
│  ├─ auth/signout/        # 로그아웃 (POST)
│  ├─ new/page.tsx         # 방 만들기 (F-01)
│  └─ t/[code]/page.tsx    # 초대 링크: 로그인 → 참여하기 → 여행방
├─ components/
│  ├─ styles.ts            # 디자인 체계 (글자·여백·카드·버튼·배지)
│  ├─ CreateTripForm.tsx   # 방 만들기 4단계 폼
│  ├─ room/                # 여행방: 헤더·단계 표시·초대·참여자·응답·대시보드·확정
│  └─ prep/                # 준비 탭: 할 일·일정·예산·정산·준비물·예약 바로가기
├─ data/
│  ├─ rules.json           # 계획 자동 생성 규칙 (할 일·준비물·예산 비율·공용 준비물)
│  ├─ destinations.json    # 여행지 추천 후보 20곳 + 항공 검색용 도시 코드
│  └─ booking-sites.ts     # 예약 사이트 목록·검색 URL 형식 (이 파일만 고치면 됨)
├─ lib/
│  ├─ supabase/            # 서버·브라우저 Supabase 클라이언트
│  ├─ db.ts                # DB 읽기·쓰기 함수 모음 (F-17)
│  ├─ coordinate.ts        # 조율 규칙: 날짜·예산·스타일·여행지 집계와 추천값 (FRD 8장)
│  ├─ generate.ts          # 확정값 → 계획 뼈대 (FRD 9장)
│  ├─ schedule.ts          # 출발·귀가 시간대 규칙과 재배치
│  ├─ settle.ts            # 정산: 누가 누구에게 얼마 (FRD 10장)
│  ├─ booking.ts           # 예약 바로가기 링크 고르기 (FRD 11장)
│  ├─ excel.ts             # 단계별 엑셀 내보내기 (FRD 13장)
│  ├─ validation.ts        # 한국어 폼 검증 훅 (setCustomValidity)
│  └─ recommend.ts, sort.ts, budget.ts, stage.ts, date.ts, share.ts, auth.ts
└─ types/                  # db.ts (테이블 행 타입), trip.ts (라벨)
```

## FRD 기능 구현 현황

| ID | 단계 | 기능 | 상태 | 위치 |
| --- | --- | --- | --- | --- |
| F-01 | 모으기 | 방 만들기 (단계형) | 완료 | `components/CreateTripForm.tsx` |
| F-02 | 모으기 | 초대 공유 | 완료 (링크·문구 복사, 공유 버튼 배열 구조) | `components/room/InvitePanel.tsx` |
| F-03 | 모으기 | 참여하기 | 완료 (로그인 후 원래 링크로 복귀) | `app/t/[code]/page.tsx`, `components/room/JoinCard.tsx` |
| F-04 | 모으기 | 내 여행 목록 | 완료 (단계·D-day) | `app/page.tsx` |
| F-05 | 조율 | 조율 응답 | 완료 (마감 전까지 수정) | `components/room/ResponseForm.tsx` |
| F-06 | 조율 | 조율 대시보드 | 완료 | `components/room/Dashboard.tsx`, `lib/coordinate.ts` |
| F-07 | 조율 | 여행지 후보 추천 | 완료 | `lib/recommend.ts` |
| F-08 | 조율 | 확정 (방장) | 완료 | `components/room/ConfirmForm.tsx` |
| F-09 | 준비 | 계획 자동 생성 | 완료 (출발·귀가 시간 반영) | `lib/generate.ts`, `lib/schedule.ts` |
| F-10 | 준비 | 할 일 | 완료 (담당자 배정) | `components/prep/TodoTab.tsx` |
| F-11 | 준비 | 일정 | 완료 (의견·좋아요, 예약하기 자동 추가, 시간 변경 재배치) | `components/prep/ScheduleTab.tsx` |
| F-12 | 준비 | 예산·지출 | 완료 (결제한 사람·함께 쓴 사람) | `components/prep/BudgetTab.tsx` |
| F-13 | 준비 | 정산 | 완료 (송금 완료 체크) | `components/prep/SettleTab.tsx`, `lib/settle.ts` |
| F-14 | 준비 | 준비물 | 완료 (공용/개인) | `components/prep/PackingTab.tsx` |
| F-15 | 준비 | 예약 사이트 바로가기 | 완료 | `data/booking-sites.ts`, `components/prep/BookingLinks.tsx` |
| F-16 | 공통 | 엑셀 다운로드 | 완료 (조율 4시트 / 준비 9시트) | `lib/excel.ts` |
| F-17 | 공통 | 데이터 저장 | 완료 (Supabase + RLS + Realtime) | `lib/db.ts`, `supabase/schema.sql` |
| F-18 | 공통 | 로그인 | 완료 (구글·카카오) | `app/login`, `app/auth`, `proxy.ts` |

## Supabase 설정

### 1. 테이블 만들기

1. Supabase 대시보드 → 왼쪽 **SQL Editor** → **New query**
2. `supabase/schema.sql` 내용을 전부 붙여넣고 **Run**
3. 왼쪽 **Table Editor**에 `trips`, `members` 등 12개 테이블이 보이면 성공

여러 번 실행해도 안전합니다 (스키마를 고친 뒤 다시 실행하면 됨).

### 2. 로그인 주소 등록

**Authentication → URL Configuration**
- Site URL: `http://localhost:3000` (배포 후에는 배포 주소)
- Redirect URLs에 추가: `http://localhost:3000/auth/callback`, (배포 후) `https://<배포주소>/auth/callback`

### 3. 구글·카카오 로그인

단계별 방법은 아래 순서대로 진행합니다.

**구글**
1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 만들기
2. **APIs & Services → OAuth consent screen**: User type "External", 앱 이름 "여가", 지원 이메일 입력 → 저장 (테스트 중에는 Test users에 본인 계정 추가)
3. **Credentials → Create credentials → OAuth client ID** → 유형 "Web application"
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
4. 만들어진 Client ID / Client secret 복사
5. Supabase **Authentication → Sign In / Providers → Google** → Enable, Client ID·Secret 붙여넣기 → Save

**카카오**
1. [Kakao Developers](https://developers.kakao.com/) → 내 애플리케이션 → 애플리케이션 추가 (앱 이름 "여가")
2. **앱 설정 → 플랫폼 키 → REST API 키** 확인 (이것이 Client ID)
3. 같은 REST API 키 설정에서 **카카오 로그인 리다이렉트 URI**에 `https://<project-ref>.supabase.co/auth/v1/callback` 추가, **클라이언트 시크릿** 코드 확인·활성화
4. **제품 설정 → 카카오 로그인 → 사용 설정** ON
5. **동의항목**: 닉네임(`profile_nickname`), 프로필 사진(`profile_image`) 설정.
   Supabase는 카카오 로그인 때 `account_email`도 항상 요청하므로, **앱 설정 → 일반에서 "개인 개발자 비즈 앱"으로 전환**한 뒤 카카오계정(이메일)을 **선택 동의**로 둡니다. (이 설정이 없으면 카카오가 KOE205 오류를 낼 수 있습니다)
6. Supabase **Authentication → Sign In / Providers → Kakao** → Enable, REST API 키·클라이언트 시크릿 입력, **Allow users without an email** ON → Save

## Vercel 배포

1. GitHub에 push → vercel.com에서 New Project → 저장소 Import
2. **Environment Variables**에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 추가 → Deploy
3. 배포 주소(`https://<프로젝트>.vercel.app`)를 Supabase **URL Configuration**의 Site URL·Redirect URLs(`/auth/callback`)에 추가

구글·카카오 콘솔의 리다이렉트 URI는 Supabase 주소(`…supabase.co/auth/v1/callback`) 하나라서 배포할 때 바꿀 필요가 없습니다.

## 규칙 바꾸기

- 계획 자동 생성: `src/data/rules.json` (`when`: `always`, `domestic`, `overseas`, `style:food`, `nights>=3`)
- 여행지 추천 후보: `src/data/destinations.json` (`baseCost` 1인 왕복 교통비, `nightCost` 1인 1박 비용, `airport` 항공 검색용 도시 코드)
- 예약 사이트: `src/data/booking-sites.ts` (검색 URL은 실제로 확인한 형식만 `search`에 둡니다)

## 참고

- `xlsx` npm 패키지(0.18.5)는 파일을 **읽을 때** 관련 보안 권고가 있습니다. 이 프로젝트는 쓰기만 해서 영향이 작지만, 최신 버전을 쓰려면 SheetJS 공식 안내대로 `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` 로 설치하세요.
- `AGENTS.md` / `CLAUDE.md` 는 Next.js가 만든 AI 코딩 도구용 안내 파일입니다.
