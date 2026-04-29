'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

interface Course     { id: string; title: string; start_date: string | null; end_date: string | null; }
interface Enrollment { id: string; student_id: string; course_id: string; status: 'active' | 'removed'; enrolled_at: string; }

async function adminFetch(url: string, options?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...options?.headers },
  });
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const initCourseId = searchParams.get('course_id') ?? '';

  const [students,    setStudents]    = useState<Profile[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [busy,        setBusy]        = useState<string | null>(null);
  const [confirmKey,  setConfirmKey]  = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>(initCourseId);
  const [query,       setQuery]       = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sRes, cRes, eRes] = await Promise.all([
        adminFetch('/api/admin/students'),
        adminFetch('/api/admin/courses'),
        adminFetch('/api/admin/enrollments'),
      ]);
      const [s, c, e] = await Promise.all([sRes.json(), cRes.json(), eRes.json()]);
      if (!sRes.ok || !cRes.ok || !eRes.ok) throw new Error();
      setStudents(s.students    ?? []);
      setEnrollments(e.enrollments ?? []);
      const courseList: Course[] = c.courses ?? [];
      setCourses(courseList);
      const found = courseList.find(c => c.id === selectedCourse);
      if (!found && courseList.length > 0) setSelectedCourse(courseList[0].id);
    } catch { setError('데이터를 불러오는데 실패했습니다.'); }
    finally  { setLoading(false); }
  }, [selectedCourse]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function getEnrollment(studentId: string, courseId: string) {
    return enrollments.find(e => e.student_id === studentId && e.course_id === courseId);
  }

  async function handleEnroll(studentId: string, courseId: string) {
    const key = `${studentId}-${courseId}`;
    setBusy(key);
    try {
      const res = await adminFetch('/api/admin/enrollments', {
        method: 'POST', body: JSON.stringify({ student_id: studentId, course_id: courseId }),
      });
      if (!res.ok) throw new Error();
      await fetchAll();
    } catch { setError('등록에 실패했습니다.'); }
    finally  { setBusy(null); }
  }

  async function handleRemove(studentId: string, courseId: string) {
    const key = `${studentId}-${courseId}`;
    setBusy(key); setConfirmKey(null);
    try {
      const res = await adminFetch('/api/admin/enrollments', {
        method: 'DELETE', body: JSON.stringify({ student_id: studentId, course_id: courseId }),
      });
      if (!res.ok) throw new Error();
      await fetchAll();
    } catch { setError('제거에 실패했습니다.'); }
    finally  { setBusy(null); }
  }

  const course = courses.find(c => c.id === selectedCourse);

  /* 선택 과정의 수강 중 / 미등록 학생 분리 */
  const { enrolled, notEnrolled } = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = students.filter(s =>
      !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
    const en  = filtered.filter(s => getEnrollment(s.id, selectedCourse)?.status === 'active');
    const not = filtered.filter(s => getEnrollment(s.id, selectedCourse)?.status !== 'active');
    return { enrolled: en, notEnrolled: not };
  }, [students, enrollments, selectedCourse, query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── 헤더 ── */}
      <section className="pt-14 pb-8">
        <p className="text-[10px] tracking-[0.2em] text-[#97938c] uppercase mb-3 font-medium">관리자 · 수강생 관리</p>
        <h1 className="text-[28px] font-bold text-[#1a1918] tracking-tight leading-none">수강생 등록 및 관리</h1>
      </section>

      {/* ── 오류 ── */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[#e4e1da] bg-[#f7f6f3] flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#58554f]">{error}</p>
          <button onClick={() => setError('')} className="text-[11px] text-[#97938c] hover:text-[#1a1918]">닫기</button>
        </div>
      )}

      {/* ── 로딩 ── */}
      {loading && (
        <div className="py-20 flex justify-center">
          <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── 과정 선택 탭 ── */}
          {courses.length > 0 && (
            <div className="flex gap-1 bg-[#f7f6f3] rounded-lg p-1 mb-6 w-fit">
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCourse(c.id); setQuery(''); }}
                  className={`text-[12px] px-4 py-2 rounded-md transition-colors font-medium ${
                    selectedCourse === c.id
                      ? 'bg-white text-[#1a1918] shadow-sm border border-[#e4e1da]'
                      : 'text-[#97938c] hover:text-[#1a1918]'
                  }`}
                >
                  {c.title.length > 16 ? c.title.slice(0, 16) + '…' : c.title}
                </button>
              ))}
            </div>
          )}

          {/* ── 선택 과정 헤더 카드 ── */}
          {course && (
            <div className="border-2 border-[#1a1918] rounded-xl p-5 mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-bold text-[#1a1918] tracking-tight mb-1">{course.title}</h2>
                {course.start_date && (
                  <p className="text-[12px] text-[#97938c] tabular-nums">{course.start_date} — {course.end_date}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[28px] font-bold tabular-nums text-[#1a1918] leading-none">{enrolled.length}</p>
                <p className="text-[11px] text-[#97938c]">명 수강중</p>
              </div>
            </div>
          )}

          {/* ── 검색 ── */}
          <div className="relative mb-0">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="이름 또는 이메일 검색"
              className="w-full pl-4 pr-4 py-2.5 text-[13px] bg-white border border-[#e4e1da] rounded-lg text-[#1a1918] placeholder-[#c3bfb8] focus:outline-none focus:border-[#1a1918] transition-colors"
            />
          </div>

          {/* ── 수강 중 ── */}
          <section className="mt-6">
            <div className="flex items-center gap-3 mb-0 pb-3 border-b border-[#e4e1da]">
              <h3 className="text-[11px] font-bold text-[#1a1918] uppercase tracking-[0.1em]">
                수강 중
              </h3>
              <span className="text-[11px] font-bold text-[#1a1918] tabular-nums">{enrolled.length}명</span>
            </div>

            {enrolled.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[#c3bfb8]">수강 중인 학생이 없습니다.</p>
            ) : (
              <>
                <TableHeader />
                {enrolled.map(student => {
                  const en  = getEnrollment(student.id, selectedCourse);
                  const key = `${student.id}-${selectedCourse}`;
                  return (
                    <StudentRow
                      key={student.id}
                      student={student}
                      enrolledAt={en?.enrolled_at}
                      isActive
                      isBusy={busy === key}
                      isConfirm={confirmKey === key}
                      onConfirm={() => setConfirmKey(key)}
                      onRemove={() => handleRemove(student.id, selectedCourse)}
                      onCancelConfirm={() => setConfirmKey(null)}
                    />
                  );
                })}
              </>
            )}
          </section>

          {/* ── 미등록 ── */}
          {notEnrolled.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-3 mb-0 pb-3 border-b border-[#e4e1da]">
                <h3 className="text-[11px] font-bold text-[#97938c] uppercase tracking-[0.1em]">미등록</h3>
                <span className="text-[11px] text-[#97938c] tabular-nums">{notEnrolled.length}명</span>
              </div>
              <TableHeader muted />
              {notEnrolled.map(student => {
                const key = `${student.id}-${selectedCourse}`;
                return (
                  <StudentRow
                    key={student.id}
                    student={student}
                    isActive={false}
                    isBusy={busy === key}
                    isConfirm={false}
                    onEnroll={() => handleEnroll(student.id, selectedCourse)}
                    onConfirm={() => {}}
                    onRemove={() => {}}
                    onCancelConfirm={() => {}}
                  />
                );
              })}
            </section>
          )}

          {courses.length === 0 && (
            <div className="border border-[#e4e1da] rounded-xl py-14 text-center mt-4">
              <p className="text-[13px] text-[#97938c]">등록된 과정이 없습니다.</p>
              <p className="text-[12px] text-[#c3bfb8] mt-1">supabase-lms-setup.sql 을 실행하세요.</p>
            </div>
          )}
        </>
      )}

      <div className="pb-16" />
    </div>
  );
}

function TableHeader({ muted }: { muted?: boolean }) {
  const color = muted ? 'text-[#c3bfb8]' : 'text-[#97938c]';
  return (
    <div className={`grid grid-cols-[1fr_1.5fr_110px_72px] gap-3 px-3 py-2 ${color}`}>
      {['이름', '이메일', '등록일', ''].map((h, i) => (
        <span key={i} className="text-[10px] font-semibold uppercase tracking-[0.08em]">{h}</span>
      ))}
    </div>
  );
}

function StudentRow({
  student, enrolledAt, isActive, isBusy, isConfirm,
  onEnroll, onConfirm, onRemove, onCancelConfirm,
}: {
  student: Profile;
  enrolledAt?: string;
  isActive: boolean;
  isBusy: boolean;
  isConfirm: boolean;
  onEnroll?: () => void;
  onConfirm: () => void;
  onRemove: () => void;
  onCancelConfirm: () => void;
}) {
  const dateStr = enrolledAt
    ? new Date(enrolledAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
    : '—';

  return (
    <div className={`grid grid-cols-[1fr_1.5fr_110px_72px] gap-3 items-center px-3 py-3 border-b border-[#f2f1ee] transition-colors group ${
      isActive ? 'hover:bg-[#f7f6f3]' : 'hover:bg-[#fafaf9] opacity-60'
    }`}>
      <span className="text-[13px] font-medium text-[#1a1918] truncate">
        {student.name ?? <span className="text-[#c3bfb8] italic text-[12px]">미입력</span>}
      </span>
      <span className="text-[12px] text-[#58554f] truncate">{student.email}</span>
      <span className="text-[12px] text-[#97938c] tabular-nums">{dateStr}</span>

      <div className="flex items-center justify-end">
        {isBusy ? (
          <span className="w-4 h-4 border-2 border-[#e4e1da] border-t-[#97938c] rounded-full animate-spin inline-block" />
        ) : isActive ? (
          isConfirm ? (
            <div className="flex items-center gap-1.5">
              <button onClick={onRemove}       className="text-[11px] font-bold text-[#1a1918] hover:underline">확인</button>
              <span className="text-[#e4e1da]">|</span>
              <button onClick={onCancelConfirm} className="text-[11px] text-[#97938c] hover:text-[#1a1918]">취소</button>
            </div>
          ) : (
            <button onClick={onConfirm} className="text-[11px] text-[#c3bfb8] hover:text-[#58554f] opacity-0 group-hover:opacity-100 transition-all">
              제거
            </button>
          )
        ) : (
          <button onClick={onEnroll} className="text-[11px] font-semibold text-[#1a1918] border border-[#1a1918] px-2.5 py-1 rounded-lg hover:bg-[#1a1918] hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            + 등록
          </button>
        )}
      </div>
    </div>
  );
}
