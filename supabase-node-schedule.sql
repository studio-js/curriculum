-- ================================================================
-- node_schedule 테이블 추가 (기존 subject_schedule 대체)
-- supabase-lms-setup.sql 실행 후 추가로 실행하세요
-- ================================================================

create table if not exists public.node_schedule (
  id             uuid default gen_random_uuid() primary key,
  course_id      uuid references public.courses on delete cascade not null,
  node_slug      text not null,   -- curriculum.ts 의 node.id 와 매핑
  available_from timestamptz,     -- null = 즉시 열림
  updated_at     timestamptz default now(),
  unique(course_id, node_slug)
);

alter table public.node_schedule enable row level security;

drop policy if exists "Enrolled users can view node schedule" on public.node_schedule;
drop policy if exists "Admins can manage node schedule"       on public.node_schedule;

create policy "Enrolled users can view node schedule"
  on public.node_schedule for select
  using (
    public.is_admin() or
    exists (
      select 1 from public.enrollments
      where student_id = auth.uid()
        and course_id  = node_schedule.course_id
        and status     = 'active'
    )
  );

create policy "Admins can manage node schedule"
  on public.node_schedule for all
  using (public.is_admin());
