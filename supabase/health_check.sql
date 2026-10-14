-- /api/health 가 호출하는 헬스체크 함수.
-- 테이블을 전혀 건드리지 않고 1만 반환하므로, RLS나 데이터 노출과 무관하게
-- anon(publishable 키)에게 공개해도 안전하다. Supabase 대시보드의 SQL Editor에서
-- 그대로 실행하면 된다.

create or replace function public.health_check()
returns int
language sql
stable
as $$
  select 1;
$$;

grant execute on function public.health_check() to anon;
