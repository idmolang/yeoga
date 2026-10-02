-- 회원 기능 마이그레이션 (2026-10): 온보딩 프로필 + 회원 탈퇴
-- 이미 schema.sql 을 실행해 둔 DB에 한 번 실행한다. 여러 번 실행해도 안전하다.
-- (새 DB라면 최신 schema.sql 만 실행하면 되고 이 파일은 필요 없다)
--
-- 바뀌는 것
--   1) profiles 테이블: 첫 로그인 때 정한 이름·개인정보 동의 (행이 있으면 온보딩 완료)
--   2) members.withdrawn: 탈퇴한 사용자 표시. 이름 중복 금지는 탈퇴 행을 빼고 적용
--   3) members.user_id, expenses.paid_by, settlements.from_id/to_id 의 auth.users FK 제거
--      → 탈퇴해도 지출·정산 기록이 "탈퇴한 사용자"로 남는다
--   4) delete_account() 함수: 방장 위임/삭제 + 내 데이터 삭제 + 계정 삭제

-- 1) profiles
-- 회원 프로필: 첫 로그인 때 "여가에서 쓸 이름"과 개인정보 안내 동의를 받아 만든다.
-- 행이 있으면 온보딩을 마친 사람이다. 받는 정보는 닉네임·프로필 사진뿐 (/privacy)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 10),
  avatar_url text check (avatar_url ~ '^https://'),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

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


-- 2) 탈퇴한 사용자 표시
alter table public.members add column if not exists withdrawn boolean not null default false;
alter table public.members drop constraint if exists members_trip_id_display_name_key;
create unique index if not exists members_unique_name on public.members (trip_id, display_name)
  where not withdrawn;

-- 3) FK 제거 (탈퇴한 사람의 uuid 를 계속 가리킬 수 있게)
alter table public.members drop constraint if exists members_user_id_fkey;
alter table public.expenses drop constraint if exists expenses_paid_by_fkey;
alter table public.settlements drop constraint if exists settlements_from_id_fkey;
alter table public.settlements drop constraint if exists settlements_to_id_fkey;

-- 참여하기: 같은 이름 검사에서 탈퇴한 사용자는 뺀다 (schema.sql 의 join_trip 과 같다)
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


-- 4) 회원 탈퇴
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

revoke execute on function public.delete_account(jsonb) from public, anon;
grant execute on function public.delete_account(jsonb) to authenticated;
