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
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#f7f6f3]">

      {/* ── Sidebar ─────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-[#e4e1da] overflow-y-auto">
        <div className="px-5 py-7">
          <Link href="/curriculum" className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.06em] text-[#97938c] hover:text-[#1a1918] transition-colors mb-7 uppercase">
            ← 커리큘럼
          </Link>

          <div className="mb-6 pb-6 border-b border-[#eceae5]">
            <p className="text-[10px] tracking-[0.18em] text-[#c3bfb8] uppercase mb-2 font-medium">{subject.category}</p>
            <h1 className="text-[14px] font-semibold text-[#1a1918] leading-snug mb-3">{subject.title}</h1>
            <p className="text-[11px] text-[#97938c]">{subject.totalHours}h · {totalLessons}개 세션</p>
          </div>

          <p className="text-[10px] tracking-[0.18em] text-[#c3bfb8] uppercase mb-3 font-medium">노드</p>
          <ul className="space-y-0.5">
            {subject.nodes.map((n, i) => (
              <li key={n.id}>
                <button
                  onClick={() => { setActiveNode(i); setActiveLesson(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    activeNode === i
                      ? 'bg-[#f0ede8] text-[#1a1918]'
                      : 'text-[#4a4845] hover:bg-[#f7f6f3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] tabular-nums flex-shrink-0 font-medium ${activeNode === i ? 'text-[#97938c]' : 'text-[#c3bfb8]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-[12px] font-medium leading-snug truncate ${activeNode === i ? 'text-[#1a1918]' : 'text-[#3a3835]'}`}>{n.title}</p>
                      <p className={`text-[11px] mt-0.5 tabular-nums ${activeNode === i ? 'text-[#97938c]' : 'text-[#c3bfb8]'}`}>
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
          <div className="mb-7">
            {subject.nodes.length > 1 && (
              <p className="text-[10px] tracking-[0.2em] text-[#c3bfb8] uppercase mb-3 font-medium">
                노드 {String(activeNode + 1).padStart(2, '0')} / {subject.nodes.length}
              </p>
            )}
            <h2 className="text-[28px] font-bold text-[#1a1918] leading-snug mb-3 tracking-tight">{node.title}</h2>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[13px] text-[#97938c] tabular-nums font-medium">{node.hours}h</span>
              <span className="text-[#e4e1da]">·</span>
              <span className="text-[13px] text-[#97938c]">{node.lessons.length}개 세션</span>
            </div>
            <p className="text-[14px] text-[#4a4845] leading-[1.9] max-w-2xl mb-6">{node.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {node.topics.map((t) => (
                <span key={t} className="text-[11px] text-[#4a4845] bg-white border border-[#e4e1da] px-3 py-1 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white rounded-2xl border border-[#e4e1da] overflow-hidden">
            <div className="flex items-center justify-between px-8 py-4 border-b border-[#eceae5]">
              <h3 className="text-[12px] font-semibold text-[#1a1918] tracking-[0.08em] uppercase">세션 구성</h3>
              <span className="text-[12px] text-[#c3bfb8] tabular-nums">{node.lessons.length}개 세션</span>
            </div>

            {node.lessons.map((lesson, i) => {
              const open = activeLesson === i;
              const hasDetail = !!(lesson.summary || lesson.objectives?.length);
              return (
                <div key={i} className="border-b border-[#f5f4f0] last:border-0">
                  <button
                    onClick={() => hasDetail && toggleLesson(i)}
                    className={`w-full flex items-center gap-6 px-8 py-4 text-left transition-colors ${
                      open ? 'bg-[#f7f6f3]' : 'hover:bg-[#f7f6f3]'
                    } ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`text-[11px] tabular-nums flex-shrink-0 w-5 font-medium ${open ? 'text-[#1a1918]' : 'text-[#d8d5cf]'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`flex-1 text-[14px] leading-snug ${open ? 'font-semibold text-[#1a1918]' : 'font-medium text-[#3a3835]'}`}>
                      {lesson.title}
                    </span>
                    <span className={`text-[11px] tabular-nums px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${
                      open ? 'bg-[#1a1918] text-white' : 'bg-[#f0ede8] text-[#97938c]'
                    }`}>
                      {lesson.hours}h
                    </span>
                    {hasDetail && (
                      <span className="text-[10px] text-[#c3bfb8] flex-shrink-0">{open ? '▲' : '▼'}</span>
                    )}
                  </button>

                  {open && hasDetail && (
                    <div className="px-8 pb-7 pt-1 bg-[#f7f6f3] border-t border-[#eceae5]">
                      <div className="ml-11">
                        {lesson.summary && (
                          <p className="text-[13px] text-[#4a4845] leading-[1.9] mb-5">{lesson.summary}</p>
                        )}
                        {lesson.objectives && lesson.objectives.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-[#c3bfb8] uppercase tracking-[0.16em] mb-3">학습 목표</p>
                            <ul className="space-y-2">
                              {lesson.objectives.map((obj, oi) => (
                                <li key={oi} className="flex items-start gap-2.5 text-[13px] text-[#4a4845]">
                                  <span className="text-[#d8d5cf] mt-1 flex-shrink-0">—</span>
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
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e4e1da]">
              <button
                onClick={() => { setActiveNode((n) => Math.max(0, n - 1)); setActiveLesson(null); }}
                disabled={activeNode === 0}
                className="text-[13px] text-[#97938c] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← 이전 노드
              </button>
              <span className="text-[12px] text-[#c3bfb8] tabular-nums">{activeNode + 1} / {subject.nodes.length}</span>
              <button
                onClick={() => { setActiveNode((n) => Math.min(subject.nodes.length - 1, n + 1)); setActiveLesson(null); }}
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
  );
}
