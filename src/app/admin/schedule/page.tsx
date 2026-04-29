'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { curriculumData } from '@/data/curriculum';

interface Course { id: string; title: string; start_date: string | null; end_date: string | null; }
interface NodeScheduleEntry { node_slug: string; available_from: string | null; }

const INTERVALS = [
  { label: '매주',  days: 7  },
  { label: '격주',  days: 14 },
  { label: '4주',   days: 28 },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toIso(date: string): string | null {
  if (!date) return null;
  return `${date}T00:00:00.000Z`;
}

async function adminFetch(url: string, options?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${session.access_token}`,
      ...options?.headers,
    },
  });
}

/* Flat list of all nodes with their parent subject info */
const allNodes = curriculumData.subjects.flatMap(s =>
  s.nodes.map(n => ({
    subjectId:    s.id,
    subjectTitle: s.title,
    category:     s.category,
    nodeId:       n.id,
    nodeTitle:    n.title,
    nodeHours:    n.hours,
  }))
);

export default function SchedulePage() {
  const searchParams  = useSearchParams();
  const initCourseId  = searchParams.get('course_id') ?? '';

  const [courses,        setCourses]        = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initCourseId);
  const [savedSchedule,  setSavedSchedule]  = useState<Record<string, string | null>>({});
  const [schedule,       setSchedule]       = useState<Record<string, string | null>>({});
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [saveOk,         setSaveOk]         = useState(false);
  const [error,          setError]          = useState('');

  const [autoStart,    setAutoStart]    = useState('');
  const [autoInterval, setAutoInterval] = useState(7);
  const [preview,      setPreview]      = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const res  = await adminFetch('/api/admin/courses');
      const data = await res.json();
      const list: Course[] = data.courses ?? [];
      setCourses(list);
      if (list.length > 0) {
        const preferred = list.find(c => c.id === selectedCourse) ?? list[0];
        setSelectedCourse(preferred.id);
        setAutoStart(preferred.start_date ?? '');
      }
    } catch {
      setError('과정 정보를 불러오는데 실패했습니다.');
    }
  }, []);

  const fetchSchedule = useCallback(async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res  = await adminFetch(`/api/admin/node-schedule?course_id=${courseId}`);
      const data = await res.json();
      const map: Record<string, string | null> = {};
      for (const e of (data.schedule as NodeScheduleEntry[])) {
        map[e.node_slug] = e.available_from ? formatDate(e.available_from) : null;
      }
      setSavedSchedule(map);
      setSchedule(map);
    } catch {
      setError('일정 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { if (selectedCourse) fetchSchedule(selectedCourse); }, [selectedCourse, fetchSchedule]);

  const dirtyCount = useMemo(() =>
    allNodes.filter(n => schedule[n.nodeId] !== savedSchedule[n.nodeId]).length
  , [schedule, savedSchedule]);

  /* Bulk preview: assign dates sequentially across all nodes */
  const previewDates = useMemo(() => {
    if (!autoStart) return {};
    return allNodes.reduce<Record<string, string>>((acc, n, i) => {
      acc[n.nodeId] = addDays(autoStart, i * autoInterval);
      return acc;
    }, {});
  }, [autoStart, autoInterval]);

  function applyBulk() {
    setSchedule(previewDates);
    setPreview(false);
  }

  async function handleSaveAll() {
    if (!selectedCourse || dirtyCount === 0) return;
    setSaving(true); setSaveOk(false); setError('');
    try {
      const entries = allNodes
        .filter(n => schedule[n.nodeId] !== savedSchedule[n.nodeId])
        .map(n => ({
          course_id:      selectedCourse,
          node_slug:      n.nodeId,
          available_from: toIso(schedule[n.nodeId] ?? ''),
        }));

      const res = await adminFetch('/api/admin/node-schedule', {
        method: 'POST',
        body:   JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error();
      await fetchSchedule(selectedCourse);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const lastPreviewDate = previewDates[allNodes[allNodes.length - 1]?.nodeId];
  const selectedCourseObj = courses.find(c => c.id === selectedCourse);

  /* Group nodes by subject for display */
  const groupedNodes = useMemo(() => {
    const groups: { subjectId: string; subjectTitle: string; category: string; nodes: typeof allNodes }[] = [];
    for (const node of allNodes) {
      const last = groups[groups.length - 1];
      if (last?.subjectId === node.subjectId) {
        last.nodes.push(node);
      } else {
        groups.push({ subjectId: node.subjectId, subjectTitle: node.subjectTitle, category: node.category, nodes: [node] });
      }
    }
    return groups;
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── 헤더 ── */}
      <section className="pt-14 pb-8">
        <p className="text-[10px] tracking-[0.2em] text-[#97938c] uppercase mb-3 font-medium">관리자 · 수업 일정 설정</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[28px] font-bold text-[#1a1918] tracking-tight leading-none">노드별 오픈 날짜</h1>
          <p className="text-[12px] text-[#97938c] font-medium pb-1">노드 {allNodes.length}개</p>
        </div>
      </section>

      {/* ── 오류 배너 ── */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[#e4e1da] bg-[#f7f6f3] flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#58554f]">{error}</p>
          <button onClick={() => setError('')} className="text-[11px] text-[#97938c] hover:text-[#1a1918] flex-shrink-0">닫기</button>
        </div>
      )}

      {/* ── 과정 탭 ── */}
      {courses.length > 0 && (
        <div className="flex gap-1 bg-[#f7f6f3] rounded-lg p-1 mb-6 w-fit">
          {courses.map(c => (
            <button key={c.id} onClick={() => setSelectedCourse(c.id)}
              className={`text-[12px] px-4 py-2 rounded-md transition-colors font-medium ${
                selectedCourse === c.id
                  ? 'bg-white text-[#1a1918] shadow-sm border border-[#e4e1da]'
                  : 'text-[#97938c] hover:text-[#1a1918]'
              }`}
            >{c.title.length > 20 ? c.title.slice(0, 20) + '…' : c.title}</button>
          ))}
        </div>
      )}

      {/* ── 선택 과정 헤더 카드 ── */}
      {!loading && selectedCourseObj && (
        <div className="border-2 border-[#1a1918] rounded-xl p-5 mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#1a1918] tracking-tight mb-1">{selectedCourseObj.title}</h2>
            {selectedCourseObj.start_date && (
              <p className="text-[12px] text-[#97938c] tabular-nums">
                {selectedCourseObj.start_date} — {selectedCourseObj.end_date}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[28px] font-bold tabular-nums text-[#1a1918] leading-none">{allNodes.length}</p>
            <p className="text-[11px] text-[#97938c]">개 노드</p>
          </div>
        </div>
      )}

      {/* ── 일괄 자동 설정 카드 ── */}
      {!loading && courses.length > 0 && (
        <div className="border border-[#e4e1da] rounded-xl bg-white p-5 mb-8">
          <p className="text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em] mb-4">
            일괄 자동 설정
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[10px] font-medium text-[#c3bfb8] uppercase tracking-[0.08em] mb-1.5">시작일</label>
              <input
                type="date"
                value={autoStart}
                onChange={e => setAutoStart(e.target.value)}
                className="text-[13px] border border-[#e4e1da] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[#c3bfb8] uppercase tracking-[0.08em] mb-1.5">노드 오픈 간격</label>
              <div className="flex gap-1">
                {INTERVALS.map(iv => (
                  <button
                    key={iv.days}
                    onClick={() => setAutoInterval(iv.days)}
                    className={`text-[12px] px-3 py-2 rounded-lg border font-medium transition-colors ${
                      autoInterval === iv.days
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'border-[#e4e1da] text-[#97938c] hover:border-[#1a1918] hover:text-[#1a1918]'
                    }`}
                  >{iv.label}</button>
                ))}
              </div>
            </div>

            {autoStart && (
              <div className="text-[12px] text-[#58554f] leading-relaxed pb-0.5">
                → 마지막 노드 예정일
                <span className="font-semibold text-[#1a1918] ml-1">{lastPreviewDate}</span>
              </div>
            )}

            <button
              onClick={() => setPreview(true)}
              disabled={!autoStart}
              className="text-[12px] font-semibold px-4 py-2 rounded-lg border border-[#1a1918] text-[#1a1918] hover:bg-[#1a1918] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              자동 계산 미리보기
            </button>
          </div>

          {/* 미리보기 패널 */}
          {preview && autoStart && (
            <div className="mt-5 pt-5 border-t border-[#e4e1da]">
              <p className="text-[12px] text-[#58554f] mb-3">
                아래 일정으로 <strong className="text-[#1a1918]">전체 {allNodes.length}개 노드</strong>의 오픈일이 변경됩니다.
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 max-h-52 overflow-y-auto mb-4 pr-1">
                {allNodes.map((n, i) => (
                  <div key={n.nodeId} className="flex items-center gap-2 py-1 text-[12px]">
                    <span className="text-[#c3bfb8] tabular-nums w-5 flex-shrink-0 text-right">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[#58554f] truncate flex-1 min-w-0">{n.nodeTitle}</span>
                    <span className="text-[#1a1918] font-medium tabular-nums flex-shrink-0">{previewDates[n.nodeId]}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={applyBulk} className="text-[12px] font-semibold px-4 py-2 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] transition-colors">
                  전체 적용
                </button>
                <button onClick={() => setPreview(false)} className="text-[12px] px-4 py-2 rounded-lg border border-[#e4e1da] text-[#97938c] hover:text-[#1a1918] transition-colors">
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 로딩 ── */}
      {loading && (
        <div className="py-24 flex justify-center">
          <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
        </div>
      )}

      {/* ── 노드 목록 (과목별 그룹) ── */}
      {!loading && courses.length > 0 && (
        <>
          {/* 컬럼 헤더 */}
          <div className="grid grid-cols-[1fr_80px_130px] gap-4 px-3 py-2 border-b-2 border-[#1a1918]">
            {['노드', '시간', '오픈일'].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>

          {groupedNodes.map(group => (
            <div key={group.subjectId}>
              {/* 과목 구분선 */}
              <div className="flex items-center gap-3 px-3 pt-5 pb-2">
                <span className="text-[11px] font-bold text-[#1a1918] tracking-tight">{group.subjectTitle}</span>
                <span className="text-[9px] font-semibold text-[#c3bfb8] border border-[#e4e1da] px-1.5 py-0.5 rounded tracking-[0.04em] uppercase">
                  {group.category === '정규교과' ? '정규' : group.category}
                </span>
                <span className="flex-1 h-px bg-[#f2f1ee]" />
                <span className="text-[10px] text-[#c3bfb8] tabular-nums">{group.nodes.length}노드</span>
              </div>

              {group.nodes.map(node => {
                const current = schedule[node.nodeId] ?? '';
                const saved   = savedSchedule[node.nodeId] ?? '';
                const isDirty = current !== saved;

                return (
                  <div
                    key={node.nodeId}
                    className={`grid grid-cols-[1fr_80px_130px] gap-4 items-center px-3 py-2.5 border-b border-[#f2f1ee] transition-colors ${
                      isDirty ? 'bg-[#fafaf8]' : 'hover:bg-[#f7f6f3]'
                    }`}
                  >
                    {/* 노드명 */}
                    <div className="flex items-center gap-2 min-w-0">
                      {isDirty && <span className="w-1 h-1 rounded-full bg-[#1a1918] flex-shrink-0" />}
                      <span className={`text-[13px] font-medium truncate ${isDirty ? 'text-[#1a1918]' : 'text-[#58554f]'}`}>
                        {node.nodeTitle}
                      </span>
                    </div>

                    {/* 시간 */}
                    <span className="text-[11px] text-[#c3bfb8] tabular-nums">{node.nodeHours}h</span>

                    {/* 날짜 입력 */}
                    <input
                      type="date"
                      value={current}
                      onChange={e => setSchedule(prev => ({ ...prev, [node.nodeId]: e.target.value || null }))}
                      className={`text-[12px] border rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors tabular-nums w-full ${
                        isDirty
                          ? 'border-[#1a1918] text-[#1a1918] bg-white'
                          : 'border-[#e4e1da] text-[#97938c] bg-transparent'
                      } focus:border-[#1a1918] focus:text-[#1a1918] focus:bg-white`}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── 하단 저장 바 ── */}
          <div className="sticky bottom-0 py-4 mt-4 flex items-center justify-between gap-4 bg-white border-t border-[#e4e1da]">
            <p className="text-[12px] text-[#97938c]">
              {dirtyCount > 0
                ? <><span className="font-semibold text-[#1a1918]">{dirtyCount}개</span> 변경사항 미저장</>
                : saveOk
                  ? <span className="text-[#3a3835]">저장 완료 ✓</span>
                  : <span className="text-[#c3bfb8]">변경사항 없음</span>
              }
            </p>
            <div className="flex gap-2">
              {dirtyCount > 0 && (
                <button
                  onClick={() => setSchedule(savedSchedule)}
                  className="text-[12px] px-4 py-2 rounded-lg border border-[#e4e1da] text-[#97938c] hover:text-[#1a1918] transition-colors"
                >
                  초기화
                </button>
              )}
              <button
                onClick={handleSaveAll}
                disabled={saving || dirtyCount === 0}
                className={`text-[12px] font-semibold px-5 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  saveOk
                    ? 'border-[#1a1918] bg-[#1a1918] text-white'
                    : 'border-[#1a1918] text-[#1a1918] hover:bg-[#1a1918] hover:text-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {saveOk ? '저장됨 ✓' : `전체 저장${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      {!loading && courses.length === 0 && (
        <div className="border border-[#e4e1da] rounded-xl py-16 text-center">
          <p className="text-[13px] text-[#97938c]">등록된 과정이 없습니다.</p>
          <p className="text-[12px] text-[#c3bfb8] mt-1">supabase-lms-setup.sql 을 실행하세요.</p>
        </div>
      )}

      <div className="pb-20" />
    </div>
  );
}
