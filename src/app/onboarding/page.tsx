'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Course {
  id:          string;
  title:       string;
  description: string | null;
  start_date:  string | null;
  end_date:    string | null;
}

interface Enrollment {
  course_id: string;
  status:    'pending' | 'active' | 'removed';
}

export default function OnboardingPage() {
  const { user, profile, loading, isAdmin, refreshProfile } = useAuthContext();
  const router = useRouter();

  const [name,        setName]        = useState('');
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');
  const [fetching,    setFetching]    = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    /* 이름 + 적어도 하나의 enrollment 가 있으면 통과 */
  }, [loading, user, router]);

  /* 기존 이름 prefill */
  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  /* 과정 + 본인 enrollment 조회 (관리자는 fetch 불필요) */
  useEffect(() => {
    if (!user) return;
    if (isAdmin) { setFetching(false); return; }
    (async () => {
      setFetching(true);
      try {
        const [{ data: cData }, { data: eData }] = await Promise.all([
          supabase.from('courses').select('id, title, description, start_date, end_date').order('start_date', { ascending: true }),
          supabase.from('enrollments').select('course_id, status').eq('student_id', user.id),
        ]);
        setCourses(cData ?? []);
        setEnrollments((eData ?? []) as Enrollment[]);
      } finally {
        setFetching(false);
      }
    })();
  }, [user, isAdmin]);

  /* 이미 통과 조건 충족 시 홈으로
     - 관리자: 이름만 있으면 통과
     - 학생: 이름 + 한 개 이상 enrollment(active 또는 pending) */
  useEffect(() => {
    if (loading || fetching) return;
    if (!profile?.name?.trim()) return;
    if (isAdmin) {
      router.replace('/');
    } else if (enrollments.some(e => e.status === 'active' || e.status === 'pending')) {
      router.replace('/');
    }
  }, [loading, fetching, profile, isAdmin, enrollments, router]);

  function selectOne(courseId: string) {
    setSelected(new Set(selected.has(courseId) ? [] : [courseId]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user) return;

    setBusy(true);
    setError('');
    try {
      // 1) 이름 저장
      if (!profile?.name || profile.name !== trimmed) {
        const { error: dbErr } = await supabase
          .from('profiles')
          .update({ name: trimmed })
          .eq('id', user.id);
        if (dbErr) throw dbErr;
      }

      // 2) 최신 enrollment 재조회 (stale state 방지)
      const { data: freshEnrolls } = await supabase
        .from('enrollments')
        .select('course_id, status')
        .eq('student_id', user.id);
      const freshMap = new Map((freshEnrolls ?? []).map(e => [e.course_id as string, e.status as string]));

      // 3) 분류:
      //    - active/pending: skip
      //    - removed: UPDATE → pending (재신청)
      //    - 없음: INSERT pending (신규)
      const toInsert: string[]   = [];
      const toReapply: string[]  = [];
      for (const cid of selected) {
        const s = freshMap.get(cid);
        if (s === 'active' || s === 'pending') continue;
        if (s === 'removed') toReapply.push(cid);
        else                 toInsert.push(cid);
      }

      if (toInsert.length > 0) {
        const rows = toInsert.map(course_id => ({
          student_id: user.id,
          course_id,
          status:     'pending' as const,
        }));
        const { error: enrollErr } = await supabase.from('enrollments').insert(rows);
        if (enrollErr) throw enrollErr;
      }

      for (const cid of toReapply) {
        // .eq('status', 'removed') 추가 → 이미 다른 status로 변경됐어도 0행 영향, 에러 없음
        const { error: upErr } = await supabase
          .from('enrollments')
          .update({ status: 'pending', removed_at: null })
          .eq('student_id', user.id)
          .eq('course_id',  cid)
          .eq('status',     'removed');
        if (upErr) throw upErr;
      }

      await refreshProfile();
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      console.error('Onboarding submit failed:', err);
      setError(`저장에 실패했습니다: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
      </div>
    );
  }

  /* enrollment 상태별 분류 */
  const enrolledMap = new Map(enrollments.map(e => [e.course_id, e.status]));

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-start justify-center bg-[#f7f6f3] px-4 py-12">
      <div className="w-full max-w-[520px]">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase font-semibold mb-3">시작하기</p>
          <h1 className="text-[28px] font-bold text-[#1a1918] tracking-tight">반갑습니다</h1>
          <p className="text-[14px] text-[#3a3835] mt-2.5 leading-relaxed">
            {isAdmin ? '이름을 알려주세요.' : '이름을 알려주시고, 신청할 과정을 선택해주세요.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#d4d0c8] p-7">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* 이름 */}
            <div className="space-y-2">
              <label className="block text-[12.5px] font-semibold text-[#1a1918]">
                이름
              </label>
              <input
                type="text"
                autoFocus
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                maxLength={50}
                required
                className="w-full bg-[#f9f8f6] border border-[#d4d0c8] rounded-xl px-4 py-3 text-[14.5px] text-[#1a1918] placeholder-[#a8a39c] focus:outline-none focus:border-[#1a1918] focus:bg-white transition-colors"
              />
            </div>

            {/* 이메일 (read-only) */}
            <div className="space-y-2">
              <label className="block text-[12.5px] font-semibold text-[#1a1918]">
                이메일
              </label>
              <div className="w-full bg-[#f7f6f3] border border-[#e4e1da] rounded-xl px-4 py-3 text-[14px] text-[#7a766f]">
                {profile?.email ?? user?.email ?? '—'}
              </div>
            </div>

            {/* 과정 신청 (관리자는 표시 안 함, 1개만 선택) */}
            {!isAdmin && courses.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <label className="block text-[12.5px] font-semibold text-[#1a1918]">
                    수강 신청 <span className="text-[11.5px] font-normal text-[#7a766f] ml-1">(1개 선택)</span>
                  </label>
                  <span className="text-[12px] text-[#7a766f]">관리자 승인 후 활성화</span>
                </div>
                <div className="space-y-2">
                  {courses.map(c => {
                    const status   = enrolledMap.get(c.id);
                    const disabled = status === 'active' || status === 'pending';
                    const isSel    = selected.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                          disabled
                            ? 'border-[#e4e1da] bg-[#f7f6f3] cursor-not-allowed'
                            : isSel
                              ? 'border-[#1a1918] bg-white'
                              : 'border-[#d4d0c8] bg-white hover:border-[#7a766f]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="course-select"
                          checked={isSel || (disabled && status === 'active')}
                          disabled={disabled}
                          onChange={() => selectOne(c.id)}
                          className="appearance-none w-4 h-4 mt-0.5 border border-[#a8a39c] rounded-full checked:border-[5px] checked:border-[#1a1918] disabled:opacity-50 cursor-pointer flex-shrink-0 transition-all"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-[14px] font-semibold ${disabled ? 'text-[#7a766f]' : 'text-[#1a1918]'}`}>{c.title}</p>
                            {status === 'active' && (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white bg-[#1a1918] px-1.5 py-0.5 rounded leading-none">수강 중</span>
                            )}
                            {status === 'pending' && (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3a3835] border border-[#3a3835] px-1.5 py-0.5 rounded leading-none">신청 중</span>
                            )}
                          </div>
                          {c.start_date && (
                            <p className="text-[12px] text-[#7a766f] tabular-nums mt-1">{c.start_date} — {c.end_date}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-[#fdf5f3] border border-[#e8b4a8]">
                <p className="text-[13px] text-[#b04030]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !name.trim() || (!isAdmin && selected.size === 0)}
              className="w-full py-3.5 rounded-xl bg-[#1a1918] text-white text-[14.5px] font-semibold tracking-[0.02em] hover:bg-[#2d2b29] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  저장 중…
                </>
              ) : isAdmin ? (
                '시작하기 →'
              ) : selected.size > 0 ? (
                '신청하고 시작하기 →'
              ) : (
                '신청할 과정을 선택해주세요'
              )}
            </button>
          </form>
        </div>

        {!isAdmin && (
          <p className="text-center text-[12px] text-[#7a766f] mt-6">
            신청한 과정은 관리자 승인 후 수강 가능합니다.
          </p>
        )}
      </div>
    </div>
  );
}
