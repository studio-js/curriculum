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

function calcProgress(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  return Math.min(100, Math.max(0, Math.round(((n - s) / (e - s)) * 100)));
}

function ymdLocal(d: Date) {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function dDay(target: string) {
  const t = new Date(target.slice(0, 10) + 'T00:00:00');
  const n = new Date();
  const tn = new Date(ymdLocal(n) + 'T00:00:00').getTime();
  const tt = t.getTime();
  return Math.round((tt - tn) / 86400000);
}

export default function ClassroomPage() {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const router = useRouter();

  const [courses,         setCourses]         = useState<Course[]>([]);
  const [openSchedule,    setOpenSchedule]    = useState<ScheduleRow[]>([]);
  const [upcomingSchedule,setUpcomingSchedule]= useState<ScheduleRow[]>([]);
  const [fetching,        setFetching]        = useState(true);

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
          .select('course_id')
          .eq('student_id', user.id)
          .eq('status', 'active');

        const ids = (enData ?? []).map(e => e.course_id as string);
        if (!ids.length) { setFetching(false); return; }

        const nowIso = new Date().toISOString();
        const [{ data: cData }, { data: openData }, { data: upData }] = await Promise.all([
          supabase
            .from('courses')
            .select('id, title, start_date, end_date')
            .in('id', ids)
            .order('start_date', { ascending: true }),
          supabase
            .from('node_schedule')
            .select('node_slug, available_from, course_id')
            .in('course_id', ids)
            .lte('available_from', nowIso)
            .order('available_from', { ascending: false }),
          supabase
            .from('node_schedule')
            .select('node_slug, available_from, course_id')
            .in('course_id', ids)
            .gt('available_from', nowIso)
            .order('available_from', { ascending: true })
            .limit(10),
        ]);

        setCourses(cData ?? []);
        setOpenSchedule(openData ?? []);
        setUpcomingSchedule(upData ?? []);
      } finally {
        setFetching(false);
      }
    })();
  }, [user, isAdmin]);

  /* 오늘 새로 열린 노드 */
  const todayStr = useMemo(() => ymdLocal(new Date()), []);
  const todayNew = useMemo(
    () => openSchedule.filter(s => s.available_from.slice(0, 10) === todayStr),
    [openSchedule, todayStr],
  );

  /* 다음 오픈 (전체 과정 통틀어 가장 빠른) */
  const nextOpen = upcomingSchedule[0];

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

  const totalOpen = openSchedule.length;

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── Hero ── */}
      <section className="pt-14 pb-8">
        <p className="text-[12px] text-[#c3bfb8] mb-2 tabular-nums">{today}</p>
        <h1 className="text-[32px] font-bold text-[#1a1918] tracking-tight leading-none">
          {profile?.name ? `${profile.name}님, 안녕하세요` : '안녕하세요'}
        </h1>
        {courses.length > 0 && (
          <p className="text-[13px] text-[#97938c] mt-3">
            {courses.length}개 과정 수강 중 · 현재 <strong className="text-[#1a1918] font-semibold">{totalOpen}개</strong> 콘텐츠가 열려있습니다
          </p>
        )}
      </section>

      {/* ── 수강 과정 없음 ── */}
      {courses.length === 0 && (
        <div className="border border-[#e4e1da] rounded-xl py-16 text-center mb-10">
          <p className="text-[14px] font-medium text-[#58554f]">수강 중인 과정이 없습니다</p>
          <p className="text-[12px] text-[#c3bfb8] mt-2">담당자에게 과정 등록을 요청하세요.</p>
        </div>
      )}

      {/* ── 오늘 새로 열림 / 다음 오픈 strip ── */}
      {(todayNew.length > 0 || nextOpen) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* 오늘 새로 열림 */}
          {todayNew.length > 0 && (
            <div className="rounded-xl bg-[#1a1918] text-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50 mb-3">오늘 새로 열림</p>
              <div className="space-y-2">
                {todayNew.slice(0, 3).map(s => {
                  const node = nodeMap.get(s.node_slug);
                  if (!node) return null;
                  return (
                    <div key={s.node_slug + s.course_id} className="text-[13px] font-medium leading-snug">
                      <p>{node.title}</p>
                      <p className="text-[10px] text-white/50 mt-0.5">{node.subjectTitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 다음 오픈 */}
          {nextOpen && (() => {
            const node = nodeMap.get(nextOpen.node_slug);
            const d    = dDay(nextOpen.available_from);
            if (!node) return null;
            return (
              <div className="rounded-xl border border-[#e4e1da] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c3bfb8]">다음 오픈</p>
                  <span className="text-[11px] font-bold text-[#1a1918] tabular-nums tracking-tight">D−{d}</span>
                </div>
                <p className="text-[13px] font-medium text-[#1a1918] leading-snug">{node.title}</p>
                <p className="text-[11px] text-[#97938c] mt-1">{node.subjectTitle}</p>
                <p className="text-[10px] text-[#c3bfb8] tabular-nums mt-2">
                  {nextOpen.available_from.slice(0, 10)}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── 과정 카드 목록 ── */}
      <section className="pb-20">
        {courses.length > 0 && (
          <p className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.15em] mb-4">수강 중인 과정</p>
        )}

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
              <div key={course.id} className="border border-[#e4e1da] rounded-xl bg-white overflow-hidden">

                {/* 헤더 */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-[#c3bfb8] uppercase tracking-[0.12em] mb-2">수강 중</p>
                      <h2 className="text-[18px] font-bold text-[#1a1918] tracking-tight mb-1">{course.title}</h2>
                      {course.start_date && (
                        <p className="text-[11px] text-[#c3bfb8] tabular-nums">
                          {course.start_date} — {course.end_date}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[28px] font-bold text-[#1a1918] tabular-nums leading-none">{courseOpens.length}</p>
                      <p className="text-[10px] text-[#97938c] mt-0.5">콘텐츠 열림</p>
                    </div>
                  </div>

                  {/* 진행률 */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-[#97938c]">과정 진행률</p>
                      <p className="text-[10px] font-semibold text-[#1a1918] tabular-nums">{progress}%</p>
                    </div>
                    <div className="flex h-[2px] w-full overflow-hidden bg-[#f2f1ee]">
                      <div
                        className="bg-[#1a1918] h-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 최근 열린 콘텐츠 */}
                {recentOpens.length > 0 && (
                  <div className="border-t border-[#f2f1ee] px-6 py-4">
                    <p className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.1em] mb-3">최근 열린 콘텐츠</p>
                    <div className="space-y-2">
                      {recentOpens.map(item => (
                        <div key={item.slug} className="flex items-center gap-3">
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${item.isToday ? 'bg-[#1a1918]' : 'bg-[#c3bfb8]'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-medium text-[#1a1918] truncate">{item.node!.title}</p>
                              {item.isToday && (
                                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white bg-[#1a1918] px-1.5 py-0.5 rounded flex-shrink-0">NEW</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#c3bfb8]">{item.node!.subjectTitle}</p>
                          </div>
                          <span className="text-[10px] text-[#c3bfb8] tabular-nums flex-shrink-0">{item.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 다음 오픈 (해당 과정) */}
                {courseNext && (() => {
                  const node = nodeMap.get(courseNext.node_slug);
                  const d    = dDay(courseNext.available_from);
                  if (!node) return null;
                  return (
                    <div className="border-t border-[#f2f1ee] px-6 py-3 flex items-center gap-3 bg-[#f9f8f6]">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#c3bfb8]">다음</span>
                      <p className="text-[12px] text-[#58554f] truncate flex-1 min-w-0">{node.title}</p>
                      <span className="text-[10px] font-bold text-[#1a1918] tabular-nums flex-shrink-0">D−{d}</span>
                    </div>
                  );
                })()}

                {/* 푸터 */}
                <div className="border-t border-[#f2f1ee] px-6 py-3 bg-white flex items-center justify-between">
                  <Link href={`/curriculum?course_id=${course.id}`} className="text-[12px] font-semibold text-[#1a1918] hover:underline">
                    커리큘럼 전체 보기 →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
