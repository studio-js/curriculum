'use client';

import { useState, useEffect, useCallback, useMemo, useRef, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Course  { id: string; title: string; start_date: string | null; end_date: string | null; }
interface Subject { id: string; slug: string; title: string; category: string; description: string | null; total_hours: number; position: number; }
interface CNode   { id: string; slug: string; subject_id: string; title: string; description: string | null; hours: number; position: number; }

type Category = '정규교과' | '프로젝트' | '기타';
const CATEGORIES: Category[] = ['정규교과', '프로젝트', '기타'];
const CATEGORY_ORDER: Array<{ key: Category; label: string }> = [
  { key: '정규교과', label: '정규교과' },
  { key: '프로젝트', label: '프로젝트' },
  { key: '기타',     label: '운영·기타' },
];

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

export default function CurriculumPage() {
  const searchParams  = useSearchParams();
  const initCourseId  = searchParams.get('course_id') ?? '';

  const [courses,        setCourses]        = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initCourseId);
  const [subjects,       setSubjects]       = useState<Subject[]>([]);
  const [nodes,          setNodes]          = useState<CNode[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [busy,           setBusy]           = useState(false);
  const [importOpen,     setImportOpen]     = useState(false);
  const [editSubject,    setEditSubject]    = useState<Subject | null>(null);
  const [editNode,       setEditNode]       = useState<CNode   | null>(null);
  const [courseDropdown, setCourseDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* 외부 클릭 시 드롭다운 닫기 */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCourseDropdown(false);
      }
    }
    if (courseDropdown) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [courseDropdown]);

  /* 과정 목록 + 커리큘럼 fetch */
  const fetchCourses = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/courses');
      const data = await res.json();
      const list: Course[] = data.courses ?? [];
      setCourses(list);
      if (list.length > 0) {
        const preferred = list.find(c => c.id === selectedCourse) ?? list[0];
        setSelectedCourse(preferred.id);
      }
    } catch {
      setError('과정 정보를 불러오는데 실패했습니다.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCurriculum = useCallback(async (courseId: string) => {
    if (!courseId) return;
    setLoading(true); setError('');
    try {
      const res  = await adminFetch(`/api/admin/curriculum?course_id=${courseId}`);
      const data = await res.json();
      setSubjects(data.subjects ?? []);
      setNodes(data.nodes ?? []);
    } catch {
      setError('커리큘럼 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => {
    if (selectedCourse) fetchCurriculum(selectedCourse);
  }, [selectedCourse, fetchCurriculum]);

  const selectedCourseObj = courses.find(c => c.id === selectedCourse);

  /* 카테고리별로 묶기 */
  const categorizedSubjects = useMemo(() => {
    const byCategory: Record<string, Subject[]> = {};
    for (const s of [...subjects].sort((a, b) => a.position - b.position)) {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    }
    return CATEGORY_ORDER
      .map(c => ({ ...c, subjects: byCategory[c.key] ?? [] }))
      .filter(c => c.subjects.length > 0);
  }, [subjects]);

  /* subject_id별 노드 목록 */
  const nodesBySubject = useMemo(() => {
    const m: Record<string, CNode[]> = {};
    for (const n of [...nodes].sort((a, b) => a.position - b.position)) {
      if (!m[n.subject_id]) m[n.subject_id] = [];
      m[n.subject_id].push(n);
    }
    return m;
  }, [nodes]);

  /* ─ 액션 ─ */

  async function handleDeleteSubject(s: Subject) {
    const ok = window.confirm(`"${s.title}" 과목을 삭제하시겠습니까?\n포함된 노드도 함께 삭제됩니다.`);
    if (!ok) return;
    setBusy(true); setError('');
    try {
      const res = await adminFetch('/api/admin/subjects', {
        method: 'DELETE',
        body: JSON.stringify({ id: s.id }),
      });
      if (!res.ok) throw new Error();
      await fetchCurriculum(selectedCourse);
    } catch { setError('과목 삭제 실패'); }
    finally  { setBusy(false); }
  }

  async function handleDeleteNode(n: CNode) {
    const ok = window.confirm(`"${n.title}" 노드를 삭제하시겠습니까?`);
    if (!ok) return;
    setBusy(true); setError('');
    try {
      const res = await adminFetch('/api/admin/nodes', {
        method: 'DELETE',
        body: JSON.stringify({ id: n.id }),
      });
      if (!res.ok) throw new Error();
      await fetchCurriculum(selectedCourse);
    } catch { setError('노드 삭제 실패'); }
    finally  { setBusy(false); }
  }

  async function moveSubject(s: Subject, dir: -1 | 1) {
    const sameCat = subjects.filter(x => x.category === s.category).sort((a, b) => a.position - b.position);
    const idx = sameCat.findIndex(x => x.id === s.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sameCat.length) return;

    /* 같은 카테고리만 가지고 reorder. 전체 subjects의 position 재배치 */
    const reordered = [...sameCat];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    /* 카테고리 순서대로 전체 재배치 */
    const allReordered: Subject[] = [];
    for (const cat of CATEGORIES) {
      const list = (cat === s.category)
        ? reordered
        : subjects.filter(x => x.category === cat).sort((a, b) => a.position - b.position);
      allReordered.push(...list);
    }
    const ordered_ids = allReordered.map(x => x.id);

    setBusy(true); setError('');
    try {
      const res = await adminFetch('/api/admin/subjects', {
        method: 'PATCH',
        body: JSON.stringify({ course_id: selectedCourse, ordered_ids }),
      });
      if (!res.ok) throw new Error();
      await fetchCurriculum(selectedCourse);
    } catch { setError('순서 변경 실패'); }
    finally  { setBusy(false); }
  }

  async function moveNode(n: CNode, dir: -1 | 1) {
    const peers = (nodesBySubject[n.subject_id] ?? []);
    const idx = peers.findIndex(x => x.id === n.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= peers.length) return;

    const reordered = [...peers];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const ordered_ids = reordered.map(x => x.id);

    setBusy(true); setError('');
    try {
      const res = await adminFetch('/api/admin/nodes', {
        method: 'PATCH',
        body: JSON.stringify({ subject_id: n.subject_id, ordered_ids }),
      });
      if (!res.ok) throw new Error();
      await fetchCurriculum(selectedCourse);
    } catch { setError('순서 변경 실패'); }
    finally  { setBusy(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 animate-fadeIn">
      {/* 헤더 */}
      <section className="pt-14 pb-8">
        <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase mb-3 font-semibold">관리자 · 커리큘럼 관리</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[30px] font-bold text-[#1a1918] tracking-tight leading-none">과목 · 노드 구성</h1>
          <p className="text-[13px] text-[#7a766f] font-medium pb-1">
            {subjects.length}과목 · {nodes.length}노드
          </p>
        </div>
      </section>

      {/* 오류 */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[#d4d0c8] bg-[#f7f6f3] flex items-center justify-between gap-4">
          <p className="text-[13.5px] text-[#3a3835]">{error}</p>
          <button onClick={() => setError('')} className="text-[12px] text-[#7a766f] hover:text-[#1a1918] flex-shrink-0">닫기</button>
        </div>
      )}

      {/* 과정 선택 */}
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
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedCourse === c.id ? 'bg-[#f7f6f3]' : 'hover:bg-[#fafaf9]'
                  }`}
                >
                  <p className={`text-[13.5px] truncate ${selectedCourse === c.id ? 'font-bold text-[#1a1918]' : 'font-medium text-[#3a3835]'}`}>{c.title}</p>
                  {c.start_date && (
                    <p className="text-[11.5px] text-[#7a766f] tabular-nums mt-0.5">{c.start_date} — {c.end_date}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 액션 바 */}
      {!loading && selectedCourse && (
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <p className="text-[13px] text-[#7a766f]">
            {subjects.length === 0
              ? '다른 과정의 과목·노드를 골라서 추가할 수 있습니다.'
              : '↑↓ 버튼으로 순서 변경 · 수정/삭제 · 추가 가져오기로 보강'}
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-md border border-[#1a1918] text-[#1a1918] hover:bg-[#1a1918] hover:text-white transition-colors"
          >
            + 과목·노드 추가
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="py-20 flex justify-center">
          <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && selectedCourse && subjects.length === 0 && (
        <div className="border border-[#d4d0c8] rounded-xl py-16 text-center">
          <p className="text-[15.5px] font-semibold text-[#1a1918]">이 과정은 아직 커리큘럼이 비어있습니다</p>
          <p className="text-[13px] text-[#7a766f] mt-2">우측 상단 "+ 과목·노드 추가" 버튼으로 다른 과정의 과목·노드를 골라 가져오세요.</p>
        </div>
      )}

      {/* 카테고리별 과목/노드 목록 */}
      {!loading && categorizedSubjects.map(cat => (
        <section key={cat.key} className="mb-10">
          <div className="px-1 pb-3 mb-3 border-b border-[#1a1918]">
            <h2 className="text-[17px] font-bold text-[#1a1918] tracking-tight">{cat.label}</h2>
          </div>

          <div className="space-y-3">
            {cat.subjects.map(s => {
              const subjectNodes = nodesBySubject[s.id] ?? [];
              const sameCat = subjects.filter(x => x.category === s.category).sort((a, b) => a.position - b.position);
              const sIdx = sameCat.findIndex(x => x.id === s.id);
              const isFirst = sIdx === 0;
              const isLast  = sIdx === sameCat.length - 1;

              return (
                <div key={s.id} className="border border-[#d4d0c8] rounded-xl bg-white overflow-hidden">
                  {/* 과목 헤더 */}
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-[#e4e1da] bg-[#fafaf9]">
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveSubject(s, -1)}
                        disabled={isFirst || busy}
                        className="text-[#7a766f] hover:text-[#1a1918] disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                      >▲</button>
                      <button
                        onClick={() => moveSubject(s, 1)}
                        disabled={isLast || busy}
                        className="text-[#7a766f] hover:text-[#1a1918] disabled:opacity-20 disabled:cursor-not-allowed leading-none mt-0.5"
                      >▼</button>
                    </div>

                    <div className="flex-1 min-w-0 ml-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14.5px] font-bold text-[#1a1918] truncate">{s.title}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#7a766f]">{subjectNodes.length}노드</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditSubject(s)}
                      className="text-[11.5px] text-[#7a766f] hover:text-[#1a1918] transition-colors"
                    >수정</button>
                    <span className="text-[#d4d0c8]">·</span>
                    <button
                      onClick={() => handleDeleteSubject(s)}
                      className="text-[11.5px] text-[#b04030] hover:text-[#7a2818] transition-colors"
                    >삭제</button>
                  </div>

                  {/* 노드 목록 */}
                  {subjectNodes.length === 0 ? (
                    <p className="px-4 py-5 text-[12.5px] text-[#7a766f] text-center">노드가 없습니다.</p>
                  ) : (
                    <ul>
                      {subjectNodes.map((n, ni) => {
                        const isFirstN = ni === 0;
                        const isLastN  = ni === subjectNodes.length - 1;
                        return (
                          <li key={n.id} className="px-4 py-2.5 border-b border-[#f2f1ee] last:border-b-0 flex items-center gap-2">
                            <div className="flex flex-col">
                              <button
                                onClick={() => moveNode(n, -1)}
                                disabled={isFirstN || busy}
                                className="text-[#a8a39c] hover:text-[#1a1918] disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none"
                              >▲</button>
                              <button
                                onClick={() => moveNode(n, 1)}
                                disabled={isLastN || busy}
                                className="text-[#a8a39c] hover:text-[#1a1918] disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none mt-0.5"
                              >▼</button>
                            </div>
                            <p className="text-[13.5px] text-[#1a1918] truncate flex-1 ml-1">{n.title}</p>
                            <span className="text-[12px] text-[#7a766f] tabular-nums flex-shrink-0">{n.hours}h</span>
                            <button
                              onClick={() => setEditNode(n)}
                              className="text-[11.5px] text-[#7a766f] hover:text-[#1a1918] transition-colors flex-shrink-0"
                            >수정</button>
                            <span className="text-[#d4d0c8] text-[11px]">·</span>
                            <button
                              onClick={() => handleDeleteNode(n)}
                              className="text-[11.5px] text-[#b04030] hover:text-[#7a2818] transition-colors flex-shrink-0"
                            >삭제</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="pb-20" />

      {/* ── 모달들 ── */}
      {importOpen && (
        <ImportModal
          courseId={selectedCourse}
          allCourses={courses}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); fetchCurriculum(selectedCourse); }}
        />
      )}
      {editSubject && (
        <SubjectModal
          courseId={selectedCourse}
          subject={editSubject}
          onClose={() => setEditSubject(null)}
          onDone={() => { setEditSubject(null); fetchCurriculum(selectedCourse); }}
        />
      )}
      {editNode && (
        <NodeModal
          courseId={selectedCourse}
          subjectId={editNode.subject_id}
          node={editNode}
          onClose={() => setEditNode(null)}
          onDone={() => { setEditNode(null); fetchCurriculum(selectedCourse); }}
        />
      )}
    </div>
  );
}

/* ───────────── 가져오기 모달 ───────────── */

interface SourceTreeSubject { slug: string; title: string; category: string; nodes: { slug: string; title: string; hours: number; }[]; }

function ImportModal({
  courseId, allCourses, onClose, onDone,
}: {
  courseId: string;
  allCourses: Course[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<'pick-source' | 'pick-items'>('pick-source');
  const [source, setSource] = useState<string>('default');
  const [sourcePage, setSourcePage] = useState(0);
  const SOURCE_PAGE_SIZE = 4;
  const [tree, setTree] = useState<SourceTreeSubject[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pickedSubjects, setPickedSubjects] = useState<Set<string>>(new Set());
  const [pickedNodes, setPickedNodes] = useState<Set<string>>(new Set());

  /* 다음 단계로 — 소스에서 트리 fetch */
  async function loadTreeAndNext() {
    setLoadingTree(true); setErr('');
    try {
      let subs: SourceTreeSubject[] = [];
      if (source === 'default') {
        const mod = await import('@/data/curriculum');
        subs = mod.curriculumData.subjects.map(s => ({
          slug:  s.id,
          title: s.title,
          category: s.category,
          nodes: s.nodes.map(n => ({ slug: n.id, title: n.title, hours: n.hours })),
        }));
      } else {
        const res  = await adminFetch(`/api/admin/curriculum?course_id=${source}`);
        const data = await res.json();
        const subjList: Array<{ id: string; slug: string; title: string; category: string; }> = data.subjects ?? [];
        const nodeList: Array<{ subject_id: string; slug: string; title: string; hours: number; }> = data.nodes ?? [];
        const m = new Map(subjList.map(s => [s.id, s]));
        const groupedByS: Record<string, { slug: string; title: string; hours: number; }[]> = {};
        for (const n of nodeList) {
          if (!groupedByS[n.subject_id]) groupedByS[n.subject_id] = [];
          groupedByS[n.subject_id].push({ slug: n.slug, title: n.title, hours: n.hours });
        }
        subs = subjList.map(s => ({
          slug: s.slug, title: s.title, category: s.category,
          nodes: groupedByS[s.id] ?? [],
        }));
      }
      setTree(subs);
      /* 기본: 모두 체크 */
      setPickedSubjects(new Set(subs.map(s => s.slug)));
      setPickedNodes(new Set(subs.flatMap(s => s.nodes.map(n => n.slug))));
      setStep('pick-items');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '소스 로드 실패');
    } finally {
      setLoadingTree(false);
    }
  }

  function toggleSubject(s: SourceTreeSubject) {
    const sub = new Set(pickedSubjects);
    const nod = new Set(pickedNodes);
    if (sub.has(s.slug)) {
      sub.delete(s.slug);
      for (const n of s.nodes) nod.delete(n.slug);
    } else {
      sub.add(s.slug);
      for (const n of s.nodes) nod.add(n.slug);
    }
    setPickedSubjects(sub); setPickedNodes(nod);
  }

  function toggleNode(s: SourceTreeSubject, nodeSlug: string) {
    const nod = new Set(pickedNodes);
    const sub = new Set(pickedSubjects);
    nod.has(nodeSlug) ? nod.delete(nodeSlug) : nod.add(nodeSlug);
    /* 노드 하나라도 체크되면 부모 과목도 체크 */
    if (nod.has(nodeSlug)) sub.add(s.slug);
    setPickedNodes(nod); setPickedSubjects(sub);
  }

  async function submit() {
    setBusy(true); setErr('');
    try {
      const res = await adminFetch('/api/admin/curriculum', {
        method: 'POST',
        body: JSON.stringify({
          course_id:     courseId,
          source,
          subject_slugs: [...pickedSubjects],
          node_slugs:    [...pickedNodes],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '가져오기 실패');
      }
      onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '가져오기 실패');
    } finally {
      setBusy(false);
    }
  }

  /* 카테고리별 그룹핑 */
  const treeByCat = useMemo(() => {
    const m: Record<string, SourceTreeSubject[]> = {};
    for (const s of tree) {
      if (!m[s.category]) m[s.category] = [];
      m[s.category].push(s);
    }
    return CATEGORY_ORDER
      .map(c => ({ ...c, subjects: m[c.key] ?? [] }))
      .filter(c => c.subjects.length > 0);
  }, [tree]);

  const subTotal  = pickedSubjects.size;
  const nodeTotal = pickedNodes.size;

  return (
    <>
      {/* 옅은 backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/15 animate-fade-in-backdrop"
        onClick={() => !busy && !loadingTree && onClose()}
      />

      {/* 우측 슬라이드 드로어 — 콘텐츠 높이에 맞춤, 최대 100vh */}
      <aside className="fixed top-0 right-0 z-50 max-h-screen w-full max-w-[560px] bg-white border-l border-[#d4d0c8] shadow-2xl flex flex-col animate-slide-in-right">

        {/* 상단 헤더 (고정) */}
        <header className="px-7 pt-6 pb-5 border-b border-[#e4e1da] flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-bold text-[#1a1918] tracking-tight">커리큘럼 가져오기</h2>

            {/* 단계 인디케이터 */}
            <div className="flex items-center gap-2.5 mt-3">
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                  step === 'pick-source' ? 'bg-[#1a1918] text-white' : 'bg-[#1a1918] text-white'
                }`}>1</span>
                <span className={`text-[12px] font-semibold transition-colors ${
                  step === 'pick-source' ? 'text-[#1a1918]' : 'text-[#7a766f]'
                }`}>소스 선택</span>
              </div>
              <span className="w-6 h-px bg-[#d4d0c8]" />
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                  step === 'pick-items' ? 'bg-[#1a1918] text-white' : 'bg-[#e4e1da] text-[#7a766f]'
                }`}>2</span>
                <span className={`text-[12px] font-semibold transition-colors ${
                  step === 'pick-items' ? 'text-[#1a1918]' : 'text-[#a8a39c]'
                }`}>항목 선택</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => !busy && !loadingTree && onClose()}
            aria-label="닫기"
            className="text-[#7a766f] hover:text-[#1a1918] hover:bg-[#f2f1ee] rounded transition-colors w-8 h-8 flex items-center justify-center flex-shrink-0 -mr-2 -mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* 스크롤 영역 */}
        <main className="flex-1 min-h-0 overflow-y-auto px-7 py-5">
        {step === 'pick-source' && (() => {
          /* 모든 소스를 하나의 배열로 — 기본 템플릿 + 다른 과정들 */
          const sourceList: Array<{
            value: string; label: string; meta: string; badge: string;
          }> = [
            { value: 'default', label: 'AI 데이터 인텔리전스 (기본 템플릿)', meta: '17과목 · 29노드', badge: '기본' },
            ...allCourses
              .filter(c => c.id !== courseId)
              .map(c => ({
                value: c.id,
                label: c.title,
                meta:  c.start_date ? `${c.start_date} — ${c.end_date}` : '',
                badge: '기존 과정',
              })),
          ];
          const totalPages = Math.max(1, Math.ceil(sourceList.length / SOURCE_PAGE_SIZE));
          const safePage   = Math.min(sourcePage, totalPages - 1);
          const visible    = sourceList.slice(safePage * SOURCE_PAGE_SIZE, (safePage + 1) * SOURCE_PAGE_SIZE);

          return (
            <>
              <div className="space-y-2">
                {visible.map(s => (
                  <SourceRadio
                    key={s.value}
                    value={s.value}
                    selected={source === s.value}
                    onChange={setSource}
                    label={s.label}
                    meta={s.meta}
                    badge={s.badge}
                  />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => setSourcePage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-[#d4d0c8] text-[#3a3835] hover:border-[#1a1918] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M6.5 1.5L3 5L6.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="text-[12px] text-[#7a766f] tabular-nums min-w-[40px] text-center">
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setSourcePage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-[#d4d0c8] text-[#3a3835] hover:border-[#1a1918] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3.5 1.5L7 5L3.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          );
        })()}

        {step === 'pick-items' && (
          <>
            <div className="space-y-4">
              {treeByCat.map(cat => {
                const allSelected = cat.subjects.every(s => pickedSubjects.has(s.slug));
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#d4d0c8]">
                      <button
                        onClick={() => {
                          const sub = new Set(pickedSubjects);
                          const nod = new Set(pickedNodes);
                          if (allSelected) {
                            for (const s of cat.subjects) {
                              sub.delete(s.slug);
                              for (const n of s.nodes) nod.delete(n.slug);
                            }
                          } else {
                            for (const s of cat.subjects) {
                              sub.add(s.slug);
                              for (const n of s.nodes) nod.add(n.slug);
                            }
                          }
                          setPickedSubjects(sub); setPickedNodes(nod);
                        }}
                        className="text-[11.5px] font-semibold text-[#7a766f] hover:text-[#1a1918] transition-colors"
                      >
                        {allSelected ? '전체 해제' : '전체 선택'}
                      </button>
                      <p className="text-[14px] font-bold text-[#1a1918] tracking-tight">{cat.label}</p>
                      <span className="text-[11.5px] text-[#7a766f]">{cat.subjects.length}과목</span>
                    </div>

                    <div className="space-y-1.5 ml-1">
                      {cat.subjects.map(s => {
                        const sChecked = pickedSubjects.has(s.slug);
                        return (
                          <div key={s.slug}>
                            <label className="flex items-center gap-2 py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sChecked}
                                onChange={() => toggleSubject(s)}
                                className="appearance-none w-4 h-4 border border-[#a8a39c] rounded checked:bg-[#1a1918] checked:border-[#1a1918] cursor-pointer flex-shrink-0
                                          before:content-[''] before:absolute before:inset-0 before:bg-no-repeat before:bg-center
                                          checked:before:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010%208%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M1%204L4%207L9%201%22%20stroke%3D%22white%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]
                                          relative"
                              />
                              <p className="text-[13.5px] font-semibold text-[#1a1918] flex-1 truncate">{s.title}</p>
                              <span className="text-[11px] text-[#7a766f] tabular-nums flex-shrink-0">{s.nodes.length}노드</span>
                            </label>

                            {sChecked && s.nodes.length > 1 && (
                              <div className="ml-6 space-y-0.5 mt-0.5 mb-1">
                                {s.nodes.map(n => (
                                  <label key={n.slug} className="flex items-center gap-2 py-0.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={pickedNodes.has(n.slug)}
                                      onChange={() => toggleNode(s, n.slug)}
                                      className="appearance-none w-3.5 h-3.5 border border-[#a8a39c] rounded checked:bg-[#3a3835] checked:border-[#3a3835] cursor-pointer flex-shrink-0
                                                before:content-[''] before:absolute before:inset-0 before:bg-no-repeat before:bg-center
                                                checked:before:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010%208%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M1%204L4%207L9%201%22%20stroke%3D%22white%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]
                                                relative"
                                    />
                                    <p className="text-[12.5px] text-[#3a3835] flex-1 truncate">{n.title}</p>
                                    <span className="text-[10.5px] text-[#a8a39c] tabular-nums flex-shrink-0">{n.hours}h</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        </main>

        {/* 하단 액션 푸터 (고정) */}
        <footer className="px-7 py-4 border-t border-[#e4e1da] bg-white flex-shrink-0">
          {err && (
            <div className="px-3 py-2.5 rounded-lg bg-[#fdf5f3] border border-[#e8b4a8] mb-3">
              <p className="text-[12.5px] text-[#b04030]">{err}</p>
            </div>
          )}

          {step === 'pick-source' && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                disabled={loadingTree}
                className="text-[13px] px-4 py-2 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] disabled:opacity-40 transition-colors"
              >취소</button>
              <button
                onClick={loadTreeAndNext}
                disabled={loadingTree}
                className="text-[13px] font-semibold px-5 py-2 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {loadingTree && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                다음 →
              </button>
            </div>
          )}

          {step === 'pick-items' && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setStep('pick-source')}
                disabled={busy}
                className="text-[13px] text-[#7a766f] hover:text-[#1a1918] disabled:opacity-40 transition-colors"
              >← 소스 다시 선택</button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={busy}
                  className="text-[13px] px-4 py-2 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] disabled:opacity-40 transition-colors"
                >취소</button>
                <button
                  onClick={submit}
                  disabled={busy || subTotal === 0}
                  className="text-[13px] font-semibold px-5 py-2 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  {busy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {subTotal}과목 · {nodeTotal}노드 가져오기
                </button>
              </div>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}

function SourceRadio({
  value, selected, onChange, label, meta, badge,
}: {
  value: string;
  selected: boolean;
  onChange: (v: string) => void;
  label: string;
  meta?: string;
  badge?: string;
}) {
  return (
    <label className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
      selected
        ? 'border-[#1a1918] bg-[#fafaf8] shadow-sm'
        : 'border-[#e4e1da] bg-white hover:border-[#a8a39c] hover:bg-[#fafaf9]'
    }`}>
      <input
        type="radio"
        name="import-source"
        checked={selected}
        onChange={() => onChange(value)}
        className="appearance-none w-4 h-4 border border-[#a8a39c] rounded-full checked:border-[5px] checked:border-[#1a1918] cursor-pointer flex-shrink-0 transition-all"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#1a1918] truncate">{label}</p>
        {meta && <p className="text-[12px] text-[#7a766f] tabular-nums mt-0.5 truncate">{meta}</p>}
      </div>
      {badge && (
        <span className={`text-[10px] font-semibold uppercase tracking-[0.06em] px-2 py-1 rounded-md leading-none flex-shrink-0 ${
          badge === '기본'
            ? 'bg-[#1a1918] text-white'
            : 'bg-[#f2f1ee] text-[#3a3835] border border-[#d4d0c8]'
        }`}>
          {badge}
        </span>
      )}
    </label>
  );
}

/* ───────────── 과목 추가/수정 모달 ───────────── */

function SubjectModal({
  courseId, subject, onClose, onDone,
}: {
  courseId: string;
  subject?: Subject;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title,    setTitle]    = useState(subject?.title    ?? '');
  const [category, setCategory] = useState<Category>((subject?.category as Category) ?? '정규교과');
  const [hours,    setHours]    = useState(String(subject?.total_hours ?? 0));
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (subject) {
        const res = await adminFetch('/api/admin/subjects', {
          method: 'PATCH',
          body: JSON.stringify({ id: subject.id, title: title.trim(), category, total_hours: Number(hours) || 0 }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await adminFetch('/api/admin/subjects', {
          method: 'POST',
          body: JSON.stringify({ course_id: courseId, title: title.trim(), category, total_hours: Number(hours) || 0 }),
        });
        if (!res.ok) throw new Error();
      }
      onDone();
    } catch { setErr('저장 실패'); }
    finally  { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4" onClick={() => !busy && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-[440px] bg-white rounded-2xl border border-[#d4d0c8] p-7 space-y-5" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase font-semibold mb-2">{subject ? '과목 수정' : '과목 추가'}</p>
          <h2 className="text-[20px] font-bold text-[#1a1918] tracking-tight">{subject ? subject.title : '새 과목'}</h2>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#1a1918]">과목명 <span className="text-[#b04030]">*</span></label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus
            className="w-full text-[14px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#1a1918]">카테고리</label>
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`text-[13px] px-3.5 py-2 rounded-lg border font-medium transition-colors flex-1 ${
                  category === c
                    ? 'bg-[#1a1918] text-white border-[#1a1918]'
                    : 'border-[#d4d0c8] text-[#3a3835] hover:border-[#1a1918] hover:text-[#1a1918]'
                }`}
              >{c === '기타' ? '운영·기타' : c}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#1a1918]">총 시간</label>
          <input
            type="number" min={0} value={hours} onChange={e => setHours(e.target.value)}
            className="w-full text-[14px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] tabular-nums transition-colors"
          />
        </div>

        {err && <div className="px-3 py-2.5 rounded-lg bg-[#fdf5f3] border border-[#e8b4a8]"><p className="text-[12.5px] text-[#b04030]">{err}</p></div>}

        <div className="flex gap-2">
          <button type="submit" disabled={busy || !title.trim()} className="flex-1 text-[13.5px] font-semibold py-2.5 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {busy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            저장
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="text-[13.5px] px-4 py-2.5 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] disabled:opacity-40 transition-colors">취소</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────── 노드 추가/수정 모달 ───────────── */

function NodeModal({
  courseId, subjectId, node, onClose, onDone,
}: {
  courseId: string;
  subjectId: string;
  node?: CNode;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title,       setTitle]       = useState(node?.title ?? '');
  const [description, setDescription] = useState(node?.description ?? '');
  const [hours,       setHours]       = useState(String(node?.hours ?? 0));
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (node) {
        const res = await adminFetch('/api/admin/nodes', {
          method: 'PATCH',
          body: JSON.stringify({ id: node.id, title: title.trim(), description: description.trim() || null, hours: Number(hours) || 0 }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await adminFetch('/api/admin/nodes', {
          method: 'POST',
          body: JSON.stringify({ course_id: courseId, subject_id: subjectId, title: title.trim(), description: description.trim() || null, hours: Number(hours) || 0 }),
        });
        if (!res.ok) throw new Error();
      }
      onDone();
    } catch { setErr('저장 실패'); }
    finally  { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4" onClick={() => !busy && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-[480px] bg-white rounded-2xl border border-[#d4d0c8] p-7 space-y-5" onClick={e => e.stopPropagation()}>
        <div>
          <p className="text-[12px] tracking-[0.16em] text-[#7a766f] uppercase font-semibold mb-2">{node ? '노드 수정' : '노드 추가'}</p>
          <h2 className="text-[20px] font-bold text-[#1a1918] tracking-tight">{node ? node.title : '새 노드'}</h2>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#1a1918]">노드명 <span className="text-[#b04030]">*</span></label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus
            className="w-full text-[14px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#1a1918]">설명</label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full text-[13.5px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] resize-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#1a1918]">시간 (h)</label>
          <input
            type="number" min={0} value={hours} onChange={e => setHours(e.target.value)}
            className="w-full text-[14px] border border-[#d4d0c8] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#1a1918] text-[#1a1918] tabular-nums transition-colors"
          />
        </div>

        {err && <div className="px-3 py-2.5 rounded-lg bg-[#fdf5f3] border border-[#e8b4a8]"><p className="text-[12.5px] text-[#b04030]">{err}</p></div>}

        <div className="flex gap-2">
          <button type="submit" disabled={busy || !title.trim()} className="flex-1 text-[13.5px] font-semibold py-2.5 rounded-lg bg-[#1a1918] text-white hover:bg-[#2d2b29] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {busy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            저장
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="text-[13.5px] px-4 py-2.5 rounded-lg border border-[#d4d0c8] text-[#3a3835] hover:text-[#1a1918] hover:border-[#1a1918] disabled:opacity-40 transition-colors">취소</button>
        </div>
      </form>
    </div>
  );
}
