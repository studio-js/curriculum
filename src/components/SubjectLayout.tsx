'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Subject, Lesson } from '@/types/curriculum';
import { curriculumData } from '@/data/curriculum';
import { parseNotebook, NotebookSection } from '@/lib/notebookParser';
import LessonViewer from '@/components/LessonViewer';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  uploadNotebook,
  downloadNotebook,
  deleteNotebookRemote,
  listNotebooks,
} from '@/lib/supabase';

type ViewerState = { lesson: Lesson; sections: NotebookSection[] } | null;

interface StoredNotebook {
  subjectTitle: string;
  lessonTitle:  string;
  storagePath:  string;
}

/* ── 커리큘럼 전체에서 레슨 순서 인덱스 계산 ── */
function getLessonIndex(subjectTitle: string, lessonTitle: string): number {
  let idx = 0;
  for (const subj of curriculumData.subjects) {
    for (const node of subj.nodes) {
      for (const lesson of node.lessons) {
        if (subj.title === subjectTitle && lesson.title === lessonTitle) return idx;
        idx++;
      }
    }
  }
  return 9999;
}

function getLessonNumber(subjectTitle: string, lessonTitle: string): number | null {
  let num = 1;
  for (const subj of curriculumData.subjects) {
    for (const node of subj.nodes) {
      for (const lesson of node.lessons) {
        if (subj.title === subjectTitle && lesson.title === lessonTitle) return num;
        num++;
      }
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════ */
export default function SubjectLayout({ subject }: { subject: Subject }) {
  const { user, loading: authLoading, isAdmin, configured } = useAuthContext();
  const router = useRouter();

  /* ── 비로그인 시 로그인 페이지로 (Supabase 설정된 경우만) ── */
  useEffect(() => {
    if (configured && !authLoading && !user) router.replace('/login');
  }, [configured, authLoading, user, router]);

  const [activeNode,    setActiveNode]    = useState(0);
  const [activeLesson,  setActiveLesson]  = useState<number | null>(null);
  const [loadingLesson, setLoadingLesson] = useState<string | null>(null);
  const [viewer,        setViewer]        = useState<ViewerState>(null);
  const [showManager,   setShowManager]   = useState(false);

  /* Supabase에서 가져온 노트북 목록 */
  const [allNotebooks,  setAllNotebooks]  = useState<StoredNotebook[]>([]);
  const [nbLoading,     setNbLoading]     = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const uploadTarget  = useRef<Lesson | null>(null);

  const node         = subject.nodes[activeNode];
  const totalLessons = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);

  /* ── 마운트 시 업로드된 노트북 목록 로드 ── */
  useEffect(() => {
    loadNotebookList();
  }, []);

  async function loadNotebookList() {
    setNbLoading(true);
    const { data } = await listNotebooks();
    setAllNotebooks(data.map(d => ({
      subjectTitle: d.subject_title,
      lessonTitle:  d.lesson_title,
      storagePath:  d.storage_path,
    })));
    setNbLoading(false);
  }

  /* ── 커리큘럼 순서 기반 정렬 + 과정별 그룹 ── */
  const sortedNotebooks = useMemo(() =>
    [...allNotebooks].sort((a, b) =>
      getLessonIndex(a.subjectTitle, a.lessonTitle) - getLessonIndex(b.subjectTitle, b.lessonTitle)
    ), [allNotebooks]);

  const groupedNotebooks = useMemo(() => {
    const g: Record<string, StoredNotebook[]> = {};
    for (const nb of sortedNotebooks) {
      if (!g[nb.subjectTitle]) g[nb.subjectTitle] = [];
      g[nb.subjectTitle].push(nb);
    }
    return g;
  }, [sortedNotebooks]);

  /* ── 레슨에 노트북 있는지 확인 ── */
  function hasUploaded(lesson: Lesson): boolean {
    return allNotebooks.some(
      nb => nb.subjectTitle === subject.title && nb.lessonTitle === lesson.title,
    );
  }

  /* ── 노트북 열기 ── */
  const openNotebook = useCallback(async (lesson: Lesson) => {
    setLoadingLesson(lesson.title);
    try {
      let sections: NotebookSection[];

      if (lesson.notebookPath) {
        /* public/ 폴더 내 노트북 */
        const res = await fetch(lesson.notebookPath);
        const nb  = await res.json();
        sections  = parseNotebook(nb);
      } else {
        /* Supabase Storage에서 다운로드 — DB에 저장된 경로 우선 사용 */
        const stored = allNotebooks.find(
          nb => nb.subjectTitle === subject.title && nb.lessonTitle === lesson.title,
        );
        const { data, error } = await downloadNotebook(subject.title, lesson.title, stored?.storagePath);
        if (error || !data) {
          alert('노트북을 불러오지 못했습니다: ' + (error ?? '알 수 없는 오류'));
          return;
        }
        sections = JSON.parse(data) as NotebookSection[];
      }

      setViewer({ lesson, sections });
    } catch (err) {
      console.error('노트북 로드 실패:', err);
    } finally {
      setLoadingLesson(null);
    }
  }, [subject.title, allNotebooks]);

  /* ── 파일 업로드 ── */
  function handleUploadClick(lesson: Lesson) {
    uploadTarget.current = lesson;
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget.current) return;
    const lesson = uploadTarget.current;

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const nb       = JSON.parse(ev.target?.result as string);
        const sections = parseNotebook(nb);
        const json     = JSON.stringify(sections);

        const { error, path } = await uploadNotebook(subject.title, lesson.title, json);
        if (error || !path) {
          alert('업로드 실패: ' + (error ?? '알 수 없는 오류'));
          return;
        }

        /* 목록 갱신 — storagePath를 함께 저장해야 삭제/다운로드 시 정확한 경로 사용 가능 */
        setAllNotebooks(prev => {
          const filtered = prev.filter(nb => !(nb.subjectTitle === subject.title && nb.lessonTitle === lesson.title));
          return [...filtered, { subjectTitle: subject.title, lessonTitle: lesson.title, storagePath: path }];
        });

        setViewer({ lesson, sections });
      } catch {
        alert('.ipynb 파일을 읽는 데 실패했습니다. 올바른 Jupyter Notebook 파일인지 확인해 주세요.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /* ── 노트북 삭제 ── */
  async function deleteNotebook(nb: StoredNotebook) {
    await deleteNotebookRemote(nb.subjectTitle, nb.lessonTitle, nb.storagePath);
    setAllNotebooks(prev => prev.filter(
      n => !(n.subjectTitle === nb.subjectTitle && n.lessonTitle === nb.lessonTitle),
    ));
    if (viewer?.lesson.title === nb.lessonTitle) setViewer(null);
  }

  async function deleteAllNotebooks() {
    if (!confirm(`업로드된 노트북 ${allNotebooks.length}개를 모두 삭제할까요?`)) return;
    await Promise.all(allNotebooks.map(nb => deleteNotebookRemote(nb.subjectTitle, nb.lessonTitle, nb.storagePath)));
    setAllNotebooks([]);
    setViewer(null);
    setShowManager(false);
  }

  const closeViewer = useCallback(() => setViewer(null), []);

  /* ── 인증 로딩/미인증 처리 ── */
  if (configured && authLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center">
        <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
      </div>
    );
  }
  if (configured && !user) return null; // useEffect가 /login으로 리다이렉트

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <>
      {/* 숨김 파일 인풋 (관리자만) */}
      {isAdmin && (
        <input ref={fileInputRef} type="file" accept=".ipynb" className="hidden" onChange={handleFileChange} />
      )}

      {/* 학습 뷰어 오버레이 */}
      {viewer && (
        <LessonViewer
          subjectTitle={subject.title}
          lessonTitle={viewer.lesson.title}
          sections={viewer.sections}
          onClose={closeViewer}
        />
      )}

      {/* ── 노트북 라이브러리 모달 ── */}
      {showManager && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 backdrop-blur-sm"
          onClick={() => setShowManager(false)}
        >
          <div
            className="bg-white rounded w-[480px] max-h-[72vh] flex flex-col shadow-xl border border-[#e4e1da]"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#eceae5] flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-semibold text-[#1a1918]">노트북 라이브러리</h2>
                <p className="text-[11px] text-[#97938c] mt-0.5">
                  {nbLoading
                    ? '불러오는 중…'
                    : allNotebooks.length > 0
                      ? `${allNotebooks.length}개 노트북 · 과정별 정리`
                      : '업로드된 노트북이 없습니다'}
                </p>
              </div>
              <button
                onClick={() => setShowManager(false)}
                className="w-7 h-7 flex items-center justify-center rounded text-[#97938c] hover:text-[#1a1918] hover:bg-[#f0ede8] transition-colors text-[20px] leading-none"
              >×</button>
            </div>

            {/* 모달 컨텐츠 */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {allNotebooks.length === 0 ? (
                <div className="text-center py-14">
                  <div className="text-[32px] mb-3">📭</div>
                  <p className="text-[13px] text-[#97938c]">업로드된 노트북이 없습니다</p>
                  {isAdmin && (
                    <p className="text-[12px] text-[#97938c] mt-1">
                      각 세션에서 ↑ 노트북 연결 버튼으로 .ipynb 파일을 추가하세요
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedNotebooks).map(([subjectTitle, books]) => (
                    <div key={subjectTitle}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.16em]">
                          {subjectTitle}
                        </span>
                        <span className="text-[10px] text-[#97938c] font-medium">{books.length}개</span>
                      </div>
                      <div className="space-y-1 pl-0.5">
                        {books.map(nb => {
                          const num = getLessonNumber(nb.subjectTitle, nb.lessonTitle);
                          return (
                          <div
                            key={`${nb.subjectTitle}::${nb.lessonTitle}`}
                            className="flex items-center justify-between px-3 py-2.5 rounded bg-[#f9f8f6] hover:bg-[#f0ede8] group transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {num !== null && (
                                <span className="text-[11px] font-bold text-[#97938c] tabular-nums flex-shrink-0 w-6 text-center">
                                  {String(num).padStart(2, '0')}
                                </span>
                              )}
                              <span className="text-[13px] text-[#1a1918] font-medium truncate">{nb.lessonTitle}</span>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => deleteNotebook(nb)}
                                className="text-[11px] text-[#97938c] hover:text-[#c04030] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-3 font-medium"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            {allNotebooks.length > 0 && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-[#eceae5] flex items-center justify-between">
                <span className="text-[11px] text-[#97938c]">
                  총 {allNotebooks.length}개 파일 · Supabase Storage
                </span>
                {isAdmin && (
                  <button
                    onClick={deleteAllNotebooks}
                    className="text-[11px] text-[#97938c] hover:text-[#c04030] transition-colors"
                  >
                    전체 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#f7f6f3]">

        {/* ── Sidebar ─────────────────────── */}
        <aside className="w-60 flex-shrink-0 bg-white border-r border-[#e4e1da] overflow-y-auto">
          <div className="px-5 py-7 flex flex-col h-full">
            <div>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.06em] text-[#97938c] hover:text-[#1a1918] transition-colors mb-7 uppercase"
              >
                ← 커리큘럼
              </Link>

              <div className="mb-6 pb-6 border-b border-[#eceae5]">
                <span className="inline-block text-[10px] font-semibold tracking-[0.14em] uppercase px-2 py-0.5 rounded bg-[#f0ede8] text-[#3a3835] mb-2">
                  {subject.category}
                </span>
                <h1 className="text-[14px] font-semibold text-[#1a1918] leading-snug mb-2">
                  {subject.title}
                </h1>
                <p className="text-[12px] text-[#3a3835] font-medium">
                  {subject.totalHours}h · {totalLessons}개 세션
                </p>
              </div>

              <p className="text-[11px] tracking-[0.14em] text-[#3a3835] uppercase mb-3 font-semibold">
                노드
              </p>
              <ul className="space-y-0.5">
                {subject.nodes.map((n, i) => (
                  <li key={n.id}>
                    <button
                      onClick={() => { setActiveNode(i); setActiveLesson(null); }}
                      className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
                        activeNode === i ? 'bg-[#f0ede8]' : 'hover:bg-[#f7f6f3]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[11px] tabular-nums flex-shrink-0 font-bold ${activeNode === i ? 'text-[#1a1918]' : 'text-[#97938c]'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-[12px] font-medium leading-snug truncate ${activeNode === i ? 'text-[#1a1918]' : 'text-[#3a3835]'}`}>
                            {n.title}
                          </p>
                          <p className={`text-[11px] mt-0.5 tabular-nums font-medium ${activeNode === i ? 'text-[#3a3835]' : 'text-[#97938c]'}`}>
                            {n.lessons.length}세션 · {n.hours}h
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 노트북 관리 버튼 */}
            <div className="mt-auto pt-5 border-t border-[#eceae5]">
              <button
                onClick={() => setShowManager(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-[#97938c] hover:bg-[#f7f6f3] hover:text-[#1a1918] transition-colors group"
              >
                <span className="w-6 h-6 flex items-center justify-center rounded bg-[#f0ede8] group-hover:bg-[#e4e1da] transition-colors text-[12px]">
                  📁
                </span>
                <div className="text-left">
                  <p className="text-[12px] font-medium">노트북 관리</p>
                  {allNotebooks.length > 0 && (
                    <p className="text-[10px] text-[#97938c]">{allNotebooks.length}개 파일</p>
                  )}
                </div>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Content ─────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-10 py-10">

            {/* 노드 헤더 */}
            <div className="mb-7">
              {subject.nodes.length > 1 && (
                <p className="text-[11px] tracking-[0.14em] text-[#3a3835] uppercase mb-3 font-semibold">
                  노드 {String(activeNode + 1).padStart(2, '0')} / {subject.nodes.length}
                </p>
              )}
              <h2 className="text-[28px] font-bold text-[#1a1918] leading-snug mb-3 tracking-tight">
                {node.title}
              </h2>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[13px] text-[#97938c] tabular-nums font-medium">{node.hours}h</span>
                <span className="text-[#e4e1da]">·</span>
                <span className="text-[13px] text-[#97938c]">{node.lessons.length}개 세션</span>
              </div>
              <p className="text-[15px] text-[#3a3835] leading-[1.9] max-w-2xl mb-6">
                {node.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {node.topics.map(t => (
                  <span key={t} className="text-[12px] text-[#58554f] bg-white border border-[#e4e1da] px-3 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 세션 목록 */}
            <div className="bg-white border border-[#e4e1da] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-4 border-b border-[#eceae5]">
                <h3 className="text-[13px] font-bold text-[#1a1918] tracking-[0.06em] uppercase">
                  세션 구성
                </h3>
                <span className="text-[12px] text-[#3a3835] tabular-nums font-medium">
                  {node.lessons.length}개 세션
                </span>
              </div>

              {node.lessons.map((lesson, i) => {
                const hasServerNotebook   = !!lesson.notebookPath;
                const hasUploadedNotebook = hasUploaded(lesson);
                const canOpen   = hasServerNotebook || hasUploadedNotebook;
                const isLoading = loadingLesson === lesson.title;
                const open      = activeLesson === i;
                const hasDetail = !!(lesson.summary || lesson.objectives?.length);

                return (
                  <div key={i} className="border-b border-[#f5f4f0] last:border-0">
                    <div className={`w-full flex items-center gap-4 px-8 py-4 transition-colors ${open && !canOpen ? 'bg-[#f7f6f3]' : 'hover:bg-[#f7f6f3]'}`}>

                      {/* 번호 */}
                      <span className={`text-[12px] tabular-nums flex-shrink-0 w-6 font-bold ${open ? 'text-[#1a1918]' : 'text-[#97938c]'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>

                      {/* 제목 */}
                      <button
                        className="flex-1 text-left"
                        onClick={() => {
                          if (canOpen) openNotebook(lesson);
                          else if (hasDetail) toggleLesson(i);
                        }}
                      >
                        <span className={`text-[14px] leading-snug ${open ? 'font-semibold text-[#1a1918]' : 'font-medium text-[#1a1918]'}`}>
                          {lesson.title}
                        </span>
                      </button>

                      {/* 오른쪽 액션 */}
                      <div className="flex items-center gap-2 flex-shrink-0">

                        {canOpen && (
                          <button
                            onClick={() => openNotebook(lesson)}
                            className={`text-[10px] font-medium px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                              isLoading ? 'bg-[#f0ede8] text-[#97938c]' : 'border border-[#1a1918] text-[#1a1918] hover:bg-[#f0ede8]'
                            }`}
                          >
                            {isLoading ? (
                              <>
                                <span className="inline-block w-2.5 h-2.5 border border-[#97938c] border-t-transparent rounded-full animate-spin" />
                                불러오는 중
                              </>
                            ) : <>▶ 학습하기</>}
                          </button>
                        )}

                        {/* 관리자만 업로드 버튼 표시 */}
                        {!canOpen && isAdmin && (
                          <button
                            onClick={() => handleUploadClick(lesson)}
                            className="text-[10px] font-medium px-2.5 py-1 rounded border border-dashed border-[#c3bfb8] text-[#97938c] hover:border-[#97938c] hover:text-[#1a1918] transition-colors flex items-center gap-1"
                          >
                            <span>↑</span> 노트북 연결
                          </button>
                        )}

                        <span className={`text-[11px] tabular-nums px-2 py-0.5 rounded font-medium ${
                          open && !canOpen ? 'border border-[#3a3835] text-[#3a3835]' : 'bg-[#f0ede8] text-[#97938c]'
                        }`}>
                          {lesson.hours}h
                        </span>

                        {!canOpen && hasDetail && (
                          <button onClick={() => toggleLesson(i)} className="text-[12px] text-[#97938c] w-4">
                            {open ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 아코디언 상세 */}
                    {!canOpen && open && hasDetail && (
                      <div className="px-8 pb-7 pt-1 bg-[#f7f6f3] border-t border-[#eceae5]">
                        <div className="ml-11">
                          {lesson.summary && (
                            <p className="text-[14px] text-[#3a3835] leading-[1.9] mb-5">{lesson.summary}</p>
                          )}
                          {lesson.objectives && lesson.objectives.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.16em] mb-3">학습 목표</p>
                              <ul className="space-y-2">
                                {lesson.objectives.map((obj, oi) => (
                                  <li key={oi} className="flex items-start gap-2.5 text-[14px] text-[#1a1918]">
                                    <span className="text-[#c3bfb8] mt-1 flex-shrink-0">—</span>
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleUploadClick(lesson)}
                              className="mt-6 flex items-center gap-2 text-[12px] text-[#97938c] hover:text-[#1a1918] transition-colors group"
                            >
                              <span className="w-7 h-7 flex items-center justify-center border border-dashed border-[#c3bfb8] group-hover:border-[#97938c] rounded transition-colors text-[14px]">↑</span>
                              <span>.ipynb 노트북 파일 연결하기</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Prev / Next */}
            {subject.nodes.length > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e4e1da]">
                <button
                  onClick={() => { setActiveNode(n => Math.max(0, n - 1)); setActiveLesson(null); }}
                  disabled={activeNode === 0}
                  className="text-[13px] text-[#97938c] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← 이전 노드
                </button>
                <span className="text-[12px] text-[#97938c] tabular-nums font-medium">
                  {activeNode + 1} / {subject.nodes.length}
                </span>
                <button
                  onClick={() => { setActiveNode(n => Math.min(subject.nodes.length - 1, n + 1)); setActiveLesson(null); }}
                  disabled={activeNode === subject.nodes.length - 1}
                  className="text-[13px] text-[#97938c] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  다음 노드 →
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );

  function toggleLesson(i: number) {
    setActiveLesson(prev => (prev === i ? null : i));
  }
}
