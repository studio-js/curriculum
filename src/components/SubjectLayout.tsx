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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#fafafa]">

      {/* ── Sidebar ─────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-[#e5e5e5] overflow-y-auto">
        <div className="px-5 py-7">
          <Link href="/curriculum" className="inline-flex items-center gap-1.5 text-[12px] text-[#999] hover:text-[#1a1a1a] transition-colors mb-7">
            ← 커리큘럼
          </Link>

          <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
            <p className="text-[10px] tracking-widest text-[#ccc] uppercase mb-2">{subject.category}</p>
            <h1 className="text-[14px] font-semibold text-[#1a1a1a] leading-snug mb-3">{subject.title}</h1>
            <p className="text-[12px] text-[#aaa]">{subject.totalHours}h · {totalLessons}개 세션</p>
          </div>

          <p className="text-[10px] tracking-widest text-[#ccc] uppercase mb-3">노드</p>
          <ul className="space-y-0.5">
            {subject.nodes.map((n, i) => (
              <li key={n.id}>
                <button
                  onClick={() => { setActiveNode(i); setActiveLesson(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    activeNode === i
                      ? 'bg-[#1a1a1a] text-white'
                      : 'text-[#555] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-mono tabular-nums flex-shrink-0 ${activeNode === i ? 'text-[#888]' : 'text-[#ccc]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[12px] font-medium leading-snug truncate ${activeNode === i ? 'text-white' : 'text-[#333]'}`}>{n.title}</p>
                      <p className={`text-[11px] mt-0.5 tabular-nums ${activeNode === i ? 'text-[#999]' : 'text-[#ccc]'}`}>
                        {n.lessons.length}세션 · {n.hours}h
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
        <div className="px-10 py-10">

          {/* Node header */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] mb-5 overflow-hidden">

            {/* Top: title + meta */}
            <div className="flex gap-10 p-8 border-b border-[#f0f0f0]">
              {/* Left */}
              <div className="flex-1 min-w-0">
                {subject.nodes.length > 1 && (
                  <p className="text-[10px] tracking-widest text-[#ccc] uppercase mb-2">
                    노드 {String(activeNode + 1).padStart(2, '0')} / {subject.nodes.length}
                  </p>
                )}
                <h2 className="text-[24px] font-bold text-[#1a1a1a] leading-snug mb-4">{node.title}</h2>
                <p className="text-[14px] text-[#666] leading-[1.9] mb-5">{node.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {node.topics.map((t) => (
                    <span key={t} className="text-[11px] text-[#555] bg-[#f5f5f5] border border-[#ebebeb] px-2.5 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: stats */}
              <div className="w-44 flex-shrink-0 flex flex-col gap-3">
                <div className="bg-[#f5f5f5] rounded-xl p-5 text-center">
                  <p className="text-[10px] tracking-widest text-[#bbb] uppercase mb-2">학습 시간</p>
                  <p className="text-[36px] font-bold tabular-nums text-[#1a1a1a] leading-none">{node.hours}</p>
                  <p className="text-[13px] text-[#bbb] mt-1">hours</p>
                </div>
                <div className="bg-[#f5f5f5] rounded-xl p-5 text-center">
                  <p className="text-[10px] tracking-widest text-[#bbb] uppercase mb-2">세션 수</p>
                  <p className="text-[36px] font-bold tabular-nums text-[#1a1a1a] leading-none">{node.lessons.length}</p>
                  <p className="text-[13px] text-[#bbb] mt-1">sessions</p>
                </div>
              </div>
            </div>

            {/* Bottom: session preview grid */}
            <div className="px-8 py-6 bg-[#fafafa]">
              <p className="text-[10px] tracking-widest text-[#bbb] uppercase mb-4">세션 목록</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {node.lessons.map((lesson, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[#ddd] tabular-nums flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[13px] text-[#555] truncate flex-1">{lesson.title}</span>
                    <span className="text-[11px] text-[#ccc] tabular-nums flex-shrink-0">{lesson.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
            <div className="flex items-center justify-between px-8 py-4 border-b border-[#f0f0f0]">
              <h3 className="text-[13px] font-semibold text-[#1a1a1a] tracking-wide">세션 구성</h3>
              <span className="text-[12px] text-[#bbb]">{node.lessons.length}개 세션</span>
            </div>

            {node.lessons.map((lesson, i) => {
              const open = activeLesson === i;
              const hasDetail = !!(lesson.summary || lesson.objectives?.length);
              return (
                <div key={i} className="border-b border-[#f4f4f4] last:border-0">
                  <button
                    onClick={() => hasDetail && toggleLesson(i)}
                    className={`w-full flex items-center gap-6 px-8 py-4 text-left transition-colors ${
                      open ? 'bg-[#fafafa]' : 'hover:bg-[#fafafa]'
                    } ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {/* Session number */}
                    <span className={`text-[11px] font-mono tabular-nums flex-shrink-0 w-5 ${open ? 'text-[#1a1a1a] font-bold' : 'text-[#ddd]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Title */}
                    <span className={`flex-1 text-[14px] leading-snug ${open ? 'font-semibold text-[#1a1a1a]' : 'font-medium text-[#333]'}`}>
                      {lesson.title}
                    </span>

                    {/* Hours pill */}
                    <span className={`text-[11px] tabular-nums px-2.5 py-1 rounded-full flex-shrink-0 ${
                      open ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0f0f0] text-[#999]'
                    }`}>
                      {lesson.hours}h
                    </span>

                    {hasDetail && (
                      <span className="text-[10px] text-[#ccc] flex-shrink-0">{open ? '▲' : '▼'}</span>
                    )}
                  </button>

                  {open && hasDetail && (
                    <div className="px-8 pb-7 pt-1 bg-[#fafafa] border-t border-[#f0f0f0]">
                      <div className="ml-11">
                        {lesson.summary && (
                          <p className="text-[13px] text-[#666] leading-[1.9] mb-5">{lesson.summary}</p>
                        )}
                        {lesson.objectives && lesson.objectives.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-[#bbb] uppercase tracking-wider mb-3">학습 목표</p>
                            <ul className="space-y-2">
                              {lesson.objectives.map((obj, oi) => (
                                <li key={oi} className="flex items-start gap-2.5 text-[13px] text-[#555]">
                                  <span className="text-[#ddd] mt-1 flex-shrink-0">—</span>
                                  <span>{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
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
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e5e5e5]">
              <button
                onClick={() => { setActiveNode((n) => Math.max(0, n - 1)); setActiveLesson(null); }}
                disabled={activeNode === 0}
                className="text-[13px] text-[#888] hover:text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← 이전 노드
              </button>
              <span className="text-[12px] text-[#ccc] tabular-nums">{activeNode + 1} / {subject.nodes.length}</span>
              <button
                onClick={() => { setActiveNode((n) => Math.min(subject.nodes.length - 1, n + 1)); setActiveLesson(null); }}
                disabled={activeNode === subject.nodes.length - 1}
                className="text-[13px] text-[#888] hover:text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
