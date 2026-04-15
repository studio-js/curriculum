-- ================================================================
-- Supabase 초기 셋업 SQL
-- Supabase 대시보드 → SQL Editor 에서 실행하세요
-- ================================================================

-- ── 1. profiles 테이블 (auth.users 확장) ──────────────────────
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text,
  role       text default 'student' check (role in ('admin', 'student')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 본인 프로필 조회
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 관리자는 전체 프로필 조회
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── 2. lesson_notebooks 테이블 ────────────────────────────────
create table public.lesson_notebooks (
  id            uuid default gen_random_uuid() primary key,
  subject_title text not null,
  lesson_title  text not null,
  storage_path  text not null,
  uploaded_by   uuid references auth.users,
  created_at    timestamptz default now(),
  unique(subject_title, lesson_title)
);

alter table public.lesson_notebooks enable row level security;

-- 로그인 사용자 전체 조회
create policy "Authenticated users can view notebooks"
  on public.lesson_notebooks for select
  using (auth.role() = 'authenticated');

-- 관리자만 삽입/수정/삭제
create policy "Admins can insert notebooks"
  on public.lesson_notebooks for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update notebooks"
  on public.lesson_notebooks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete notebooks"
  on public.lesson_notebooks for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── 3. 신규 회원가입 시 프로필 자동 생성 트리거 ─────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 4. Storage 버킷 생성 ──────────────────────────────────────
-- Supabase 대시보드 → Storage → New Bucket
-- 버킷 이름: notebooks
-- Public: false (인증 필요)

-- Storage RLS 정책 (버킷 생성 후 대시보드에서 추가하거나 아래 SQL 실행)
insert into storage.buckets (id, name, public)
values ('notebooks', 'notebooks', false)
on conflict (id) do nothing;

create policy "Authenticated users can read notebooks"
  on storage.objects for select
  using (bucket_id = 'notebooks' and auth.role() = 'authenticated');

create policy "Admins can upload notebooks"
  on storage.objects for insert
  with check (
    bucket_id = 'notebooks' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update notebooks"
  on storage.objects for update
  using (
    bucket_id = 'notebooks' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete notebooks"
  on storage.objects for delete
  using (
    bucket_id = 'notebooks' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── 5. 첫 관리자 계정 설정 ────────────────────────────────────
-- 회원가입 후 아래 SQL로 role을 admin으로 변경하세요
-- (이메일 주소를 실제 값으로 교체)
--
-- update public.profiles
-- set role = 'admin'
-- where email = 'your-admin@email.com';
