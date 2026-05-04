'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Course { id: string; title: string; start_date: string | null; end_date: string | null; }
interface NodeScheduleEntry { node_slug: string; available_from: string | null; }
interface DbSubject { id: string; slug: string; title: string; category: string; description: string | null; total_hours: number; position: number; }
interface DbNode    { id: string; slug: string; subject_id: string; title: string; description: string | null; hours: number; position: number; }

const INTERVALS = [
  { label: '매주',  days: 7  },
  { label: '격주',  days: 14 },
  { label: '4주',   days: 28 },
];

/* 카테고리 표시 순서 + 라벨 */
const CATEGORY_ORDER: Array<{ key: string; label: string; description: string }> = [
  { key: '정규교과', label: '정규교과',   description: '본 커리큘럼의 핵심 교과' },
  { key: '프로젝트', label: '프로젝트',   description: '실전 적용·통합 프로젝트' },
  { key: '기타',     label: '운영·기타', description: '온보딩·세미나·운영 콘텐츠' },
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

interface FlatNode {
  subjectId:    string;
  subjectTitle: string;
  category:     string;
  nodeId:       string;
  nodeTitle:    string;
  nodeHours:    number;
}

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

  const [dbSubjects,    setDbSubjects]    = useState<DbSubject[]>([]);
  const [dbNodes,       setDbNodes]       = useState<DbNode[]>([]);

  const [autoStart,    setAutoStart]    = useState('');
  const [autoInterval, setAutoInterval] = useState(7);
  const [preview,      setPreview]      = useState(false);
  const [courseDropdown, setCourseDropdown] = useState(false);
  const [subjectBulk,    setSubjectBulk]    = useState<string | null>(null);
  const [subjectStart,   setSubjectStart]   = useState('');
  const [subjectInterval,setSubjectInterval]= useState(7);
  const [editingCourse,  setEditingCourse]  = useState(false);
  const [editStart,      setEditStart]      = useState('');
  const [editEnd,        setEditEnd]        = useState('');
  const [editTitle,      setEditTitle]      = useState('');
  const [editSaving,     setEditSaving]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCourseDropdown(false);
      }
    }
    if (courseDropdown) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [courseDropdown]);

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

  const fetchCurriculum = useCallback(async (courseId: string) => {
    if (!courseId) return;
    try {
      const res  = await adminFetch(`/api/admin/curriculum?course_id=${courseId}`);
      const data = await res.json();
      setDbSubjects(data.subjects ?? []);
      setDbNodes(data.nodes ?? []);
    } catch {
      setError('커리큘럼 정보를 불러오는데 실패했습니다.');
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
  useEffect(() => {
    if (selectedCourse) {
      fetchCurriculum(selectedCourse);
      fetchSchedule(selectedCourse);
    }
  }, [selectedCourse, fetchCurriculum, fetchSchedule]);


  /* DB 데이터를 화면용 평면 노드 리스트로 변환 (subject 순서 → 노드 순서) */
  const allNodes = useMemo<FlatNode[]>(() => {
    const subjectById = new Map(dbSubjects.map(s => [s.id, s]));
    const sortedNodes = [...dbNodes].sort((a, b) => {
      const sa = subjectById.get(a.subject_id);
      const sb = subjectById.get(b.subject_id);
      if (sa && sb && sa.position !== sb.position) return sa.position - sb.position;
      return a.position - b.position;
    });
    return sortedNodes
      .filter(n => subjectById.has(n.subject_id))
      .map(n => {
        const s = subjectById.get(n.subject_id)!;
        return {
          subjectId:    s.slug,
          subjectTitle: s.title,
          category:     s.category,
          nodeId:       n.slug,
          nodeTitle:    n.title,
          nodeHours:    n.hours,
        };
      });
  }, [dbSubjects, dbNodes]);

  const dirtyCount = useMemo(() =>
    allNodes.filter(n => schedule[n.nodeId] !== savedSchedule[n.nodeId]).length
  , [allNodes, schedule, savedSchedule]);

  /* Bulk preview: assign dates sequentially across all nodes */
  const previewDates = useMemo(() => {
    if (!autoStart) return {};
    return allNodes.reduce<Record<string, string>>((acc, n, i) => {
      acc[n.nodeId] = addDays(autoStart, i * autoInterval);
      return acc;
    }, {});
  }, [allNodes, autoStart, autoInterval]);

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

  /* 과정 편집 모드 진입 시 현재 값 prefill */
  function startEditCourse() {
    if (!selectedCourseObj) return;
    setEditTitle(selectedCourseObj.title);
    setEditStart(selectedCourseObj.start_date ?? '');
    setEditEnd(selectedCourseObj.end_date ?? '');
    setEditingCourse(true);
  }

  async function saveEditCourse() {
    if (!selectedCourseObj) return;
    setEditSaving(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/courses', {
        method: 'PATCH',
        body: JSON.stringify({
          id:         selectedCourseObj.id,
          title:      editTitle.trim(),
          start_date: editStart || null,
          end_date:   editEnd   || null,
        }),
      });
      if (!res.ok) throw new Error();
      await fetchCourses();
      setEditingCourse(false);
    } catch {
      setError('과정 정보 수정에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  }

  /* 과목 단위 일괄 설정 */
  function applySubjectBulk(subjectId: string) {
    if (!subjectStart) return;
    const group = groupedNodes.find(g => g.subjectId === subjectId);
    if (!group) return;
    const updates: Record<string, string> = {};
    group.nodes.forEach((n, i) => {
      updates[n.nodeId] = addDays(subjectStart, i * subjectInterval);
    });
    setSchedule(prev => ({ ...prev, ...updates }));
    setSubjectBulk(null);
    setSubjectStart('');
  }

  /* Group nodes by subject for display */
  const groupedNodes = useMemo(() => {
    const groups: { subjectId: string; subjectTitle: string; category: string; nodes: FlatNode[] }[] = [];
    for (const node of allNodes) {
      const last = groups[groups.length - 1];
      if (last?.subjectId === node.subjectId) {
        last.nodes.push(node);
      } else {
        groups.push({ subjectId: node.subjectId, subjectTitle: node.subjectTitle, category: node.category, nodes: [node] });
      }
    }
    return groups;
  }, [allNodes]);

  /* 카테고리별로 묶기 — CATEGORY_ORDER 순서대로 */
  const categorizedGroups = useMemo(() => {
    const byCategory: Record<string, typeof groupedNodes> = {};
    for (const g of groupedNodes) {
      if (!byCategory[g.category]) byCategory[g.category] = [];
      byCategory[g.category].push(g);
    }
    return CATEGORY_ORDER
      .map(c => ({ ...c, subjects: byCategory[c.key] ?? [] }))
      .filter(c => c.subjects.length > 0);
  }, [groupedNodes]);

  async function handleDeleteCourse() {
    if (!selectedCourseObj) return;
    const ok = window.confirm(`"${selectedCourseObj.title}" 과정을 삭제하시겠습니까?\n\n해당 과정에 등록된 수강생, 일정 등 모든 관련 데이터가 함께 삭제됩니다.`);
    if (!ok) return;
    setEditSaving(true); setError('');
    try {
      const res = await adminFetch('/api/admin/courses', {
        method: 'DELETE',
        body: JSON.stringify({ id: selectedCourseObj.id }),
      });
      if (!res.ok) throw new Error();
      window.location.href = '/';
    } catch {
      setError('과정 삭제에 실패했습니다.');
      setEditSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 animate-fadeIn">

      {/* ── 헤더 ── */}
      <section className="pt-14 pb-8">
        <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase mb-3 font-semibold">관리자 · 수업 일정 설정</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[30px] font-bold text-[#1a1918] tracking-tight leading-none">노드별 오픈 날짜</h1>
          <p className="text-[13px] text-[#7a766f] font-medium pb-1">노드 {allNodes.length}개</p>
        </div>
      </section>

      {/* ── 오류 배너 ── */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[#d4d0c8] bg-[#f7f6f3] flex items-center justify-between gap-4">
          <p className="text-[13.5px] text-[#3a3835]">{error}</p>
          <button onClick={() => setError('')} className="text-[12px] text-[#7a766f] hover:text-[#1a1918] flex-shrink-0">닫기</button>
        </div>
      )}

      {/* ── 과정 선택 (드롭다운) ── */}
      {courses.length > 0 && (
        <div ref={dropdownRef} className="relative mb-6 w-full max-w-[420px]">
          <button
            onClick={() => setCourseDropdown(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-[#d4d0c8] rounded-lg hover:border-[#1a1918] transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7a766f] flex-shrink-0">과정</span>
              <span className="text-[14px] font-semibold text-[#1a1918] truncate">{selectedCourseObj?.title ?? '선택'}</span>
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`flex-shrink-0 text-[#7a766f] transition-transform ${courseDropdown ? 'rotate-180' : ''}`}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {courseDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#d4d0c8] rounded-lg shadow-lg overflow-hidden z-10 max-h-[320px] overflow-y-auto">
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCourse(c.id); setCourseDropdown(false); }}
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
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 선택 과정 헤더 카드 ── */}
      {!loading && selectedCourseObj && !editingCourse && (
        <div className="border-2 border-[#1a1918] rounded-xl p-5 mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold text-[#1a1918] tracking-tight mb-1 truncate">{selectedCourseObj.title}</h2>
            {selectedCourseObj.start_date && (
              <p className="text-[12.5px] text-[#7a766f] tabular-nums">
                {selectedCourseObj.start_date} — {selectedCourseObj.end_date}
              </p>
            )}
            <button
              onClick={startEditCourse}
              className="text-[12px] font-semibold text-[#1a1918] hover:underline mt-3"
            >
              과정 정보 편집 →
            </button>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[28px] font-bold tabular-nums text-[#1a1918] leading-none">{allNodes.length}</p>
            <p className="text-[12px] text-[#7a766f] mt-1">개 노드</p>
          </div>
        </div>
      )}

      {/* ── 과정 편집 폼 ── */}
      {!loading && selectedCourseObj && editingCourse && (
        <div className="border-2 border-[#1a1918] rounded-xl p-5 mb-6 space-y-4">
          <p className="text-[14px] font-bold text-[#1a1918] tracking-tight">과정 정보 편집</p>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-[#3a3835]">과정명</label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-[14px] border border-[#d4d0c8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-[#3a3835]">시작일</label>
              <input
                type="date"
                value={editStart}
                onChange={e => setEditStart(e.target.value)}
                className="w-full text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-[#3a3835]">종료일</label>
              <input
                type="date"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
                className="w-full text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors tabular-nums"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1 items-center">
            <button
              onClick={saveEditCourse}
              disabled={editSaving || !editTitle.trim()}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {editSaving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              저장
            </button>
            <button
              onClick={() => setEditingCourse(false)}
              className="text-[13px] px-4 py-2 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] transition-colors"
            >
              취소
            </button>
            <span className="flex-1" />
            <button
              onClick={handleDeleteCourse}
              disabled={editSaving}
              className="text-[12.5px] text-[#b04030] hover:text-[#7a2818] disabled:opacity-40 transition-colors"
            >
              과정 삭제
            </button>
          </div>
        </div>
      )}

      {/* ── 일괄 자동 설정 카드 ── */}
      {!loading && courses.length > 0 && (
        <div className="border border-[#d4d0c8] rounded-xl bg-white p-5 mb-8">
          <p className="text-[14px] font-bold text-[#1a1918] tracking-tight mb-4">
            일괄 자동 설정
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#3a3835] mb-1.5">시작일</label>
              <input
                type="date"
                value={autoStart}
                onChange={e => setAutoStart(e.target.value)}
                className="text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#3a3835] mb-1.5">노드 오픈 간격</label>
              <div className="flex gap-1">
                {INTERVALS.map(iv => (
                  <button
                    key={iv.days}
                    onClick={() => setAutoInterval(iv.days)}
                    className={`text-[13px] px-3.5 py-2 rounded-lg border font-medium transition-colors ${
                      autoInterval === iv.days
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'border-[#d4d0c8] text-[#3a3835] hover:border-[#1a1918] hover:text-[#1a1918]'
                    }`}
                  >{iv.label}</button>
                ))}
              </div>
            </div>

            {autoStart && (
              <div className="text-[13px] text-[#3a3835] leading-relaxed pb-0.5">
                → 마지막 노드 예정일
                <span className="font-semibold text-[#1a1918] ml-1">{lastPreviewDate}</span>
              </div>
            )}

            <button
              onClick={() => setPreview(true)}
              disabled={!autoStart}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg border border-[#1a1918] text-[#1a1918] hover:bg-[#1a1918] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              자동 계산 미리보기
            </button>
          </div>

          {/* 미리보기 패널 */}
          {preview && autoStart && (
            <div className="mt-5 pt-5 border-t border-[#d4d0c8]">
              <p className="text-[13px] text-[#3a3835] mb-3">
                아래 일정으로 <strong className="text-[#1a1918]">전체 {allNodes.length}개 노드</strong>의 오픈일이 변경됩니다.
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 max-h-52 overflow-y-auto mb-4 pr-1">
                {allNodes.map((n, i) => (
                  <div key={n.nodeId} className="flex items-center gap-2 py-1 text-[12.5px]">
                    <span className="text-[#a8a39c] tabular-nums w-5 flex-shrink-0 text-right">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[#3a3835] truncate flex-1 min-w-0">{n.nodeTitle}</span>
                    <span className="text-[#1a1918] font-semibold tabular-nums flex-shrink-0">{previewDates[n.nodeId]}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={applyBulk} className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] transition-colors">
                  전체 적용
                </button>
                <button onClick={() => setPreview(false)} className="text-[13px] px-4 py-2 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] transition-colors">
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

      {/* ── 빈 커리큘럼 상태: 커리큘럼 관리 페이지로 안내 ── */}
      {!loading && courses.length > 0 && allNodes.length === 0 && (
        <div className="border border-[#d4d0c8] rounded-xl py-14 px-6 text-center">
          <p className="text-[15.5px] font-semibold text-[#1a1918]">이 과정은 아직 커리큘럼이 비어있습니다</p>
          <p className="text-[13px] text-[#7a766f] mt-2 leading-relaxed">
            먼저 커리큘럼 관리 페이지에서 과목·노드를 구성한 뒤 일정을 설정할 수 있습니다.
          </p>
          <a
            href={`/admin/curriculum?course_id=${selectedCourse}`}
            className="mt-6 inline-flex items-center gap-2 text-[13.5px] font-semibold px-5 py-2.5 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] transition-colors"
          >
            커리큘럼 관리로 이동 →
          </a>
        </div>
      )}

      {/* ── 노드 목록 (과목별 그룹) ── */}
      {!loading && courses.length > 0 && allNodes.length > 0 && (
        <>
          {/* 컬럼 헤더 */}
          <div className="grid grid-cols-[1fr_80px_130px] gap-4 px-3 py-2.5 border-b-2 border-[#1a1918]">
            <span className="text-[12px] font-semibold text-[#3a3835] uppercase tracking-[0.08em]">노드</span>
            <span className="text-[12px] font-semibold text-[#3a3835] uppercase tracking-[0.08em]">시간</span>
            <span className="text-[12px] font-semibold text-[#3a3835] uppercase tracking-[0.08em] text-center">오픈일</span>
          </div>

          {categorizedGroups.map(cat => {
            const catNodeCount = cat.subjects.reduce((sum, s) => sum + s.nodes.length, 0);
            const catHours     = cat.subjects.reduce((sum, s) => sum + s.nodes.reduce((h, n) => h + n.nodeHours, 0), 0);
            return (
              <section key={cat.key} className="mt-10 first:mt-6">
                {/* 카테고리 헤더 */}
                <div className="px-3 pt-2 pb-3 mb-1 border-b border-[#1a1918] flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#1a1918] tracking-tight">{cat.label}</h2>
                    <p className="text-[12.5px] text-[#7a766f] mt-0.5">{cat.description}</p>
                  </div>
                  <p className="text-[12px] text-[#7a766f] tabular-nums pb-1">
                    {cat.subjects.length}과목 · {catNodeCount}노드 · {catHours}h
                  </p>
                </div>

                {cat.subjects.map(group => {
                  const isBulk     = subjectBulk === group.subjectId;
                  const isSingle   = group.nodes.length === 1;
                  const categoryLabel = group.category === '정규교과' ? '정규' : group.category;

            /* ── 1노드 과목: 과목 = 노드, 한 줄로 합침 ── */
            if (isSingle) {
              const node    = group.nodes[0];
              const current = schedule[node.nodeId] ?? '';
              const saved   = savedSchedule[node.nodeId] ?? '';
              const isDirty = current !== saved;

              return (
                <div
                  key={group.subjectId}
                  className={`grid grid-cols-[1fr_80px_130px] gap-4 items-center px-3 py-3.5 border-b border-[#e4e1da] last:border-b-0 transition-colors ${
                    isDirty ? 'bg-[#fafaf8]' : 'hover:bg-[#f7f6f3]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#1a1918] flex-shrink-0" />}
                    <span className={`text-[14px] font-bold tracking-tight truncate ${isDirty ? 'text-[#1a1918]' : 'text-[#1a1918]'}`}>
                      {group.subjectTitle}
                    </span>
                    <span className="text-[10px] font-semibold text-[#3a3835] border border-[#a8a39c] px-1.5 py-0.5 rounded tracking-[0.04em] uppercase leading-none flex-shrink-0">
                      {categoryLabel}
                    </span>
                  </div>

                  <span className="text-[12.5px] text-[#7a766f] tabular-nums">{node.nodeHours}h</span>

                  <input
                    type="date"
                    value={current}
                    onChange={e => setSchedule(prev => ({ ...prev, [node.nodeId]: e.target.value || null }))}
                    className={`text-[12.5px] border rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors tabular-nums w-full ${
                      isDirty
                        ? 'border-[#1a1918] text-[#1a1918] bg-white'
                        : 'border-[#d4d0c8] text-[#3a3835] bg-transparent'
                    } focus:border-[#1a1918] focus:text-[#1a1918] focus:bg-white`}
                  />
                </div>
              );
            }

            /* ── 다노드 과목: 구분선 + 노드 리스트 ── */
            return (
              <div key={group.subjectId} className="border-b border-[#e4e1da] last:border-b-0">
                {/* 과목 구분선 */}
                <div className="flex items-center gap-3 px-3 pt-6 pb-2.5">
                  <span className="text-[14px] font-bold text-[#1a1918] tracking-tight">{group.subjectTitle}</span>
                  <span className="text-[10px] font-semibold text-[#3a3835] border border-[#a8a39c] px-1.5 py-0.5 rounded tracking-[0.04em] uppercase leading-none">
                    {categoryLabel}
                  </span>
                  <span className="flex-1" />
                  <button
                    onClick={() => { setSubjectBulk(isBulk ? null : group.subjectId); setSubjectStart(''); }}
                    className={`text-[11.5px] font-semibold transition-colors ${isBulk ? 'text-[#1a1918]' : 'text-[#7a766f] hover:text-[#1a1918]'}`}
                  >
                    {isBulk ? '× 닫기' : '이 과목 일괄 →'}
                  </button>
                  <span className="text-[12px] text-[#a8a39c] tabular-nums">·</span>
                  <span className="text-[12px] text-[#7a766f] tabular-nums">{group.nodes.length}노드</span>
                </div>

                {/* 과목별 일괄 설정 폼 */}
                {isBulk && (
                  <div className="mx-3 mb-2 px-4 py-3 bg-[#f7f6f3] rounded-lg flex flex-wrap items-center gap-3">
                    <span className="text-[12px] font-semibold text-[#1a1918]">시작일</span>
                    <input
                      type="date"
                      value={subjectStart}
                      onChange={e => setSubjectStart(e.target.value)}
                      className="text-[13px] border border-[#d4d0c8] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] tabular-nums"
                    />
                    <span className="text-[12px] font-semibold text-[#1a1918] ml-2">간격</span>
                    <div className="flex gap-1">
                      {INTERVALS.map(iv => (
                        <button
                          key={iv.days}
                          onClick={() => setSubjectInterval(iv.days)}
                          className={`text-[12px] px-2.5 py-1.5 rounded-md border font-medium transition-colors ${
                            subjectInterval === iv.days
                              ? 'bg-[#1a1918] text-white border-[#1a1918]'
                              : 'border-[#d4d0c8] text-[#3a3835] hover:border-[#1a1918] hover:text-[#1a1918]'
                          }`}
                        >{iv.label}</button>
                      ))}
                    </div>
                    <span className="flex-1" />
                    <button
                      onClick={() => applySubjectBulk(group.subjectId)}
                      disabled={!subjectStart}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors"
                    >
                      {group.nodes.length}개 노드에 적용
                    </button>
                  </div>
                )}

                {group.nodes.map(node => {
                  const current = schedule[node.nodeId] ?? '';
                  const saved   = savedSchedule[node.nodeId] ?? '';
                  const isDirty = current !== saved;

                  return (
                    <div
                      key={node.nodeId}
                      className={`grid grid-cols-[1fr_80px_130px] gap-4 items-center px-3 py-2.5 transition-colors ${
                        isDirty ? 'bg-[#fafaf8]' : 'hover:bg-[#f7f6f3]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#1a1918] flex-shrink-0" />}
                        <span className={`text-[13.5px] font-medium truncate ${isDirty ? 'text-[#1a1918]' : 'text-[#3a3835]'}`}>
                          {node.nodeTitle}
                        </span>
                      </div>

                      <span className="text-[12.5px] text-[#7a766f] tabular-nums">{node.nodeHours}h</span>

                      <input
                        type="date"
                        value={current}
                        onChange={e => setSchedule(prev => ({ ...prev, [node.nodeId]: e.target.value || null }))}
                        className={`text-[12.5px] border rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors tabular-nums w-full ${
                          isDirty
                            ? 'border-[#1a1918] text-[#1a1918] bg-white'
                            : 'border-[#d4d0c8] text-[#3a3835] bg-transparent'
                        } focus:border-[#1a1918] focus:text-[#1a1918] focus:bg-white`}
                      />
                    </div>
                  );
                })}
              </div>
            );
                })}
              </section>
            );
          })}

          {/* ── 하단 저장 바 ── */}
          <div className="sticky bottom-0 py-4 mt-4 flex items-center justify-between gap-4 bg-white border-t border-[#d4d0c8]">
            <p className="text-[13px] text-[#3a3835]">
              {dirtyCount > 0
                ? <><span className="font-semibold text-[#1a1918]">{dirtyCount}개</span> 변경사항 미저장</>
                : saveOk
                  ? <span className="text-[#1a1918] font-semibold">저장 완료 ✓</span>
                  : <span className="text-[#7a766f]">변경사항 없음</span>
              }
            </p>
            <div className="flex gap-2">
              {dirtyCount > 0 && (
                <button
                  onClick={() => setSchedule(savedSchedule)}
                  className="text-[13px] px-4 py-2 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] transition-colors"
                >
                  초기화
                </button>
              )}
              <button
                onClick={handleSaveAll}
                disabled={saving || dirtyCount === 0}
                className={`text-[13px] font-semibold px-5 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
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
        <div className="border border-[#d4d0c8] rounded-xl py-16 text-center">
          <p className="text-[14px] font-semibold text-[#1a1918]">등록된 과정이 없습니다.</p>
          <p className="text-[13px] text-[#7a766f] mt-2">supabase-lms-setup.sql 을 실행하세요.</p>
        </div>
      )}

      <div className="pb-20" />
    </div>
  );
}
