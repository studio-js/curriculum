'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase, supabaseConfigured } from '@/lib/supabase';

interface Course {
  id:          string;
  title:       string;
  description: string | null;
  start_date:  string | null;
  end_date:    string | null;
}

interface Enrollment {
  student_id:   string;
  course_id:    string;
  status:       string;
  enrolled_at?: string;
}

type Status = 'active' | 'upcoming' | 'ended' | 'unset';

const STATUS_META: Record<Status, { label: string; dot: string; text: string }> = {
  active:   { label: '진행중', dot: 'bg-[#1a1918]', text: 'text-[#1a1918]' },
  upcoming: { label: '예정',   dot: 'bg-[#97938c]', text: 'text-[#97938c]' },
  ended:    { label: '종료',   dot: 'bg-[#c3bfb8]', text: 'text-[#c3bfb8]' },
  unset:    { label: '미설정', dot: 'bg-[#e4e1da]', text: 'text-[#c3bfb8]' },
};

async function adminFetch(url: string, token: string) {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
}

function courseStatus(start: string | null, end: string | null): Status {
  if (!start) return 'unset';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Infinity;
  const n = Date.now();
  if (n < s) return 'upcoming';
  if (n > e) return 'ended';
  return 'active';
}

function calcProgress(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  return Math.min(100, Math.max(0, Math.round(((n - s) / (e - s)) * 100)));
}

function calcWeek(start: string | null, end: string | null) {
  if (!start || !end) return { current: 0, total: 0 };
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  const week  = 7 * 86400000;
  const total = Math.max(1, Math.ceil((e - s) / week));
  if (n < s) return { current: 0, total };
  if (n > e) return { current: total, total };
  return { current: Math.max(1, Math.ceil((n - s) / week)), total };
}

function dDay(start: string | null) {
  if (!start) return null;
  const s = new Date(start).getTime();
  const n = Date.now();
  const d = Math.ceil((s - n) / 86400000);
  if (d <= 0) return null;
  return d;
}

export default function HomePage() {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const router = useRouter();

  const [courses,     setCourses]     = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [filter,      setFilter]      = useState<'all' | Status>('all');
  const [createOpen,  setCreateOpen]  = useState(false);
  const [createBusy,  setCreateBusy]  = useState(false);
  const [createError, setCreateError] = useState('');
  const [newTitle,    setNewTitle]    = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newStart,    setNewStart]    = useState('');
  const [newEnd,      setNewEnd]      = useState('');

  /* 학생은 수강실로 */
  useEffect(() => {
    if (!loading && user && !isAdmin) router.replace('/classroom');
  }, [loading, user, isAdmin, router]);

  /* 관리자 데이터 fetch */
  const fetchAdmin = useCallback(async () => {
    if (!user || !isAdmin || !supabaseConfigured) return;
    setDataLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      const [cRes, eRes] = await Promise.all([
        adminFetch('/api/admin/courses', token),
        adminFetch('/api/admin/enrollments', token),
      ]);
      const [c, e] = await Promise.all([cRes.json(), eRes.json()]);
      setCourses(c.courses ?? []);
      setEnrollments((e.enrollments ?? []).filter((en: Enrollment) => en.status === 'active'));
    } finally {
      setDataLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => { fetchAdmin(); }, [fetchAdmin]);

  async function handleCreateCourse() {
    const title = newTitle.trim();
    if (!title) { setCreateError('과정명을 입력해주세요.'); return; }
    setCreateBusy(true);
    setCreateError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('no session');
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          description: newDesc.trim() || null,
          start_date:  newStart || null,
          end_date:    newEnd   || null,
        }),
      });
      if (!res.ok) throw new Error();
      setCreateOpen(false);
      setNewTitle(''); setNewDesc(''); setNewStart(''); setNewEnd('');
      fetchAdmin();
    } catch {
      setCreateError('생성에 실패했습니다.');
    } finally {
      setCreateBusy(false);
    }
  }

  /* 과정별 학생 수 */
  const studentCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of enrollments) m[e.course_id] = (m[e.course_id] ?? 0) + 1;
    return m;
  }, [enrollments]);

  /* 핵심 지표 */
  const stats = useMemo(() => {
    const groups: Record<Status, number> = { active: 0, upcoming: 0, ended: 0, unset: 0 };
    for (const c of courses) groups[courseStatus(c.start_date, c.end_date)]++;
    return {
      totalCourses:    courses.length,
      uniqueStudents:  new Set(enrollments.map(e => e.student_id)).size,
      activeCount:     groups.active,
      upcomingCount:   groups.upcoming,
      endedCount:      groups.ended,
    };
  }, [courses, enrollments]);

  /* 정렬: 진행중 → 예정 → 종료 → 미설정, 같은 그룹은 시작일 빠른 순 */
  const sortedCourses = useMemo(() => {
    const order: Record<Status, number> = { active: 0, upcoming: 1, ended: 2, unset: 3 };
    return [...courses].sort((a, b) => {
      const sa = courseStatus(a.start_date, a.end_date);
      const sb = courseStatus(b.start_date, b.end_date);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return (a.start_date ?? '').localeCompare(b.start_date ?? '');
    });
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (filter === 'all') return sortedCourses;
    return sortedCourses.filter(c => courseStatus(c.start_date, c.end_date) === filter);
  }, [sortedCourses, filter]);

  /* ─── early returns ─── */
  if (!supabaseConfigured) return <Landing ctaHref="/curriculum" ctaLabel="커리큘럼 보기 →" />;

  if (loading || dataLoading || (user && !isAdmin)) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Landing ctaHref="/login" ctaLabel="로그인하여 수강하기 →" />;

  /* ─── 관리자 대시보드 ─── */
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const FILTERS: Array<{ key: 'all' | Status; label: string; count: number }> = [
    { key: 'all',      label: '전체',   count: stats.totalCourses  },
    { key: 'active',   label: '진행중', count: stats.activeCount   },
    { key: 'upcoming', label: '예정',   count: stats.upcomingCount },
    { key: 'ended',    label: '종료',   count: stats.endedCount    },
  ];

  const greeting = profile?.name ? `${profile.name}님, 안녕하세요` : '안녕하세요';

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── Hero ── */}
      <section className="pt-14 pb-9">
        <p className="text-[12px] text-[#c3bfb8] tabular-nums mb-2">{today}</p>
        <h1 className="text-[32px] font-bold text-[#1a1918] tracking-tight leading-none">{greeting}</h1>
        <p className="text-[13px] text-[#97938c] mt-3">
          {stats.activeCount > 0
            ? <>현재 <strong className="text-[#1a1918] font-semibold">{stats.activeCount}개</strong> 과정이 진행 중이며, 총 <strong className="text-[#1a1918] font-semibold">{stats.uniqueStudents}명</strong>이 수강하고 있습니다.</>
            : <>등록된 과정을 선택하거나 새 과정을 시작하세요.</>
          }
        </p>
      </section>

      {/* ── 핵심 지표 strip ── */}
      <div className="grid grid-cols-4 border-y border-[#e4e1da] mb-12">
        {[
          { label: '등록된 과정', value: stats.totalCourses,   unit: '개' },
          { label: '전체 수강생', value: stats.uniqueStudents,  unit: '명' },
          { label: '진행 중',     value: stats.activeCount,     unit: '개' },
          { label: '예정',        value: stats.upcomingCount,   unit: '개' },
        ].map((s, i) => (
          <div key={i} className={`py-7 ${i === 0 ? 'pr-6' : i === 3 ? 'pl-6' : 'px-6'} ${i < 3 ? 'border-r border-[#e4e1da]' : ''}`}>
            <p className="text-[10px] font-semibold text-[#c3bfb8] uppercase tracking-[0.12em] mb-3">{s.label}</p>
            <p className="text-[30px] font-bold text-[#1a1918] tabular-nums leading-none">
              {s.value}
              <span className="text-[13px] font-medium text-[#97938c] ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── 과정 ── */}
      <section className="pb-20">
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2 className="text-[18px] font-bold text-[#1a1918] tracking-tight">과정</h2>
            <p className="text-[11px] text-[#97938c] mt-1">
              카드를 클릭하면 해당 과정의 수강생 관리로 이동합니다
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="text-[12px] font-semibold px-3.5 py-1.5 rounded-md border border-[#1a1918] text-[#1a1918] hover:bg-[#1a1918] hover:text-white transition-colors"
            >
              + 새 과정
            </button>

            {/* 필터 탭 */}
            <div className="flex items-center gap-0.5 bg-[#f7f6f3] rounded-lg p-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-[11px] px-3 py-1.5 rounded-md transition-colors font-medium ${
                    filter === f.key
                      ? 'bg-white text-[#1a1918] shadow-sm border border-[#e4e1da]'
                      : 'text-[#97938c] hover:text-[#1a1918]'
                }`}
              >
                {f.label}
                <span className="tabular-nums opacity-50 ml-1">{f.count}</span>
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* 카드 그리드 (2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map(course => (
            <AdminCourseCard
              key={course.id}
              course={course}
              studentCount={studentCounts[course.id] ?? 0}
            />
          ))}
          {filteredCourses.length === 0 && (
            <div className="md:col-span-2 border border-[#e4e1da] rounded-xl py-14 text-center">
              <p className="text-[13px] text-[#97938c]">
                {filter === 'all' ? '등록된 과정이 없습니다.' : `${STATUS_META[filter as Status]?.label} 과정이 없습니다.`}
              </p>
              {filter === 'all' && (
                <p className="text-[12px] text-[#c3bfb8] mt-1">supabase-lms-setup.sql 을 실행하세요.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 새 과정 생성 모달 ── */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4"
          onClick={() => !createBusy && setCreateOpen(false)}
        >
          <div
            className="w-full max-w-[440px] bg-white rounded-2xl border border-[#d4d0c8] p-7 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase font-semibold mb-2">
                새 과정 생성
              </p>
              <h2 className="text-[22px] font-bold text-[#1a1918] tracking-tight">과정 추가</h2>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-[#1a1918]">
                과정명 <span className="text-[#b04030]">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="예: AI 데이터 인텔리전스 전문가 과정"
                className="w-full text-[14px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] placeholder-[#a8a39c] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-[#1a1918]">설명</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="과정 목표·특징을 한 문장으로"
                rows={2}
                className="w-full text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] placeholder-[#a8a39c] resize-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-[#1a1918]">시작일</label>
                <input
                  type="date"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                  className="w-full text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] tabular-nums transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12.5px] font-semibold text-[#1a1918]">종료일</label>
                <input
                  type="date"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                  className="w-full text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] tabular-nums transition-colors"
                />
              </div>
            </div>

            {createError && (
              <div className="px-3 py-2.5 rounded-lg bg-[#fdf5f3] border border-[#e8b4a8]">
                <p className="text-[12.5px] text-[#b04030]">{createError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateCourse}
                disabled={createBusy || !newTitle.trim()}
                className="flex-1 text-[13.5px] font-semibold py-2.5 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {createBusy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                과정 생성
              </button>
              <button
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
                className="text-[13.5px] px-4 py-2.5 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] disabled:opacity-40 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 관리자용 과정 카드 ── */
function AdminCourseCard({ course, studentCount }: { course: Course; studentCount: number }) {
  const status   = courseStatus(course.start_date, course.end_date);
  const meta     = STATUS_META[status];
  const progress = calcProgress(course.start_date, course.end_date);
  const week     = calcWeek(course.start_date, course.end_date);
  const dday     = dDay(course.start_date);

  return (
    <div className="group border border-[#e4e1da] rounded-xl bg-white overflow-hidden hover:border-[#1a1918] transition-colors flex flex-col relative">

      {/* 카드 본문(=메인 클릭 영역) */}
      <Link
        href={`/admin/students?course_id=${course.id}`}
        className="p-5 flex-1 flex flex-col"
      >
        {/* 상단: 상태 + 우측 부가정보 */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${meta.text}`}>
              {meta.label}
            </span>
          </div>
          {status === 'active' && week.total > 0 && (
            <span className="text-[10px] text-[#97938c] tabular-nums">
              {week.current}주차 · {week.total}주
            </span>
          )}
          {status === 'upcoming' && dday && (
            <span className="text-[10px] font-semibold text-[#1a1918] tabular-nums tracking-tight">
              D−{dday}
            </span>
          )}
        </div>

        {/* 제목 */}
        <h3 className="text-[16px] font-bold text-[#1a1918] tracking-tight leading-snug mb-1.5 line-clamp-2">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-[12px] text-[#58554f] leading-relaxed line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        {course.start_date && (
          <p className="text-[10px] text-[#c3bfb8] tabular-nums mb-4">
            {course.start_date} — {course.end_date}
          </p>
        )}

        {/* 하단 메트릭 (push to bottom) */}
        <div className="mt-auto pt-3.5 border-t border-[#f2f1ee] grid grid-cols-[1fr_auto] gap-4 items-end">
          <div>
            <p className="text-[10px] text-[#97938c] mb-1.5">진행률</p>
            <div className="flex items-center gap-2">
              <div className="flex h-[2px] flex-1 overflow-hidden bg-[#f2f1ee]">
                <div className="bg-[#1a1918] h-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-[#1a1918] tabular-nums">{progress}%</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#97938c] mb-0.5">수강생</p>
            <p className="text-[18px] font-bold text-[#1a1918] tabular-nums leading-none">
              {studentCount}
              <span className="text-[10px] font-medium text-[#97938c] ml-0.5">명</span>
            </p>
          </div>
        </div>
      </Link>

      {/* 푸터 액션 (별도 링크) */}
      <div className="border-t border-[#f2f1ee] px-4 py-2.5 flex items-center gap-3 bg-[#f9f8f6]">
        <Link
          href={`/admin/curriculum?course_id=${course.id}`}
          className="text-[11px] text-[#97938c] hover:text-[#1a1918] transition-colors"
        >
          커리큘럼
        </Link>
        <span className="text-[#e4e1da]">·</span>
        <Link
          href={`/admin/schedule?course_id=${course.id}`}
          className="text-[11px] text-[#97938c] hover:text-[#1a1918] transition-colors"
        >
          일정 설정
        </Link>
        <span className="flex-1" />
        <span className="text-[11px] text-[#c3bfb8] group-hover:text-[#1a1918] transition-colors">
          수강생 관리 →
        </span>
      </div>
    </div>
  );
}

/* ── 비로그인 랜딩 (브랜드 일반 페이지, 특정 과정 노출 X) ── */
function Landing({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const features = [
    {
      label: '실무 중심',
      desc:  '현직 데이터 과학자가 직접 설계한 커리큘럼으로 실제 비즈니스 문제 해결 역량을 기릅니다.',
    },
    {
      label: '프로젝트 기반',
      desc:  '이론과 실습이 결합된 노트북 형태의 학습. 코드를 직접 실행하며 체득합니다.',
    },
    {
      label: '단계별 오픈',
      desc:  '진도에 맞춰 콘텐츠가 순차적으로 공개되어 부담 없이 학습 흐름을 따라갈 수 있습니다.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-8">
      {/* Hero */}
      <section className="pt-24 pb-16 text-center">
        <p className="text-[12px] tracking-[0.22em] text-[#7a766f] uppercase mb-5 font-semibold">
          MODULABS LEARNING
        </p>
        <h1 className="text-[44px] font-bold text-[#1a1918] leading-[1.15] tracking-tight mb-6 max-w-[620px] mx-auto">
          AI 직무 부트캠프, 모두의연구소에서.
        </h1>
        <p className="text-[15px] text-[#3a3835] leading-[1.85] max-w-[540px] mx-auto mb-10">
          현직자가 만드는 커리큘럼으로 데이터·AI 실무 역량을 체계적으로 성장시킵니다.
          참여 중인 과정에 로그인하여 학습을 시작하세요.
        </p>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1a1918] text-white text-[14px] font-semibold tracking-[0.02em] rounded-lg hover:bg-[#2d2b29] transition-colors"
        >
          {ctaLabel}
        </Link>
      </section>

      <div className="border-t border-[#d4d0c8]" />

      {/* Features */}
      <section className="py-14">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className={`px-7 py-2 ${i < features.length - 1 ? 'md:border-r border-[#d4d0c8]' : ''}`}
            >
              <p className="text-[13px] tracking-[0.05em] text-[#a8a39c] tabular-nums mb-3 font-semibold">
                0{i + 1}
              </p>
              <h3 className="text-[16px] font-bold text-[#1a1918] tracking-tight mb-2.5">
                {f.label}
              </h3>
              <p className="text-[13.5px] text-[#3a3835] leading-[1.75]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pb-16" />
    </div>
  );
}
