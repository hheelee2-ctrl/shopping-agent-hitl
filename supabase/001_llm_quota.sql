-- Claude 해석 호출 횟수. Supabase SQL Editor에서 한 번 실행한다.
-- 서버(api/parse.ts)만 service_role 키로 hit_quota를 부른다. 브라우저(anon) 키로는 읽지도 부르지도 못한다.

create table if not exists public.llm_quota (
  key text not null,              -- 'client:<IP 해시 16자>' 또는 'all'
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

alter table public.llm_quota enable row level security; -- 정책 없음: anon·authenticated 접근 불가

create or replace function public.hit_quota(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into llm_quota (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = llm_quota.hits + 1
  returning hits into n;
  -- 이틀 지난 구간은 지운다
  delete from llm_quota where window_start < now() - interval '2 days';
  return n <= p_limit;
end;
$$;

revoke execute on function public.hit_quota(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_quota(text, int, int) to service_role;
