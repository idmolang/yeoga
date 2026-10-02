-- 여가 DB 스키마 (Supabase SQL Editor에 통째로 붙여넣고 Run)
-- 여러 번 실행해도 되도록 if not exists / or replace / drop policy if exists 로 작성했다.
--
-- 권한 모델 (FRD 5장)
--   사람 구분: Supabase Auth 로그인 사용자 = auth.uid()
--   방장:      trips.host_id = auth.uid()
--   참여자:    members 테이블에 (trip_id, user_id) 행이 있는 사람
--   - 같은 방 참여자만 그 방 데이터를 읽고 쓴다 (RLS)
--   - 응답 마감·확정·방 삭제·확정값 수정은 방장만
--   - 방 만들기, 초대 링크 미리보기, 참여하기, 확정은 아래 함수(RPC)로만 한다.
--     함수는 security definer 라서 secret 키 없이도 필요한 만큼만 권한을 넘어선다.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── 테이블 ─────────────────────────

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  -- 초대 링크 /t/{invite_code}. 96비트 무작위 값이라 추측할 수 없다
  invite_code text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  region text not null check (region in ('domestic', 'overseas')),
  window_start date not null,
  window_end date not null,
  destination_fixed boolean not null default false,
  response_deadline date not null,
  -- collecting: 참여·응답 받는 중 / closed: 응답 마감, 확정 대기 / confirmed: 준비 단계
  status text not null default 'collecting' check (status in ('collecting', 'closed', 'confirmed')),
  -- 확정값 (확정 전에는 비어 있음. destination 은 여행지를 정해 둔 방이면 처음부터 채워짐)
  start_date date,
  end_date date,
  depart_time text check (depart_time ~ '^\d{2}:\d{2}$'),
  return_time text check (return_time ~ '^\d{2}:\d{2}$'),
  destination text check (char_length(destination) <= 30),
  budget_per_person integer check (budget_per_person >= 50000),
  styles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end >= window_start and window_end - window_start <= 90),
  check (start_date is null or (end_date >= start_date and end_date - start_date <= 30))
);

create table if not exists public.members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- auth.users FK 를 걸지 않는다: 탈퇴해도 지출·정산 기록이 이 사람을 가리키므로 행을 남겨야 한다
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 10),
  going boolean not null default true, -- 확정 때 참여 인원으로 고른 사람
  withdrawn boolean not null default false, -- 탈퇴한 사용자 (이름은 '탈퇴한 사용자'로 바뀐다)
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- 같은 방 안에서 표시 이름 중복 금지 (탈퇴한 사용자는 여럿일 수 있다)
create unique index if not exists members_unique_name on public.members (trip_id, display_name)
  where not withdrawn;

-- 회원 프로필: 첫 로그인 때 "여가에서 쓸 이름"과 개인정보 안내 동의를 받아 만든다.
-- 행이 있으면 온보딩을 마친 사람이다. 받는 정보는 닉네임·프로필 사진뿐 (/privacy)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 10),
  avatar_url text check (avatar_url ~ '^https://'),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  available_dates date[] not null check (cardinality(available_dates) >= 1),
  budget integer not null check (budget between 50000 and 5000000),
  styles text[] not null check (cardinality(styles) >= 1),
  depart_slot text not null default 'any' check (depart_slot in ('morning', 'afternoon', 'evening', 'any')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.destination_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  proposed_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (trip_id, name)
);

create table if not exists public.destination_votes (
  option_id uuid not null references public.destination_options (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (option_id, user_id)
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  due_date date,
  assignee_id uuid references auth.users (id) on delete set null,
  done boolean not null default false,
  urgent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('morning', 'afternoon', 'evening')),
  time text not null default '' check (time = '' or time ~ '^\d{2}:\d{2}$'),
  place text not null default '' check (char_length(place) <= 50),
  activity text not null default '' check (char_length(activity) <= 100),
  cost integer not null default 0 check (cost >= 0),
  needs_booking boolean not null default false,
  memo text not null default '' check (char_length(memo) <= 300),
  -- 자동으로 넣은 "출발·이동"/"귀가" 슬롯 표시 (출발·귀가 시간을 바꿀 때 다시 배치)
  marker text check (marker in ('depart', 'return')),
  created_at timestamptz not null default now()
);

create table if not exists public.slot_comments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.schedule_slots (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.slot_likes (
  slot_id uuid not null references public.schedule_slots (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (slot_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 30),
  category text not null check (category in ('transport', 'lodging', 'food', 'tour', 'etc')),
  amount integer not null check (amount >= 1),
  kind text not null check (kind in ('plan', 'actual')),
  paid_by uuid, -- 탈퇴한 사람도 가리킬 수 있게 FK 없음 (members 의 withdrawn 행으로 표시)
  shared_with uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  check (kind = 'plan' or (paid_by is not null and cardinality(shared_with) >= 1))
);

-- 정산 결과 중 "송금 완료"로 체크한 것. 지출이 바뀌어 계산이 달라지면 자연히 체크가 풀린다
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_id uuid not null, -- FK 없음: 탈퇴한 사람도 가리킬 수 있게
  to_id uuid not null,
  amount integer not null check (amount >= 1),
  done boolean not null default false,
  unique (trip_id, from_id, to_id, amount)
);

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  category text not null check (category in ('필수품', '의류', '세면', '전자기기', '기타')),
  shared boolean not null default false, -- true: 공용(한 개만 있으면 됨), false: 개인
  owner_id uuid references auth.users (id) on delete cascade, -- 개인 준비물의 주인
  packed boolean not null default false,
  created_at timestamptz not null default now(),
  check (shared or owner_id is not null)
);

-- 같은 목록(공용 목록 / 한 사람의 개인 목록) 안에서 이름 중복 금지 (공백·대소문자 무시)
create unique index if not exists packing_items_unique_name on public.packing_items (
  trip_id,
  coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(replace(name, ' ', ''))
);

create index if not exists members_user_idx on public.members (user_id);
create index if not exists todos_trip_idx on public.todos (trip_id);
create index if not exists schedule_slots_trip_idx on public.schedule_slots (trip_id);
create index if not exists slot_comments_trip_idx on public.slot_comments (trip_id);
create index if not exists slot_likes_trip_idx on public.slot_likes (trip_id);
create index if not exists expenses_trip_idx on public.expenses (trip_id);
create index if not exists settlements_trip_idx on public.settlements (trip_id);
create index if not exists packing_items_trip_idx on public.packing_items (trip_id);
create index if not exists destination_options_trip_idx on public.destination_options (trip_id);
create index if not exists destination_votes_trip_idx on public.destination_votes (trip_id);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();
drop trigger if exists responses_touch on public.responses;
create trigger responses_touch before update on public.responses
  for each row execute function public.touch_updated_at();

-- ───────────────────────── 권한 확인 함수 ─────────────────────────
-- 정책 안에서 members 를 다시 조회하면 RLS가 무한 반복되므로 security definer 함수로 확인한다.

create or replace function public.is_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members where trip_id = p_trip and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_host(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trips where id = p_trip and host_id = (select auth.uid())
  );
$$;

-- 응답을 받을 수 있는 상태인가: 모으는 중이고 마감일(한국 날짜 기준)이 지나지 않음
create or replace function public.responses_open(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trips
    where id = p_trip
      and status = 'collecting'
      and response_deadline >= (now() at time zone 'Asia/Seoul')::date
  );
$$;

-- ───────────────────────── RLS 정책 ─────────────────────────

alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.responses enable row level security;
alter table public.destination_options enable row level security;
alter table public.destination_votes enable row level security;
alter table public.todos enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.slot_comments enable row level security;
alter table public.slot_likes enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.packing_items enable row level security;

-- trips: 참여자는 읽기, 방장만 수정(마감·확정값)·삭제. 만들기는 create_trip() 로만
drop policy if exists "trips: 참여자 읽기" on public.trips;
create policy "trips: 참여자 읽기" on public.trips for select to authenticated
  using (public.is_member(id));
drop policy if exists "trips: 방장 수정" on public.trips;
create policy "trips: 방장 수정" on public.trips for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
drop policy if exists "trips: 방장 삭제" on public.trips;
create policy "trips: 방장 삭제" on public.trips for delete to authenticated
  using (host_id = (select auth.uid()));

-- profiles: 내 프로필만 읽고 만들고 이름 수정. 삭제는 탈퇴 함수(delete_account)가 한다
drop policy if exists "profiles: 내 프로필 읽기" on public.profiles;
create policy "profiles: 내 프로필 읽기" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "profiles: 내 프로필 만들기" on public.profiles;
create policy "profiles: 내 프로필 만들기" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "profiles: 내 이름 수정" on public.profiles;
create policy "profiles: 내 이름 수정" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

-- members: 같은 방끼리 읽기, 자기 표시 이름만 수정, 나가기는 본인(방장 제외) 또는 방장이 내보내기
drop policy if exists "members: 같은 방 읽기" on public.members;
create policy "members: 같은 방 읽기" on public.members for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "members: 내 이름 수정" on public.members;
create policy "members: 내 이름 수정" on public.members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "members: 나가기·내보내기" on public.members;
create policy "members: 나가기·내보내기" on public.members for delete to authenticated
  using (
    (user_id = (select auth.uid()) and not public.is_host(trip_id))
    or (public.is_host(trip_id) and user_id <> (select auth.uid()))
  );
-- 참여자가 바꿀 수 있는 열은 display_name 뿐 (going 은 확정 때 방장이 함수로 정함)
revoke update on public.members from anon, authenticated;
grant update (display_name) on public.members to authenticated;

-- responses: 같은 방 읽기, 내 응답만 쓰기 (마감 전까지)
drop policy if exists "responses: 같은 방 읽기" on public.responses;
create policy "responses: 같은 방 읽기" on public.responses for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "responses: 내 응답 작성" on public.responses;
create policy "responses: 내 응답 작성" on public.responses for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(trip_id) and public.responses_open(trip_id));
drop policy if exists "responses: 내 응답 수정" on public.responses;
create policy "responses: 내 응답 수정" on public.responses for update to authenticated
  using (user_id = (select auth.uid()) and public.responses_open(trip_id))
  with check (user_id = (select auth.uid()) and public.responses_open(trip_id));
drop policy if exists "responses: 내 응답 삭제" on public.responses;
create policy "responses: 내 응답 삭제" on public.responses for delete to authenticated
  using (user_id = (select auth.uid()) and public.responses_open(trip_id));

-- destination_options: 같은 방 읽기, 마감 전 제안, 제안한 사람·방장이 삭제
drop policy if exists "options: 같은 방 읽기" on public.destination_options;
create policy "options: 같은 방 읽기" on public.destination_options for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "options: 제안" on public.destination_options;
create policy "options: 제안" on public.destination_options for insert to authenticated
  with check (
    proposed_by = (select auth.uid()) and public.is_member(trip_id) and public.responses_open(trip_id)
  );
drop policy if exists "options: 삭제" on public.destination_options;
create policy "options: 삭제" on public.destination_options for delete to authenticated
  using (
    public.is_host(trip_id)
    or (proposed_by = (select auth.uid()) and public.responses_open(trip_id))
  );

-- destination_votes: 같은 방 읽기, 마감 전 내 투표만 넣고 빼기 (후보는 같은 방 것만)
drop policy if exists "votes: 같은 방 읽기" on public.destination_votes;
create policy "votes: 같은 방 읽기" on public.destination_votes for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "votes: 투표" on public.destination_votes;
create policy "votes: 투표" on public.destination_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_member(trip_id)
    and public.responses_open(trip_id)
    and exists (
      select 1 from public.destination_options o
      where o.id = option_id and o.trip_id = destination_votes.trip_id
    )
  );
drop policy if exists "votes: 투표 취소" on public.destination_votes;
create policy "votes: 투표 취소" on public.destination_votes for delete to authenticated
  using (user_id = (select auth.uid()) and public.responses_open(trip_id));

-- 준비 단계 테이블: 같은 방 참여자 누구나 읽기·추가·수정·삭제 (함께 편집)
do $$
declare t text;
begin
  foreach t in array array['todos', 'schedule_slots', 'expenses', 'settlements', 'packing_items'] loop
    execute format('drop policy if exists "%1$s: 같은 방 편집" on public.%1$I', t);
    execute format(
      'create policy "%1$s: 같은 방 편집" on public.%1$I for all to authenticated
         using (public.is_member(trip_id)) with check (public.is_member(trip_id))', t);
  end loop;
end $$;

-- 좋아요는 내 것만 누르고 취소
drop policy if exists "slot_likes: 같은 방 읽기" on public.slot_likes;
create policy "slot_likes: 같은 방 읽기" on public.slot_likes for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "slot_likes: 내 좋아요" on public.slot_likes;
create policy "slot_likes: 내 좋아요" on public.slot_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(trip_id));
drop policy if exists "slot_likes: 내 좋아요 취소" on public.slot_likes;
create policy "slot_likes: 내 좋아요 취소" on public.slot_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- 의견: 같은 방 읽기·쓰기, 내 의견만 삭제
drop policy if exists "comments: 같은 방 읽기" on public.slot_comments;
create policy "comments: 같은 방 읽기" on public.slot_comments for select to authenticated
  using (public.is_member(trip_id));
drop policy if exists "comments: 쓰기" on public.slot_comments;
create policy "comments: 쓰기" on public.slot_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(trip_id));
drop policy if exists "comments: 내 의견 삭제" on public.slot_comments;
create policy "comments: 내 의견 삭제" on public.slot_comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────────────────── 함수 (RPC) ─────────────────────────

-- 방 만들기: 방 + 방장 참여자 행 + 여행지 후보를 한 번에
create or replace function public.create_trip(
  p_name text,
  p_host_name text,
  p_region text,
  p_window_start date,
  p_window_end date,
  p_destination_fixed boolean,
  p_destination text,
  p_candidates text[],
  p_deadline date
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_trip public.trips;
  v_name text;
begin
  if v_uid is null then
    raise exception '로그인이 필요해요' using errcode = '42501';
  end if;
  if p_window_start < v_today then
    raise exception '후보 시기는 오늘 이후여야 해요';
  end if;
  if p_deadline < v_today or p_deadline > p_window_start then
    raise exception '응답 마감일은 오늘부터 후보 시기 시작일 사이여야 해요';
  end if;
  if coalesce(cardinality(p_candidates), 0) > 5 then
    raise exception '여행지 후보는 5개까지예요';
  end if;
  if p_destination_fixed and coalesce(trim(p_destination), '') = '' then
    raise exception '여행지를 입력해 주세요';
  end if;

  insert into public.trips (host_id, name, region, window_start, window_end, destination_fixed, destination, response_deadline)
  values (
    v_uid, trim(p_name), p_region, p_window_start, p_window_end, p_destination_fixed,
    case when p_destination_fixed then trim(p_destination) end, p_deadline
  )
  returning * into v_trip;

  insert into public.members (trip_id, user_id, display_name)
  values (v_trip.id, v_uid, trim(p_host_name));

  if not p_destination_fixed then
    foreach v_name in array coalesce(p_candidates, '{}') loop
      if trim(v_name) <> '' then
        insert into public.destination_options (trip_id, name, proposed_by)
        values (v_trip.id, trim(v_name), v_uid)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_trip.invite_code;
end $$;

-- 초대 링크 미리보기: 참여 전이라도 초대코드를 아는 사람에게 방 이름 정도만 보여준다
create or replace function public.trip_preview(p_code text)
returns table (
  id uuid,
  name text,
  host_name text,
  region text,
  window_start date,
  window_end date,
  status text,
  member_count integer,
  is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select
    t.id, t.name,
    (select m.display_name from public.members m where m.trip_id = t.id and m.user_id = t.host_id),
    t.region, t.window_start, t.window_end, t.status,
    (select count(*)::int from public.members m where m.trip_id = t.id),
    exists (select 1 from public.members m where m.trip_id = t.id and m.user_id = (select auth.uid()))
  from public.trips t
  where t.invite_code = p_code and (select auth.uid()) is not null;
$$;

-- 참여하기: 초대코드 + 표시 이름. 이미 참여했으면 그대로 trip id 를 돌려준다
create or replace function public.join_trip(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_trip uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요해요' using errcode = '42501';
  end if;
  select id into v_trip from public.trips where invite_code = p_code;
  if v_trip is null then
    raise exception '초대 링크가 올바르지 않아요' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.members where trip_id = v_trip and user_id = v_uid) then
    return v_trip;
  end if;
  if exists (select 1 from public.members where trip_id = v_trip and display_name = trim(p_display_name) and not withdrawn) then
    raise exception '이미 같은 이름의 참여자가 있어요' using errcode = '23505';
  end if;
  insert into public.members (trip_id, user_id, display_name) values (v_trip, v_uid, trim(p_display_name));
  return v_trip;
end $$;

-- 확정 (방장만): 확정값 저장 + 참여 인원 표시 + 자동 생성한 계획 뼈대를 한 트랜잭션으로 저장
-- p_plan 은 브라우저에서 generate.ts 로 만든 JSON
create or replace function public.confirm_trip(p_trip uuid, p_plan jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_host(p_trip) then
    raise exception '방장만 확정할 수 있어요' using errcode = '42501';
  end if;
  if (select status from public.trips where id = p_trip) = 'confirmed' then
    raise exception '이미 확정된 여행이에요';
  end if;
  if jsonb_array_length(coalesce(p_plan -> 'going', '[]')) = 0 then
    raise exception '참여 인원을 1명 이상 골라 주세요';
  end if;

  update public.trips set
    status = 'confirmed',
    start_date = (p_plan ->> 'start_date')::date,
    end_date = (p_plan ->> 'end_date')::date,
    depart_time = nullif(p_plan ->> 'depart_time', ''),
    return_time = nullif(p_plan ->> 'return_time', ''),
    destination = trim(p_plan ->> 'destination'),
    budget_per_person = (p_plan ->> 'budget_per_person')::int,
    styles = array(select jsonb_array_elements_text(p_plan -> 'styles'))
  where id = p_trip;

  update public.members
  set going = user_id::text in (select jsonb_array_elements_text(p_plan -> 'going'))
  where trip_id = p_trip;

  -- 혹시 남아 있는 계획이 있으면 지우고 새로 만든다
  delete from public.todos where trip_id = p_trip;
  delete from public.schedule_slots where trip_id = p_trip;
  delete from public.expenses where trip_id = p_trip;
  delete from public.packing_items where trip_id = p_trip;

  insert into public.todos (trip_id, title, due_date, urgent)
  select p_trip, x.title, x.due_date, x.urgent
  from jsonb_to_recordset(p_plan -> 'todos') as x (title text, due_date date, urgent boolean);

  insert into public.schedule_slots (trip_id, date, slot, time, activity, marker)
  select p_trip, x.date, x.slot, coalesce(x.time, ''), coalesce(x.activity, ''), x.marker
  from jsonb_to_recordset(p_plan -> 'slots') as x (date date, slot text, time text, activity text, marker text);

  insert into public.expenses (trip_id, title, category, amount, kind)
  select p_trip, x.title, x.category, x.amount, 'plan'
  from jsonb_to_recordset(p_plan -> 'budget') as x (title text, category text, amount int);

  insert into public.packing_items (trip_id, name, category, shared, owner_id)
  select p_trip, x.name, x.category, x.shared, x.owner_id
  from jsonb_to_recordset(p_plan -> 'packing') as x (name text, category text, shared boolean, owner_id uuid)
  on conflict do nothing;
end $$;

-- 회원 탈퇴: 로그인한 본인 계정을 지운다.
--   p_hosted: 내가 방장인 방마다 처리 방법. {"<trip_id>": "delete" | "<새 방장 user_id>"}
--   - 방장인 방: 삭제하거나, 같은 방의 다른 참여자에게 방장을 넘긴다 (빠짐없이 정해야 함)
--   - 내 응답·여행지 투표·의견·좋아요·개인 준비물은 삭제
--   - 지출·정산 기록에 이름이 나오는 방은 참여자 행을 '탈퇴한 사용자'로 남기고, 아니면 참여자 행도 삭제
create or replace function public.delete_account(p_hosted jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_trip record;
  v_choice text;
begin
  if v_uid is null then
    raise exception '로그인이 필요해요' using errcode = '42501';
  end if;

  for v_trip in select id, name from public.trips where host_id = v_uid loop
    v_choice := p_hosted ->> v_trip.id::text;
    if v_choice is null then
      raise exception '"%" 방을 삭제할지, 다른 참여자에게 방장을 넘길지 정해 주세요', v_trip.name;
    elsif v_choice = 'delete' then
      delete from public.trips where id = v_trip.id;
    else
      if not exists (
        select 1 from public.members
        where trip_id = v_trip.id and user_id::text = v_choice and user_id <> v_uid and not withdrawn
      ) then
        raise exception '"%" 방의 새 방장은 같은 방의 다른 참여자여야 해요', v_trip.name;
      end if;
      update public.trips set host_id = v_choice::uuid where id = v_trip.id;
    end if;
  end loop;

  delete from public.responses where user_id = v_uid;
  delete from public.destination_votes where user_id = v_uid;
  delete from public.slot_comments where user_id = v_uid;
  delete from public.slot_likes where user_id = v_uid;
  delete from public.packing_items where owner_id = v_uid;

  -- 지출·정산에 이름이 남는 방은 '탈퇴한 사용자'로 남기고, 아니면 참여자 행을 지운다
  update public.members m
  set display_name = '탈퇴한 사용자', withdrawn = true
  where m.user_id = v_uid and (
    exists (
      select 1 from public.expenses e
      where e.trip_id = m.trip_id and (e.paid_by = v_uid or v_uid = any (e.shared_with))
    )
    or exists (
      select 1 from public.settlements s
      where s.trip_id = m.trip_id and (s.from_id = v_uid or s.to_id = v_uid)
    )
  );
  delete from public.members where user_id = v_uid and not withdrawn;

  -- 프로필 등 auth.users 를 가리키는 나머지는 cascade 로 함께 지워진다
  delete from auth.users where id = v_uid;
end $$;

-- 함수 실행 권한: 로그인한 사용자만
revoke execute on function public.create_trip(text, text, text, date, date, boolean, text, text[], date) from public, anon;
revoke execute on function public.trip_preview(text) from public, anon;
revoke execute on function public.join_trip(text, text) from public, anon;
revoke execute on function public.confirm_trip(uuid, jsonb) from public, anon;
revoke execute on function public.delete_account(jsonb) from public, anon;
grant execute on function public.create_trip(text, text, text, date, date, boolean, text, text[], date) to authenticated;
grant execute on function public.trip_preview(text) to authenticated;
grant execute on function public.join_trip(text, text) to authenticated;
grant execute on function public.confirm_trip(uuid, jsonb) to authenticated;
grant execute on function public.delete_account(jsonb) to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
-- 다른 참여자의 변경을 바로 받기 위해 Realtime 발행 목록에 추가 (이미 있으면 건너뜀)
do $$
declare t text;
begin
  foreach t in array array[
    'trips', 'members', 'responses', 'destination_options', 'destination_votes', 'todos',
    'schedule_slots', 'slot_comments', 'slot_likes', 'expenses', 'settlements', 'packing_items'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
