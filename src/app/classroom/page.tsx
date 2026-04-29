'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { curriculumData } from '@/data/curriculum';

interface Course {
  id:         string;
  title:      string;
  start_date: string | null;
  end_date:   string | null;
}

interface ScheduleRow {
  node_slug:      string;
  available_from: string;
  course_id:      string;
}

const nodeMap = new Map(
  curriculumData.subjects.flatMap(s =>
    s.nodes.map(n => [n.id, { title: n.title, subjectTitle: s.title }])
  )
);

const subjectMap = Object.fromEntries(
  curriculumData.subjects.map(s => [s.id, s])
);

const TRACKS = [
  {
    num: '01',
    title: '데이터 엔지니어링',
    desc: 'Python·SQL·웹 스크레핑으로 원천 데이터를 수집·정제',
    ids: ['python-data-analysis', 'data-wrangling', 'sql-analysis', 'data-visualization', 'project-viz'],
  },
  {
    num: '02',
    title: '통계 & 머신러닝',
    desc: '인과추론·XGBoost·LightGBM 앙상블로 예측 모델 구축',
    ids: ['statistics', 'machine-learning', 'advanced-stats', 'project-insight'],
  },
  {
    num: '03',
    title: '시계열 & 딥러닝',
    desc: 'ARIMA부터 TFT까지 시계열 분석 전 스펙트럼',
    ids: ['time-series', 'project-demand'],
  },
  {
    num: '04',
    title: 'LLM & 자동화',
    desc: 'RAG·Function Calling으로 LLM 기반 시스템 구축',
    ids: ['nlp', 'project-cx'],
  },
];

const GUIDES = [
  { label: '콘텐츠 오픈', desc: '노드는 정해진 일정에 따라 순차적으로 열립니다. 오픈 전 콘텐츠는 잠금 상태로 표시됩니다.' },
  { label: '학습 방식',   desc: '각 노드는 노트북 형태의 세션으로 구성됩니다. 코드 셀을 직접 실행하며 학습할 수 있습니다.' },
  { label: '진행 문의',   desc: '수업 일정·진도 관련 문의는 과정 운영 담당자에게 부탁드립니다.' },
];

function calcProgress(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  return Math.min(100, Math.max(0, Math.round(((n - s) / (e - s)) * 100)));
}

function ymdLocal(d: Date) {
  return d.toLocaleDateString('en-CA');
}

function dDay(target: string) {
  const t  = new Date(target.slice(0, 10) + 'T00:00:00').getTime();
  const tn = new Date(ymdLocal(new Date()) + 'T00:00:00').getTime();
  return Math.round((t - tn) / 86400000);
}

export default function ClassroomPage() {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const router = useRouter();

  const [courses,         setCourses]         = useState<Course[]>([]);
  const [pendingCourses,  setPendingCourses]  = useState<Course[]>([]);
  const [openSchedule,    setOpenSchedule]    = useState<ScheduleRow[]>([]);
  const [upcomingSchedule,setUpcomingSchedule]= useState<ScheduleRow[]>([]);
  const [fetching,        setFetching]        = useState(true);
  const [todayDismissed,  setTodayDismissed]  = useState(false);

  /* 인증 가드 */
  useEffect(() => {
    if (loading) return;
    if (!user)   router.replace('/login');
    if (isAdmin) router.replace('/');
  }, [loading, user, isAdmin, router]);

  /* 데이터 fetch */
  useEffect(() => {
    if (!user || isAdmin) return;
    (async () => {
      setFetching(true);
      try {
        const { data: enData } = await supabase
          .from('enrollments')
          .select('course_id, status')
          .eq('student_id', user.id)
          .in('status', ['active', 'pending']);

        const all = (enData ?? []) as Array<{ course_id: string; status: string }>;
        const activeIds  = all.filter(e => e.status === 'active' ).map(e => e.course_id);
        const pendingIds = all.filter(e => e.status === 'pending').map(e => e.course_id);

        const allIds = [...new Set([...activeIds, ...pendingIds])];
        if (!allIds.length) { setFetching(false); return; }

        const nowIso = new Date().toISOString();
        const [{ data: cData }, openRes, upRes] = await Promise.all([
          supabase
            .from('courses')
            .select('id, title, start_date, end_date')
            .in('id', allIds)
            .order('start_date', { ascending: true }),
          activeIds.length
            ? supabase
                .from('node_schedule')
                .select('node_slug, available_from, course_id')
                .in('course_id', activeIds)
                .lte('available_from', nowIso)
                .order('available_from', { ascending: false })
            : Promise.resolve({ data: [] as ScheduleRow[] }),
          activeIds.length
            ? supabase
                .from('node_schedule')
                .select('node_slug, available_from, course_id')
                .in('course_id', activeIds)
                .gt('available_from', nowIso)
                .order('available_from', { ascending: true })
                .limit(10)
            : Promise.resolve({ data: [] as ScheduleRow[] }),
        ]);

        const allCourses = (cData ?? []) as Course[];
        setCourses(allCourses.filter(c => activeIds.includes(c.id)));
        setPendingCourses(allCourses.filter(c => pendingIds.includes(c.id)));
        setOpenSchedule(openRes.data ?? []);
        setUpcomingSchedule(upRes.data ?? []);
      } finally {
        setFetching(false);
      }
    })();
  }, [user, isAdmin]);

  const todayStr = useMemo(() => ymdLocal(new Date()), []);
  const todayNew = useMemo(
    () => openSchedule.filter(s => s.available_from.slice(0, 10) === todayStr),
    [openSchedule, todayStr],
  );

  const nextOpen = upcomingSchedule[0];

  /* 오늘 알림 dismiss 상태: localStorage(today-dismissed-YYYY-MM-DD) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTodayDismissed(localStorage.getItem(`today-dismissed-${todayStr}`) === '1');
  }, [todayStr]);

  function dismissToday() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`today-dismissed-${todayStr}`, '1');
    }
    setTodayDismissed(true);
  }

  if (loading || fetching) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const totalOpen   = openSchedule.length;
  const totalNodes  = curriculumData.subjects.flatMap(s => s.nodes).length;
  const totalHours  = curriculumData.course.totalHours;

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── Hero ── */}
      <section className="pt-14 pb-8">
        <p className="text-[13.5px] text-[#7a766f] mb-2 tabular-nums">{today}</p>
        <h1 className="text-[34px] font-bold text-[#1a1918] tracking-tight leading-none">
          {profile?.name ? `${profile.name}님, 안녕하세요` : '안녕하세요'}
        </h1>
        {courses.length > 0 && (
          <p className="text-[14.5px] text-[#3a3835] mt-3">
            {courses.length}개 과정 수강 중 · 현재 <strong className="text-[#1a1918] font-semibold">{totalOpen}개</strong> 콘텐츠가 열려있습니다
          </p>
        )}
        {courses.length === 0 && pendingCourses.length > 0 && (
          <p className="text-[14.5px] text-[#3a3835] mt-3">
            <strong className="text-[#1a1918] font-semibold">{pendingCourses.length}개</strong> 과정의 승인을 기다리고 있습니다
          </p>
        )}
      </section>

      {/* ── 신청 대기 중 (pending) ── */}
      {pendingCourses.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[16px] font-bold text-[#1a1918] tracking-tight">신청 대기 중</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3a3835] border border-[#3a3835] px-1.5 py-0.5 rounded leading-none">PENDING</span>
          </div>
          <div className="space-y-2.5">
            {pendingCourses.map(c => (
              <div key={c.id} className="border border-[#d4d0c8] rounded-xl bg-white p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#1a1918] tracking-tight">{c.title}</p>
                  {c.start_date && (
                    <p className="text-[12.5px] text-[#7a766f] tabular-nums mt-1">{c.start_date} — {c.end_date}</p>
                  )}
                </div>
                <p className="text-[12px] text-[#7a766f] flex-shrink-0">관리자 승인 대기 중</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 수강·신청 둘 다 없음 ── */}
      {courses.length === 0 && pendingCourses.length === 0 && (
        <div className="border border-[#d4d0c8] rounded-xl py-16 text-center mb-10">
          <p className="text-[15px] font-semibold text-[#1a1918]">수강 중인 과정이 없습니다</p>
          <p className="text-[13px] text-[#7a766f] mt-2">관리자에게 과정 등록을 요청하거나 새로 신청해주세요.</p>
        </div>
      )}

      {/* ── 오늘 새로 열림 / 다음 오픈 strip ── */}
      {((todayNew.length > 0 && !todayDismissed) || nextOpen) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {todayNew.length > 0 && !todayDismissed && (
            <div className="rounded-xl bg-white border border-[#e4e1da] p-5 relative">
              <button
                onClick={dismissToday}
                aria-label="알림 닫기"
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-[#a8a39c] hover:text-[#1a1918] hover:bg-[#f2f1ee] rounded transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M1 9L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a1918]" />
                <p className="text-[13px] font-semibold text-[#1a1918] tracking-tight">오늘 새로 열림</p>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#3a3835] border border-[#3a3835] px-1.5 py-0.5 rounded">NEW</span>
              </div>
              <div className="space-y-3">
                {todayNew.slice(0, 3).map(s => {
                  const node = nodeMap.get(s.node_slug);
                  if (!node) return null;
                  return (
                    <div key={s.node_slug + s.course_id} className="leading-snug">
                      <p className="text-[14.5px] font-semibold text-[#1a1918]">{node.title}</p>
                      <p className="text-[12.5px] text-[#7a766f] mt-0.5">{node.subjectTitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nextOpen && (() => {
            const node = nodeMap.get(nextOpen.node_slug);
            const d    = dDay(nextOpen.available_from);
            if (!node) return null;
            return (
              <div className="rounded-xl bg-white border border-[#e4e1da] p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[13px] font-semibold text-[#3a3835] tracking-tight">다음 오픈</p>
                  <span className="text-[13px] font-bold text-[#1a1918] tabular-nums tracking-tight">D−{d}</span>
                </div>
                <p className="text-[14.5px] font-semibold text-[#1a1918] leading-snug">{node.title}</p>
                <p className="text-[12.5px] text-[#7a766f] mt-1">{node.subjectTitle}</p>
                <p className="text-[12px] text-[#a8a39c] tabular-nums mt-2">
                  {nextOpen.available_from.slice(0, 10)}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── 과정 카드 목록 ── */}
      {courses.length > 0 && (
        <section className="pb-12">
          <h2 className="text-[18px] font-bold text-[#1a1918] tracking-tight mb-5">수강 중인 과정</h2>

          <div className="space-y-4">
            {courses.map(course => {
              const progress      = calcProgress(course.start_date, course.end_date);
              const courseOpens   = openSchedule.filter(s => s.course_id === course.id);
              const recentOpens   = courseOpens
                .map(s => ({ slug: s.node_slug, date: s.available_from.slice(0, 10), node: nodeMap.get(s.node_slug), isToday: s.available_from.slice(0, 10) === todayStr }))
                .filter(s => s.node)
                .slice(0, 4);
              const courseNext    = upcomingSchedule.find(s => s.course_id === course.id);

              return (
                <Link
                  key={course.id}
                  href={`/curriculum?course_id=${course.id}`}
                  className="block border border-[#e4e1da] rounded-xl bg-white overflow-hidden hover:border-[#1a1918] transition-colors group"
                >
                  {/* 헤더 */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#7a766f] uppercase tracking-[0.12em] mb-2">수강 중</p>
                        <h3 className="text-[20px] font-bold text-[#1a1918] tracking-tight mb-1.5">{course.title}</h3>
                        {course.start_date && (
                          <p className="text-[12.5px] text-[#a8a39c] tabular-nums">
                            {course.start_date} — {course.end_date}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[30px] font-bold text-[#1a1918] tabular-nums leading-none">{courseOpens.length}</p>
                        <p className="text-[12px] text-[#7a766f] mt-1">콘텐츠 열림</p>
                      </div>
                    </div>

                    {/* 진행률 */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[12.5px] text-[#3a3835]">과정 진행률</p>
                        <p className="text-[12.5px] font-semibold text-[#1a1918] tabular-nums">{progress}%</p>
                      </div>
                      <div className="flex h-[2px] w-full overflow-hidden bg-[#f2f1ee]">
                        <div className="bg-[#1a1918] h-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* 최근 열린 콘텐츠 */}
                  {recentOpens.length > 0 && (
                    <div className="border-t border-[#f2f1ee] px-6 py-5">
                      <p className="text-[13px] font-semibold text-[#1a1918] tracking-tight mb-3">최근 열린 콘텐츠</p>
                      <div className="space-y-3">
                        {recentOpens.map(item => (
                          <div key={item.slug} className="flex items-center gap-3">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.isToday ? 'bg-[#1a1918]' : 'bg-[#c3bfb8]'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[13.5px] font-medium text-[#1a1918] truncate">{item.node!.title}</p>
                                {item.isToday && (
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3a3835] border border-[#3a3835] px-1.5 py-0.5 rounded flex-shrink-0 leading-none">NEW</span>
                                )}
                              </div>
                              <p className="text-[12px] text-[#7a766f] mt-0.5">{item.node!.subjectTitle}</p>
                            </div>
                            <span className="text-[12px] text-[#a8a39c] tabular-nums flex-shrink-0">{item.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 콘텐츠가 아직 없는 경우 안내 */}
                  {recentOpens.length === 0 && (
                    <div className="border-t border-[#f2f1ee] px-6 py-5 bg-[#fafaf8]">
                      <p className="text-[13.5px] text-[#3a3835]">
                        아직 열린 콘텐츠가 없습니다. 일정에 맞춰 순차적으로 공개됩니다.
                      </p>
                    </div>
                  )}

                  {/* 다음 오픈 (해당 과정) */}
                  {courseNext && (() => {
                    const node = nodeMap.get(courseNext.node_slug);
                    const d    = dDay(courseNext.available_from);
                    if (!node) return null;
                    return (
                      <div className="border-t border-[#f2f1ee] px-6 py-3.5 flex items-center gap-3 bg-[#f9f8f6]">
                        <span className="text-[12.5px] font-semibold text-[#3a3835]">다음</span>
                        <p className="text-[13.5px] text-[#1a1918] truncate flex-1 min-w-0">{node.title}</p>
                        <span className="text-[12px] font-bold text-[#1a1918] tabular-nums flex-shrink-0">D−{d}</span>
                      </div>
                    );
                  })()}

                  {/* 푸터 (CTA) */}
                  <div className="border-t border-[#f2f1ee] px-6 py-3.5 bg-white flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold text-[#1a1918] group-hover:underline">
                      커리큘럼 전체 보기 →
                    </span>
                    <span className="text-[12px] text-[#a8a39c] tabular-nums">
                      {totalNodes}개 노드 · {totalHours}h
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 학습 트랙 ── */}
      {courses.length > 0 && (
        <section className="pb-12">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-[18px] font-bold text-[#1a1918] tracking-tight">학습 트랙</h2>
            <Link href="/curriculum" className="text-[13px] text-[#7a766f] hover:text-[#1a1918] transition-colors">
              전체 커리큘럼 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {TRACKS.map((t, i) => {
              const subjects = t.ids.map(id => subjectMap[id]).filter(Boolean);
              const hours    = subjects.reduce((sum, s) => sum + s.totalHours, 0);
              return (
                <div
                  key={t.num}
                  className={`px-6 pt-6 pb-7 ${
                    i === 0 ? 'border-b border-r border-[#e4e1da]' :
                    i === 1 ? 'border-b border-[#e4e1da]' :
                    i === 2 ? 'border-r border-[#e4e1da]' : ''
                  }`}
                >
                  <div className="flex items-baseline gap-2.5 mb-3">
                    <span className="text-[13px] font-medium text-[#a8a39c] tabular-nums">{t.num}</span>
                    <h3 className="text-[17px] font-bold text-[#1a1918] tracking-tight">{t.title}</h3>
                  </div>
                  <p className="text-[14px] text-[#3a3835] leading-[1.7] mb-3.5">{t.desc}</p>
                  <p className="text-[12.5px] text-[#7a766f] tabular-nums">
                    {subjects.length}개 교과목 · {hours}h
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 학습 안내 ── */}
      {courses.length > 0 && (
        <section className="pb-20">
          <h2 className="text-[18px] font-bold text-[#1a1918] tracking-tight mb-5">학습 안내</h2>
          <div className="grid grid-cols-1 md:grid-cols-3">
            {GUIDES.map((g, i) => (
              <div
                key={i}
                className={`px-6 pt-6 pb-7 ${i < GUIDES.length - 1 ? 'md:border-r border-[#e4e1da]' : ''}`}
              >
                <div className="flex items-baseline gap-2.5 mb-3">
                  <span className="text-[13px] font-medium text-[#a8a39c] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-[15px] font-bold text-[#1a1918] tracking-tight">{g.label}</p>
                </div>
                <p className="text-[14px] text-[#3a3835] leading-[1.7]">{g.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
