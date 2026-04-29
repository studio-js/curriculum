'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

interface Course     { id: string; title: string; start_date: string | null; end_date: string | null; }
interface Enrollment { id: string; student_id: string; course_id: string; status: 'pending' | 'active' | 'removed'; enrolled_at: string; }

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
  const [bulkBusy,    setBulkBusy]    = useState(false);
  const [confirmKey,  setConfirmKey]  = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>(initCourseId);
  const [query,       setQuery]       = useState('');
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [courseDropdown, setCourseDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  /* 드롭다운 외부 클릭 닫기 */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCourseDropdown(false);
      }
    }
    if (courseDropdown) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [courseDropdown]);

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

  async function handleBulkEnroll() {
    if (!selected.size || !selectedCourse) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        [...selected].map(sid =>
          adminFetch('/api/admin/enrollments', {
            method: 'POST',
            body: JSON.stringify({ student_id: sid, course_id: selectedCourse }),
          })
        )
      );
      setSelected(new Set());
      await fetchAll();
    } catch { setError('일괄 등록에 실패했습니다.'); }
    finally  { setBulkBusy(false); }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }
  function toggleSelectAll(ids: string[], checked: boolean) {
    const next = new Set(selected);
    ids.forEach(id => checked ? next.add(id) : next.delete(id));
    setSelected(next);
  }

  const course = courses.find(c => c.id === selectedCourse);

  /* 선택 과정의 수강 중 / 신청 중 / 미등록 학생 분리 */
  const { enrolled, pending, notEnrolled } = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = students.filter(s =>
      !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
    const en   = filtered.filter(s => getEnrollment(s.id, selectedCourse)?.status === 'active');
    const pen  = filtered.filter(s => getEnrollment(s.id, selectedCourse)?.status === 'pending');
    const not  = filtered.filter(s => {
      const e = getEnrollment(s.id, selectedCourse);
      return !e || e.status === 'removed';
    });
    return { enrolled: en, pending: pen, notEnrolled: not };
  }, [students, enrollments, selectedCourse, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const notEnrolledIds = notEnrolled.map(s => s.id);
  const allSelected    = notEnrolledIds.length > 0 && notEnrolledIds.every(id => selected.has(id));
  const someSelected   = notEnrolledIds.some(id => selected.has(id));

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── 헤더 ── */}
      <section className="pt-14 pb-8">
        <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase mb-3 font-semibold">관리자 · 수강생 관리</p>
        <h1 className="text-[30px] font-bold text-[#1a1918] tracking-tight leading-none">수강생 등록 및 관리</h1>
      </section>

      {/* ── 오류 ── */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[#d4d0c8] bg-[#f7f6f3] flex items-center justify-between gap-4">
          <p className="text-[13.5px] text-[#3a3835]">{error}</p>
          <button onClick={() => setError('')} className="text-[12px] text-[#7a766f] hover:text-[#1a1918]">닫기</button>
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
          {/* ── 과정 선택 (드롭다운) ── */}
          {courses.length > 0 && (
            <div ref={dropdownRef} className="relative mb-6 w-full max-w-[420px]">
              <button
                onClick={() => setCourseDropdown(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-[#d4d0c8] rounded-lg hover:border-[#1a1918] transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7a766f] flex-shrink-0">과정</span>
                  <span className="text-[14px] font-semibold text-[#1a1918] truncate">{course?.title ?? '선택'}</span>
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`flex-shrink-0 text-[#7a766f] transition-transform ${courseDropdown ? 'rotate-180' : ''}`}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {courseDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#d4d0c8] rounded-lg shadow-lg overflow-hidden z-10 max-h-[320px] overflow-y-auto">
                  {courses.map(c => {
                    const enrolledN = enrollments.filter(e => e.course_id === c.id && e.status === 'active' ).length;
                    const pendingN  = enrollments.filter(e => e.course_id === c.id && e.status === 'pending').length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCourse(c.id); setQuery(''); setSelected(new Set()); setCourseDropdown(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors ${
                          selectedCourse === c.id ? 'bg-[#f7f6f3]' : 'hover:bg-[#fafaf9]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13.5px] truncate ${selectedCourse === c.id ? 'font-bold text-[#1a1918]' : 'font-medium text-[#3a3835]'}`}>{c.title}</p>
                          {c.start_date && (
                            <p className="text-[11.5px] text-[#7a766f] tabular-nums mt-0.5">{c.start_date} — {c.end_date}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {pendingN > 0 && (
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white bg-[#1a1918] px-2 py-0.5 rounded-full leading-none">신청 {pendingN}</span>
                          )}
                          <span className="text-[12px] font-semibold tabular-nums text-[#7a766f]">{enrolledN}명</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 선택 과정 헤더 카드 ── */}
          {course && (
            <div className="border-2 border-[#1a1918] rounded-xl p-5 mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#1a1918] tracking-tight mb-1">{course.title}</h2>
                {course.start_date && (
                  <p className="text-[12.5px] text-[#7a766f] tabular-nums">{course.start_date} — {course.end_date}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[28px] font-bold tabular-nums text-[#1a1918] leading-none">{enrolled.length}</p>
                <p className="text-[12px] text-[#7a766f] mt-1">명 수강중</p>
              </div>
            </div>
          )}

          {/* ── 검색 + 일괄 작업 바 ── */}
          <div className="flex items-center gap-3 mb-5">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="이름 또는 이메일 검색"
              className="flex-1 pl-4 pr-4 py-2.5 text-[13.5px] bg-white border border-[#d4d0c8] rounded-lg text-[#1a1918] placeholder-[#a8a39c] focus:outline-none focus:border-[#1a1918] transition-colors"
            />
            {selected.size > 0 && (
              <button
                onClick={handleBulkEnroll}
                disabled={bulkBusy}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {bulkBusy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                선택 {selected.size}명 등록
              </button>
            )}
          </div>

          {/* ── 수강 중 ── */}
          <section className="mt-2">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[#1a1918]">
              <h3 className="text-[14px] font-bold text-[#1a1918] tracking-tight">
                수강 중
              </h3>
              <span className="text-[14px] font-bold text-[#1a1918] tabular-nums">{enrolled.length}명</span>
            </div>

            {enrolled.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-[#7a766f]">수강 중인 학생이 없습니다.</p>
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

          {/* ── 신청 중 (pending) — 항상 표시 ── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[#1a1918]">
              <h3 className="text-[14px] font-bold text-[#1a1918] tracking-tight">신청 중</h3>
              <span className="text-[14px] font-bold text-[#1a1918] tabular-nums">{pending.length}명</span>
              {pending.length > 0 && (
                <span className="text-[11.5px] font-semibold text-[#3a3835] border border-[#3a3835] px-2 py-0.5 rounded uppercase tracking-[0.08em]">승인 대기</span>
              )}
            </div>
            {pending.length === 0 ? (
              <p className="py-8 text-center text-[13.5px] text-[#7a766f]">
                현재 신청 대기 중인 학생이 없습니다.
              </p>
            ) : (
              <>
                <TableHeader />
                {pending.map(student => {
                  const en  = getEnrollment(student.id, selectedCourse);
                  const key = `${student.id}-${selectedCourse}`;
                  return (
                    <PendingRow
                      key={student.id}
                      student={student}
                      enrolledAt={en?.enrolled_at}
                      isBusy={busy === key}
                      onApprove={() => handleEnroll(student.id, selectedCourse)}
                      onReject={() => handleRemove(student.id, selectedCourse)}
                    />
                  );
                })}
              </>
            )}
          </section>

          {/* ── 미등록 ── */}
          {notEnrolled.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center gap-3 pb-3 border-b border-[#d4d0c8]">
                <h3 className="text-[14px] font-bold text-[#3a3835] tracking-tight">미등록</h3>
                <span className="text-[14px] font-semibold text-[#3a3835] tabular-nums">{notEnrolled.length}명</span>
              </div>
              <TableHeader
                selectable
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onCheckAll={(c) => toggleSelectAll(notEnrolledIds, c)}
              />
              {notEnrolled.map(student => {
                const key = `${student.id}-${selectedCourse}`;
                return (
                  <StudentRow
                    key={student.id}
                    student={student}
                    isActive={false}
                    isBusy={busy === key}
                    isConfirm={false}
                    selectable
                    isSelected={selected.has(student.id)}
                    onToggleSelect={() => toggleSelect(student.id)}
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
            <div className="border border-[#d4d0c8] rounded-xl py-14 text-center mt-4">
              <p className="text-[14px] font-semibold text-[#1a1918]">등록된 과정이 없습니다.</p>
              <p className="text-[13px] text-[#7a766f] mt-2">supabase-lms-setup.sql 을 실행하세요.</p>
            </div>
          )}
        </>
      )}

      <div className="pb-16" />
    </div>
  );
}

function TableHeader({
  selectable, checked, indeterminate, onCheckAll,
}: {
  selectable?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  onCheckAll?: (checked: boolean) => void;
}) {
  return (
    <div className={`grid ${selectable ? 'grid-cols-[28px_1fr_1.5fr_110px_72px]' : 'grid-cols-[1fr_1.5fr_110px_72px]'} gap-3 px-3 py-2.5 text-[#7a766f] border-b border-[#e4e1da]`}>
      {selectable && (
        <Checkbox
          checked={!!checked}
          indeterminate={!!indeterminate}
          onChange={onCheckAll!}
        />
      )}
      {['이름', '이메일', '등록일', ''].map((h, i) => (
        <span key={i} className="text-[11px] font-semibold uppercase tracking-[0.08em]">{h}</span>
      ))}
    </div>
  );
}

function Checkbox({
  checked, indeterminate, onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  return (
    <label className="inline-flex items-center justify-center cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="appearance-none w-4 h-4 border border-[#a8a39c] rounded checked:bg-[#1a1918] checked:border-[#1a1918] indeterminate:bg-[#1a1918] indeterminate:border-[#1a1918] transition-colors cursor-pointer relative
                   before:content-[''] before:absolute before:inset-0 before:bg-no-repeat before:bg-center
                   checked:before:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010%208%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M1%204L4%207L9%201%22%20stroke%3D%22white%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]
                   indeterminate:before:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010%202%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M1%201H9%22%20stroke%3D%22white%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')]"
      />
    </label>
  );
}

function PendingRow({
  student, enrolledAt, isBusy, onApprove, onReject,
}: {
  student: Profile;
  enrolledAt?: string;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const dateStr = enrolledAt
    ? new Date(enrolledAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
    : '—';

  return (
    <div className="grid grid-cols-[1fr_1.5fr_110px_72px] gap-3 items-center px-3 py-3.5 border-b border-[#f2f1ee] hover:bg-[#f7f6f3] transition-colors group">
      <span className="text-[13.5px] font-medium text-[#1a1918] truncate">
        {student.name ?? <span className="text-[#a8a39c] italic text-[12.5px]">미입력</span>}
      </span>
      <span className="text-[13px] text-[#3a3835] truncate">{student.email}</span>
      <span className="text-[12.5px] text-[#7a766f] tabular-nums">{dateStr}</span>

      <div className="flex items-center justify-end gap-2">
        {isBusy ? (
          <span className="w-4 h-4 border-2 border-[#e4e1da] border-t-[#7a766f] rounded-full animate-spin inline-block" />
        ) : (
          <>
            <button
              onClick={onReject}
              className="text-[12px] text-[#7a766f] hover:text-[#1a1918] opacity-0 group-hover:opacity-100 transition-all"
            >
              거절
            </button>
            <button
              onClick={onApprove}
              className="text-[12px] font-semibold text-white bg-[#1a1918] px-3 py-1 rounded-lg hover:bg-[#2d2b29] transition-colors"
            >
              승인
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StudentRow({
  student, enrolledAt, isActive, isBusy, isConfirm,
  selectable, isSelected, onToggleSelect,
  onEnroll, onConfirm, onRemove, onCancelConfirm,
}: {
  student: Profile;
  enrolledAt?: string;
  isActive: boolean;
  isBusy: boolean;
  isConfirm: boolean;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEnroll?: () => void;
  onConfirm: () => void;
  onRemove: () => void;
  onCancelConfirm: () => void;
}) {
  const dateStr = enrolledAt
    ? new Date(enrolledAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
    : '—';

  return (
    <div className={`grid ${selectable ? 'grid-cols-[28px_1fr_1.5fr_110px_72px]' : 'grid-cols-[1fr_1.5fr_110px_72px]'} gap-3 items-center px-3 py-3.5 border-b border-[#f2f1ee] transition-colors group ${
      isActive ? 'hover:bg-[#f7f6f3]' : 'hover:bg-[#f7f6f3]'
    } ${isSelected ? 'bg-[#f7f6f3]' : ''}`}>
      {selectable && (
        <Checkbox checked={!!isSelected} onChange={() => onToggleSelect?.()} />
      )}

      <span className="text-[13.5px] font-medium text-[#1a1918] truncate">
        {student.name ?? <span className="text-[#a8a39c] italic text-[12.5px]">미입력</span>}
      </span>
      <span className="text-[13px] text-[#3a3835] truncate">{student.email}</span>
      <span className="text-[12.5px] text-[#7a766f] tabular-nums">{dateStr}</span>

      <div className="flex items-center justify-end">
        {isBusy ? (
          <span className="w-4 h-4 border-2 border-[#e4e1da] border-t-[#7a766f] rounded-full animate-spin inline-block" />
        ) : isActive ? (
          isConfirm ? (
            <div className="flex items-center gap-1.5">
              <button onClick={onRemove}       className="text-[12px] font-bold text-[#1a1918] hover:underline">확인</button>
              <span className="text-[#d4d0c8]">|</span>
              <button onClick={onCancelConfirm} className="text-[12px] text-[#7a766f] hover:text-[#1a1918]">취소</button>
            </div>
          ) : (
            <button onClick={onConfirm} className="text-[12px] text-[#a8a39c] hover:text-[#1a1918] opacity-0 group-hover:opacity-100 transition-all">
              제거
            </button>
          )
        ) : (
          <button onClick={onEnroll} className="text-[12px] font-semibold text-[#1a1918] border border-[#1a1918] px-3 py-1 rounded-lg hover:bg-[#1a1918] hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            + 등록
          </button>
        )}
      </div>
    </div>
  );
}
