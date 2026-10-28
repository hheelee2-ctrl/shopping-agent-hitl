-- 가격 대기 사전 승인 기록. Supabase SQL Editor에서 한 번 실행한다.
-- 로그인한 사람만, 자기 행만 만들고 읽고 고칠 수 있다(지우기는 막음: 맡긴 기록은 남긴다).

create table if not exists public.mandates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  size text not null,
  max_total int not null check (max_total > 0),
  domestic_only boolean not null,
  days int not null check (days between 1 and 90),
  status text not null default 'active' check (status in ('active', 'used', 'ended')),
  order_id text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.mandates enable row level security;

create policy "own mandates: read" on public.mandates for select to authenticated using (user_id = auth.uid());
create policy "own mandates: create" on public.mandates for insert to authenticated with check (user_id = auth.uid());
create policy "own mandates: close" on public.mandates for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
