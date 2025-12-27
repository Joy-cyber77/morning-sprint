-- Clerk ↔ Supabase (RLS) example
-- 참고: https://clerk.com/docs/guides/development/integrations/databases/supabase

-- 1) tasks 테이블 생성: user_id는 Clerk user id(sub)로 기본값 설정
create table if not exists public.tasks (
  id serial primary key,
  name text not null,
  user_id text not null default auth.jwt()->>'sub'
);

-- 2) RLS 활성화
alter table public.tasks enable row level security;

-- 3) 정책: 본인 task만 조회 가능
drop policy if exists "User can view their own tasks" on public.tasks;
create policy "User can view their own tasks"
on public.tasks
for select
to authenticated
using ((select auth.jwt()->>'sub') = (user_id)::text);

-- 4) 정책: 본인 task만 insert 가능
drop policy if exists "Users must insert their own tasks" on public.tasks;
create policy "Users must insert their own tasks"
on public.tasks
as permissive
for insert
to authenticated
with check ((select auth.jwt()->>'sub') = (user_id)::text);


