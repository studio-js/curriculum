'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Subject } from '@/types/curriculum';

export default function SubjectLayout({ subject }: { subject: Subject }) {
  const [activeNode, setActiveNode] = useState(0);
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const node = subject.nodes[activeNode];
  const totalLessons = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);

  function toggleLesson(i: number) {
    setActiveLesson((prev) => (prev === i ? null : i));
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white">

      {/* ── Sidebar ─────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-[#e5e5e5] overflow-y-auto">
        <div className="px-5 py-7">
          <Link href="/curriculum" className="inline-flex items-center gap-1.5 text-[13px] text-[#999] hover:text-[#1a1a1a] transition-colors mb-7">
            ← 커리큘럼
          </Link>

          <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
            <p className="text-[11px] tracking-widest text-[#bbb] uppercase mb-2">{subject.category}</p>
            <h1 className="text-[15px] font-semibold text-[#1a1a1a] leading-snug mb-3">{subject.title}</h1>
            <p className="text-[13px] text-[#999]">{subject.totalHours}h · {totalLessons}개 세션</p>
          </div>

          <p className="text-[11px] tracking-widest text-[#bbb] uppercase mb-3">노드</p>
          <ul className="space-y-1">
            {subject.nodes.map((n, i) => (
              <li key={n.id}>
                <button
                  onClick={() => { setActiveNode(i); setActiveLesson(null); }}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors border ${
                    activeNode === i
                      ? 'bg-[#f5f5f5] border-[#1a1a1a] text-[#1a1a1a]'
                      : 'border-transparent text-[#555] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`text-[11px] font-mono tabular-nums mt-0.5 flex-shrink-0 ${activeNode === i ? 'text-[#888]' : 'text-[#ccc]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className={`text-[13px] font-medium leading-snug ${activeNode === i ? 'text-[#1a1a1a]' : 'text-[#444]'}`}>{n.title}</p>
                      <p className={`text-[12px] mt-0.5 tabular-nums ${activeNode === i ? 'text-[#777]' : 'text-[#bbb]'}`}>
                        {n.lessons.length}개 세션 · {n.hours}h
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Content ─────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10">

          {/* Node header */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] p-8 mb-6">
            {subject.nodes.length > 1 && (
              <p className="text-[11px] tracking-widest text-[#bbb] uppercase mb-2">
                노드 {String(activeNode + 1).padStart(2, '0')} / {subject.nodes.length}
              </p>
            )}
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-[22px] font-bold text-[#1a1a1a] leading-snug">{node.title}</h2>
              <span className="text-[16px] font-semibold text-[#333] tabular-nums flex-shrink-0 mt-0.5">{node.hours}h</span>
            </div>
            <p className="text-[15px] text-[#555] leading-[1.85]">{node.description}</p>

            {/* Topics */}
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[#f0f0f0]">
              {node.topics.map((t) => (
                <span key={t} className="text-[13px] text-[#555] bg-[#f4f3ef] px-3 py-1 rounded-full border border-[#e5e5e5]">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] bg-white">
              <h3 className="text-[14px] font-semibold text-[#1a1a1a]">세션 구성</h3>
              <span className="text-[13px] text-[#aaa]">{node.lessons.length}개 세션</span>
            </div>

            {node.lessons.map((lesson, i) => {
              const open = activeLesson === i;
              const hasDetail = !!(lesson.summary || (lesson.objectives?.length));
              return (
                <div key={i} className="border-b border-[#f4f4f4] last:border-0">
                  <button
                    onClick={() => hasDetail && toggleLesson(i)}
                    className={`w-full flex items-start justify-between px-6 py-4 text-left transition-colors ${
                      open ? 'bg-[#fafafa]' : 'hover:bg-[#fafafa]'
                    } ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <span className="text-[12px] text-[#ccc] font-mono tabular-nums w-5 flex-shrink-0 mt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`text-[15px] leading-snug ${open ? 'font-semibold text-[#1a1a1a]' : 'font-medium text-[#333]'}`}>
                        {lesson.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4 mt-0.5">
                      <span className="text-[13px] text-[#aaa] tabular-nums">{lesson.hours}h</span>
                      {hasDetail && (
                        <span className="text-[11px] text-[#ccc]">{open ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </button>

                  {open && hasDetail && (
                    <div className="px-6 pb-6 pt-2 bg-[#fafafa] border-t border-[#f0f0f0]">
                      {lesson.summary && (
                        <p className="text-[14px] text-[#555] leading-[1.85] mb-5 ml-9">{lesson.summary}</p>
                      )}
                      {lesson.objectives && lesson.objectives.length > 0 && (
                        <div className="ml-9">
                          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-3">학습 목표</p>
                          <ul className="space-y-2">
                            {lesson.objectives.map((obj, oi) => (
                              <li key={oi} className="flex items-start gap-2.5 text-[14px] text-[#444]">
                                <span className="text-[#ccc] mt-1 flex-shrink-0">—</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prev / Next */}
          {subject.nodes.length > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#e5e5e5]">
              <button
                onClick={() => { setActiveNode((n) => Math.max(0, n - 1)); setActiveLesson(null); }}
                disabled={activeNode === 0}
                className="text-[14px] text-[#888] hover:text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← 이전 노드
              </button>
              <span className="text-[13px] text-[#ccc] tabular-nums">{activeNode + 1} / {subject.nodes.length}</span>
              <button
                onClick={() => { setActiveNode((n) => Math.min(subject.nodes.length - 1, n + 1)); setActiveLesson(null); }}
                disabled={activeNode === subject.nodes.length - 1}
                className="text-[14px] text-[#888] hover:text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                다음 노드 →
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
