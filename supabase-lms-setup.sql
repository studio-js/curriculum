-- ================================================================
-- LMS 확장 셋업 SQL
-- 기존 supabase-setup.sql 실행 후 Supabase SQL Editor에서 추가로 실행하세요
-- ================================================================

-- ── 1. courses 테이블 (과정) ──────────────────────────────────
create table if not exists public.courses (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  description text,
  start_date  date,
  end_date    date,
  created_at  timestamptz default now()
);

alter table public.courses enable row level security;

drop policy if exists "Authenticated users can view courses" on public.courses;
drop policy if exists "Admins can manage courses"           on public.courses;

create policy "Authenticated users can view courses"
  on public.courses for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage courses"
  on public.courses for all
  using (public.is_admin());

-- ── 2. enrollments 테이블 (수강생 ↔ 과정) ───────────────────
create table if not exists public.enrollments (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references auth.users on delete cascade not null,
  course_id   uuid references public.courses on delete cascade not null,
  status      text default 'active' check (status in ('active', 'removed')),
  enrolled_at timestamptz default now(),
  removed_at  timestamptz,
  unique(student_id, course_id)
);

alter table public.enrollments enable row level security;

drop policy if exists "Students can view own enrollments" on public.enrollments;
drop policy if exists "Admins can manage enrollments"    on public.enrollments;

create policy "Students can view own enrollments"
  on public.enrollments for select
  using (auth.uid() = student_id);

create policy "Admins can manage enrollments"
  on public.enrollments for all
  using (public.is_admin());

-- ── 3. subject_schedule 테이블 (과목별 오픈 날짜) ───────────
-- subject_slug 은 src/data/curriculum.ts 의 subject.id 와 매핑됩니다.
-- available_from 이 null 이면 즉시 열림 (기본값).
create table if not exists public.subject_schedule (
  id             uuid default gen_random_uuid() primary key,
  course_id      uuid references public.courses on delete cascade not null,
  subject_slug   text not null,
  available_from timestamptz,
  updated_at     timestamptz default now(),
  unique(course_id, subject_slug)
);

alter table public.subject_schedule enable row level security;

drop policy if exists "Enrolled users can view schedule" on public.subject_schedule;
drop policy if exists "Admins can manage schedule"       on public.subject_schedule;

-- 해당 과정에 수강 중인 학생만 일정 조회 가능
create policy "Enrolled users can view schedule"
  on public.subject_schedule for select
  using (
    auth.role() = 'authenticated' and (
      public.is_admin() or
      exists (
        select 1 from public.enrollments
        where student_id = auth.uid()
          and course_id  = subject_schedule.course_id
          and status     = 'active'
      )
    )
  );

create policy "Admins can manage schedule"
  on public.subject_schedule for all
  using (public.is_admin());

-- ── 4. 초기 과정 데이터 시드 ─────────────────────────────────
insert into public.courses (title, description, start_date, end_date)
values (
  'AI 데이터 인텔리전스 전문가 과정',
  '심화 통계부터 시계열, 최신 LLM 기술을 통합해 비즈니스 난제를 정밀하게 예측/해결하는 고숙련 데이터 과학자 양성',
  '2026-02-03',
  '2026-08-28'
)
on conflict do nothing;

-- ── 5. 접근 권한 확인 헬퍼 함수 (선택) ──────────────────────
-- 프론트엔드에서 RPC로 호출해 특정 과목이 열렸는지 확인할 수 있습니다.
create or replace function public.is_subject_available(p_course_id uuid, p_subject_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    -- 수강 중인지 확인
    exists (
      select 1 from public.enrollments
      where student_id = auth.uid()
        and course_id  = p_course_id
        and status     = 'active'
    )
    and
    -- 오픈 날짜가 null(즉시 열림)이거나 현재 시각 이후인지 확인
    (
      not exists (
        select 1 from public.subject_schedule
        where course_id    = p_course_id
          and subject_slug = p_subject_slug
          and available_from is not null
      )
      or exists (
        select 1 from public.subject_schedule
        where course_id      = p_course_id
          and subject_slug   = p_subject_slug
          and available_from <= now()
      )
    );
$$;

-- ── 6. 상태 점검 쿼리 (선택) ─────────────────────────────────
-- select c.title, e.student_id, p.email, e.status, e.enrolled_at
-- from enrollments e
-- join courses c on c.id = e.course_id
-- join profiles p on p.id = e.student_id
-- order by c.title, e.enrolled_at;
