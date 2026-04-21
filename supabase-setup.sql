-- ================================================================
-- Supabase 초기 셋업 SQL
-- Supabase 대시보드 → SQL Editor 에서 실행하세요
-- ================================================================

-- ── 0. 관리자 확인 헬퍼 함수 (security definer) ─────────────────
-- RLS 정책에서 profiles 테이블을 직접 참조하면
-- profiles 자신의 RLS가 다시 평가되어 무한 재귀가 발생할 수 있습니다.
-- SECURITY DEFINER 함수는 함수 정의자 권한으로 실행되므로 RLS를 우회합니다.
create or replace function public.is_admin()
returns boolean
language sql
security definer          -- RLS 우회: 재귀 방지
stable                    -- 같은 트랜잭션 내에서 결과가 변하지 않음
set search_path = public  -- search_path 고정으로 스키마 인젝션 방지
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 1. profiles 테이블 (auth.users 확장) ──────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,
  role       text default 'student' check (role in ('admin', 'student')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 기존 정책 제거 후 재생성
drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

-- 본인 프로필 조회
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 관리자는 전체 프로필 조회 (is_admin() 사용 — 재귀 없음)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- 본인 프로필 이메일 업데이트만 허용 (role 변경 불가)
-- role 컬럼은 관리자가 직접 SQL로만 변경 가능
create policy "Users can update own email"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())  -- role 변경 차단
  );

-- ── 2. lesson_notebooks 테이블 ────────────────────────────────
create table if not exists public.lesson_notebooks (
  id            uuid default gen_random_uuid() primary key,
  subject_title text not null,
  lesson_title  text not null,
  storage_path  text not null,
  uploaded_by   uuid references auth.users,
  created_at    timestamptz default now(),
  unique(subject_title, lesson_title)
);

alter table public.lesson_notebooks enable row level security;

drop policy if exists "Authenticated users can view notebooks" on public.lesson_notebooks;
drop policy if exists "Admins can insert notebooks"            on public.lesson_notebooks;
drop policy if exists "Admins can update notebooks"            on public.lesson_notebooks;
drop policy if exists "Admins can delete notebooks"            on public.lesson_notebooks;

-- 로그인 사용자 전체 조회
create policy "Authenticated users can view notebooks"
  on public.lesson_notebooks for select
  using (auth.role() = 'authenticated');

-- 관리자만 삽입/수정/삭제 (is_admin() 사용)
create policy "Admins can insert notebooks"
  on public.lesson_notebooks for insert
  with check (public.is_admin());

create policy "Admins can update notebooks"
  on public.lesson_notebooks for update
  using (public.is_admin());

create policy "Admins can delete notebooks"
  on public.lesson_notebooks for delete
  using (public.is_admin());

-- ── 3. 신규 회원가입 시 프로필 자동 생성 트리거 ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;  -- 중복 삽입 방지
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 4. Storage 버킷 생성 ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('notebooks', 'notebooks', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read notebooks" on storage.objects;
drop policy if exists "Admins can upload notebooks"            on storage.objects;
drop policy if exists "Admins can update notebooks"            on storage.objects;
drop policy if exists "Admins can delete notebooks"            on storage.objects;

create policy "Authenticated users can read notebooks"
  on storage.objects for select
  using (bucket_id = 'notebooks' and auth.role() = 'authenticated');

create policy "Admins can upload notebooks"
  on storage.objects for insert
  with check (bucket_id = 'notebooks' and public.is_admin());

create policy "Admins can update notebooks"
  on storage.objects for update
  using (bucket_id = 'notebooks' and public.is_admin());

create policy "Admins can delete notebooks"
  on storage.objects for delete
  using (bucket_id = 'notebooks' and public.is_admin());

-- ── 5. 첫 관리자 계정 설정 ────────────────────────────────────
-- 회원가입 후 아래 SQL로 role을 admin으로 변경하세요
-- (이메일 주소를 실제 값으로 교체)
--
-- update public.profiles
-- set role = 'admin'
-- where email = 'your-admin@email.com';

-- ── 6. 보안 점검 쿼리 (선택) ──────────────────────────────────
-- 현재 관리자 목록 확인
-- select id, email, role, created_at from public.profiles where role = 'admin';
