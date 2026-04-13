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
    <div className="flex h-[calc(100vh-48px)] overflow-hidden">

      {/* ── Sidebar ───────────────────────────── */}
      <aside className="w-60 flex-shrink-0 border-r border-[#e8e8e8] overflow-y-auto">
        <div className="px-5 py-6">
          <Link href="/curriculum" className="inline-flex items-center gap-1 text-[12px] text-[#999] hover:text-[#333] transition-colors mb-6">
            ← 커리큘럼
          </Link>

          <div className="mb-5 pb-5 border-b border-[#f0f0f0]">
            <p className="text-[10px] tracking-widest text-[#bbb] uppercase mb-1.5">{subject.category}</p>
            <h1 className="text-[13px] font-medium text-[#111] leading-snug mb-2">{subject.title}</h1>
            <p className="text-[11px] text-[#999]">{subject.totalHours}h · {totalLessons}개 세션</p>
          </div>

          <p className="text-[10px] tracking-widest text-[#bbb] uppercase mb-2.5">노드</p>
          <ul className="space-y-1">
            {subject.nodes.map((n, i) => (
              <li key={n.id}>
                <button
                  onClick={() => { setActiveNode(i); setActiveLesson(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                    activeNode === i ? 'bg-[#111] text-white' : 'text-[#444] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <span className={`text-[10px] font-mono mr-2 ${activeNode === i ? 'text-[#888]' : 'text-[#ccc]'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {n.title}
                  <span className={`block text-[11px] mt-0.5 ml-5 ${activeNode === i ? 'text-[#aaa]' : 'text-[#bbb]'}`}>
                    {n.lessons.length}개 세션 · {n.hours}h
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Main content ──────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10">

          {/* Node header */}
          <div className="pb-8 border-b border-[#ebebeb] mb-8">
            {subject.nodes.length > 1 && (
              <p className="text-[11px] tracking-widest text-[#bbb] uppercase mb-2">
                노드 {String(activeNode + 1).padStart(2, '0')} / {subject.nodes.length}
              </p>
            )}
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[22px] font-medium text-[#111] leading-snug">{node.title}</h2>
              <span className="text-[15px] font-medium text-[#333] tabular-nums mt-1 flex-shrink-0">{node.hours}h</span>
            </div>
            <p className="text-[14px] text-[#555] leading-[1.85] mt-4">{node.description}</p>
          </div>

          {/* Sessions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-[#111]">세션 구성</h3>
              <span className="text-[12px] text-[#999]">{node.lessons.length}개</span>
            </div>

            <div className="border border-[#e8e8e8] rounded-xl overflow-hidden">
              {node.lessons.map((lesson, i) => {
                const open = activeLesson === i;
                const hasDetail = !!(lesson.summary || lesson.objectives);
                return (
                  <div key={i} className="border-b border-[#f4f4f4] last:border-0">
                    <button
                      onClick={() => hasDetail && toggleLesson(i)}
                      className={`w-full flex items-baseline justify-between px-5 py-4 text-left transition-colors ${
                        open ? 'bg-[#fafafa]' : 'hover:bg-[#fafafa]'
                      } ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-baseline gap-4 flex-1 min-w-0">
                        <span className="text-[11px] text-[#ccc] font-mono tabular-nums w-5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <span className={`text-[14px] ${open ? 'font-medium text-[#111]' : 'text-[#333]'}`}>{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-[12px] text-[#aaa] tabular-nums">{lesson.hours}h</span>
                        {hasDetail && (
                          <span className="text-[11px] text-[#ccc]">{open ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </button>

                    {open && hasDetail && (
                      <div className="px-5 pb-5 pt-1 bg-[#fafafa] border-t border-[#f0f0f0]">
                        {lesson.summary && (
                          <p className="text-[13px] text-[#555] leading-[1.85] mb-4 ml-9">{lesson.summary}</p>
                        )}
                        {lesson.objectives && lesson.objectives.length > 0 && (
                          <div className="ml-9">
                            <p className="text-[11px] font-medium text-[#888] uppercase tracking-wider mb-2">학습 목표</p>
                            <ul className="space-y-1.5">
                              {lesson.objectives.map((obj, oi) => (
                                <li key={oi} className="flex items-start gap-2 text-[13px] text-[#444]">
                                  <span className="text-[#bbb] mt-0.5 flex-shrink-0">—</span>
                                  {obj}
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
          </div>

          {/* Topics */}
          <div className="flex flex-wrap gap-2">
            {node.topics.map((t) => (
              <span key={t} className="text-[12px] text-[#555] bg-[#f4f4f4] px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>

          {/* Prev / Next */}
          {subject.nodes.length > 1 && (
            <div className="flex justify-between mt-14 pt-7 border-t border-[#ebebeb]">
              <button
                onClick={() => { setActiveNode((n) => Math.max(0, n - 1)); setActiveLesson(null); }}
                disabled={activeNode === 0}
                className="text-[13px] text-[#888] hover:text-[#111] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >← 이전 노드</button>
              <span className="text-[12px] text-[#ccc] tabular-nums">{activeNode + 1} / {subject.nodes.length}</span>
              <button
                onClick={() => { setActiveNode((n) => Math.min(subject.nodes.length - 1, n + 1)); setActiveLesson(null); }}
                disabled={activeNode === subject.nodes.length - 1}
                className="text-[13px] text-[#888] hover:text-[#111] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >다음 노드 →</button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
