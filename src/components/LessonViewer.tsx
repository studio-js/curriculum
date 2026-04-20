'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { NotebookSection, CodeBlock, CodeOutput } from '@/lib/notebookParser';
import { normalizeSections } from '@/lib/notebookParser';
import { useColabKernel, type ExecResult } from '@/hooks/useColabKernel';
import ColabConnect from '@/components/ColabConnect';
import { glossaryMap, glossaryRegex } from '@/lib/glossary';

/* ─────────────────────────────────────────────────────
   코드 하이라이팅 — 웜 라이트 테마
   주석이 확실히 보이되 은은하게, 배경과 어우러지도록
───────────────────────────────────────────────────── */
const warmLight: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#2d2a27', background: 'none',
    fontFamily: '"SF Mono","Fira Code","Fira Mono",monospace',
    fontSize: '13px', lineHeight: '1.8',
  },
  'pre[class*="language-"]': {
    color: '#2d2a27', background: 'transparent',
    padding: '0', margin: '0', overflow: 'auto',
  },
  comment:      { color: '#8a8480', fontStyle: 'italic' },   // 가독성 확보
  punctuation:  { color: '#a5a09a' },
  operator:     { color: '#7a7570' },
  string:       { color: '#3d7a52' },                         // 더 진한 초록
  'template-string': { color: '#3d7a52' },
  keyword:      { color: '#7a4f2d' },                         // 진한 앰버
  builtin:      { color: '#7a4f2d' },
  'class-name': { color: '#2d5a8a' },                         // 슬레이트 블루
  function:     { color: '#2d5a8a' },
  number:       { color: '#7a5230' },
  boolean:      { color: '#7a4f2d' },
  decorator:    { color: '#7a7570' },
  'attr-name':  { color: '#7a4f2d' },
};

/* ─────────────────────────────────────────────────────
   용어 툴팁
───────────────────────────────────────────────────── */
function GlossaryTooltip({ term, definition }: { term: string; definition: string }) {
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number; arrowLeft: number }>({ top: 0, left: 0, arrowLeft: 128 });
  const termRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (termRef.current) {
      const rect = termRef.current.getBoundingClientRect();
      const W = 256;   // w-64 = 256px
      const GAP = 8;   // gap between term and tooltip
      const MARGIN = 12; // min distance from viewport edge

      const termCx = rect.left + rect.width / 2;
      let left = termCx - W / 2;
      // clamp to viewport
      if (left < MARGIN) left = MARGIN;
      if (left + W > window.innerWidth - MARGIN) left = window.innerWidth - MARGIN - W;

      setStyle({
        top:       rect.top - GAP,          // tooltip bottom = term top - gap
        left,
        arrowLeft: termCx - left,           // arrow stays over the term
      });
    }
    setShow(true);
  }, []);

  return (
    <span className="relative inline" onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
      {/* 약한 amber 하이라이트 + 점선 밑줄 */}
      <span ref={termRef} className="bg-[#f5efd6] rounded-[3px] px-[3px] border-b border-dotted border-[#c0a055] cursor-help leading-normal">
        {term}
      </span>

      {/* portal → document.body 에 렌더 → overflow 클리핑 완전 우회 */}
      {show && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-64 bg-[#1a1918] text-[#f0ede8] text-[11.5px] leading-relaxed px-3.5 py-3 pointer-events-none"
          style={{
            top:       style.top,
            left:      style.left,
            transform: 'translateY(calc(-100% - 0px))',
            whiteSpace: 'normal',
            wordBreak: 'keep-all',
          }}
        >
          <span className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-[#c3bfb8] mb-1.5">{term}</span>
          {definition}
          {/* 화살표: 항상 용어 중앙 가리킴 */}
          <span
            className="absolute top-full"
            style={{
              left:      style.arrowLeft,
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft:  '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop:   '5px solid #1a1918',
            }}
          />
        </div>,
        document.body
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────
   용어 해설 패널 (나무위키식 각주)
───────────────────────────────────────────────────── */
function GlossaryFootnotePanel({ sections }: { sections: NotebookSection[] }) {
  const [open, setOpen] = useState(false);

  const terms = useMemo(() => {
    const found = new Map<string, string>(); // primary term → definition
    for (const sec of sections) {
      glossaryRegex.lastIndex = 0;
      let m: RegExpExecArray | null;
      const combined = glossaryRegex;
      combined.lastIndex = 0;
      while ((m = combined.exec(sec.markdown)) !== null) {
        const matched = m[0];
        const entry = glossaryMap.get(matched);
        if (entry && !found.has(entry.term)) {
          found.set(entry.term, entry.definition);
        }
      }
    }
    return Array.from(found.entries()).map(([term, definition]) => ({ term, definition }));
  }, [sections]);

  if (terms.length === 0) return null;

  return (
    <div className="mt-10 border-t border-[#e4e1da]">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 w-full pt-4 pb-2 text-left group"
      >
        <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-[#97938c]">용어 해설</span>
        <span className="text-[9px] text-[#c3bfb8] font-medium tabular-nums">({terms.length})</span>
        <span className="ml-auto text-[#c3bfb8] group-hover:text-[#97938c] transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-1 pb-4">
          {terms.map(({ term, definition }, i) => (
            <div
              key={term}
              className={`flex gap-4 py-2.5 text-[12px] ${i < terms.length - 1 ? 'border-b border-[#f0ede8]' : ''}`}
            >
              <span className="flex-shrink-0 text-[#97938c] tabular-nums text-[10px] mt-[2px] w-5 text-right">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-shrink-0 font-semibold text-[#1a1918] w-28 leading-relaxed">
                <span className="bg-[#f5efd6] rounded-[3px] px-[3px] border-b border-dotted border-[#c0a055] text-[11.5px]">
                  {term}
                </span>
              </span>
              <span className="text-[#58554f] leading-relaxed">{definition}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 텍스트 노드에서 용어를 찾아 GlossaryTooltip으로 감싸 반환 */
function applyGlossary(text: string): React.ReactNode {
  glossaryRegex.lastIndex = 0;
  const parts = text.split(glossaryRegex);
  if (parts.length <= 1) return text;
  return parts.map((part, i) => {
    const entry = glossaryMap.get(part);
    if (entry) return <GlossaryTooltip key={i} term={part} definition={entry.definition} />;
    return part || null;
  });
}

/** ReactMarkdown children 중 string 노드에만 용어 처리 적용 */
function withGlossary(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') return applyGlossary(children);
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string'
        ? <React.Fragment key={i}>{applyGlossary(child)}</React.Fragment>
        : child
    );
  }
  return children;
}

/* ─────────────────────────────────────────────────────
   마크다운 컴포넌트
───────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const md: Record<string, React.FC<any>> = {
  h1: ({ children }) => <h1 className="text-[20px] font-bold text-[#1a1918] mb-4 leading-snug tracking-tight break-words">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[17px] font-semibold text-[#1a1918] mb-3 mt-1 leading-snug tracking-tight break-words">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[13px] font-semibold text-[#1a1918] mb-2 mt-4 uppercase tracking-[0.07em] break-words">{children}</h3>,
  p:  ({ children }) => <p className="text-[14px] text-[#3a3835] leading-[1.95] mb-4 break-words">{withGlossary(children)}</p>,
  ul: ({ children }) => <ul className="mb-4 space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 space-y-1.5">{children}</ol>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-[14px] text-[#3a3835] leading-[1.85]">
      <span className="text-[#d8d5cf] mt-[5px] flex-shrink-0 text-[8px]">▸</span>
      <span className="break-words min-w-0">{withGlossary(children)}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#e4e1da] pl-4 py-0.5 my-4 text-[13px] text-[#97938c] italic break-words">{withGlossary(children)}</blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-[#1a1918]">{children}</strong>,
  em:     ({ children }) => <em className="italic text-[#58554f]">{children}</em>,
  /* 인라인 코드: 줄바꿈 허용 / 펜스드 코드블록은 pre가 처리 */
  code:   ({ children, className }) => {
    if (className?.startsWith('language-')) {
      return <code className="text-[12.5px] font-mono text-[#2d2a27] whitespace-pre">{children}</code>;
    }
    return <code className="bg-[#eceae5] text-[12.5px] px-[5px] py-[2px] rounded text-[#3a3835] font-mono break-all">{children}</code>;
  },
  /* 펜스드 코드블록: 카드 안에서 가로 스크롤 */
  pre: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded border border-[#e4e1da]">
      <pre className="bg-[#f5f3ef] px-4 py-3 text-[12.5px] font-mono text-[#2d2a27] leading-relaxed whitespace-pre min-w-max">
        {children}
      </pre>
    </div>
  ),
  table: ({ children }) => <div className="overflow-x-auto mb-5"><table className="w-full text-[13px] border-collapse">{children}</table></div>,
  thead: ({ children }) => <thead className="border-b border-[#e4e1da]">{children}</thead>,
  th:    ({ children }) => <th className="text-left py-2 pr-6 text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em]">{withGlossary(children)}</th>,
  td:    ({ children }) => <td className="py-2 pr-6 text-[13px] text-[#3a3835] border-b border-[#f0ede8] break-words">{withGlossary(children)}</td>,
  hr:    () => <hr className="border-0 border-t border-[#eceae5] my-6" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  img:   ({ src, alt }: any) => {
    if (!src) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ''} className="max-w-full rounded my-3 border border-[#e4e1da]" />;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ href, children, ...props }: any) => {
    if (!href) return <span>{children}</span>;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-[#eef3f9] rounded-[3px] px-[3px] text-[#1a4a7a] underline decoration-[#1a4a7a]/40 underline-offset-2 hover:decoration-[#1a4a7a] hover:bg-[#e3ecf6] transition-colors"
        {...props}
      >
        {children}
        <svg className="w-3 h-3 flex-shrink-0 text-[#1a4a7a]/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6.5 3.5h6m0 0v6m0-6L7 10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    );
  },
};

/* ─────────────────────────────────────────────────────
   마크다운 렌더러 — <img> <a> raw HTML 태그도 처리
   rehype-raw가 components 맵을 우회하므로
   ReactMarkdown 전에 <img>와 <a>를 추출해 직접 렌더링
───────────────────────────────────────────────────── */
const IMG_RE = /<img\s[^>]*>/gi;
const LINK_RE = /<a\s[^>]*href=["']([^"']+)["'][^>]*>.*?<\/a>/gi;

function renderRawLink(tag: string, key: number) {
  const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
  const href = hrefMatch?.[1] ?? '';
  const textMatch = tag.match(/>([^<]+)<\/a>/i);
  const text = textMatch?.[1] ?? href;

  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 bg-[#eef3f9] rounded-[3px] px-[3px] text-[#1a4a7a] underline decoration-[#1a4a7a]/40 underline-offset-2 hover:decoration-[#1a4a7a] hover:bg-[#e3ecf6] transition-colors"
    >
      {text}
      <svg className="w-3 h-3 flex-shrink-0 text-[#1a4a7a]/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6.5 3.5h6m0 0v6m0-6L7 10" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  );
}

function MdWithImages({ children }: { children: string }) {
  const parts: { type: 'md' | 'img' | 'link'; content: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(children)) !== null) {
    if (m.index > last) parts.push({ type: 'md', content: children.slice(last, m.index) });
    parts.push({ type: 'link', content: m[0] });
    last = m.index + m[0].length;
  }
  
  IMG_RE.lastIndex = last;
  while ((m = IMG_RE.exec(children)) !== null) {
    if (m.index > last) parts.push({ type: 'md', content: children.slice(last, m.index) });
    parts.push({ type: 'img', content: m[0] });
    last = m.index + m[0].length;
  }
  if (last < children.length) parts.push({ type: 'md', content: children.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'img') {
          const srcMatch = p.content.match(/src=["']([^"']+)["']/i);
          const altMatch = p.content.match(/alt=["']([^"']*)["']/i);
          if (!srcMatch?.[1]) return null;
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={srcMatch[1]} alt={altMatch?.[1] ?? ''} className="max-w-full rounded my-3 border border-[#e4e1da]" />;
        }
        if (p.type === 'link') {
          return renderRawLink(p.content, i);
        }
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={md}>
            {p.content}
          </ReactMarkdown>
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────────────
   코드 출력 결과 표시
───────────────────────────────────────────────────── */
function OutputBlock({ outputs, idx }: { outputs: CodeOutput[]; idx: number }) {
  if (!outputs.length) return null;
  const hasError   = outputs.some(o => o.type === 'error');
  const allImages  = outputs.flatMap(o => o.images ?? []);
  const textOutputs = outputs.filter(o => o.text.trim());

  return (
    <div className={`mt-0 rounded-b border-t overflow-hidden ${hasError ? 'border-[#e8b4a8] bg-[#fdf5f3]' : 'border-[#e4e1da] bg-[#eceae5]'}`}>
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${hasError ? 'border-[#e8b4a8] bg-[#faeae6]' : 'border-[#dedad4] bg-[#e4e1da]'}`}>
        <span className={`text-[9px] font-semibold tracking-[0.18em] uppercase ${hasError ? 'text-[#b05030]' : 'text-[#97938c]'}`}>
          Out [{idx + 1}]
        </span>
        {hasError && <span className="text-[9px] text-[#b05030] font-medium">오류</span>}
      </div>
      {textOutputs.length > 0 && (
        <pre className={`px-4 py-3 text-[12.5px] font-mono leading-[1.75] whitespace-pre overflow-x-auto ${hasError ? 'text-[#b05030]' : 'text-[#4a4845]'}`}>
          {textOutputs.map(o => o.text).join('\n')}
        </pre>
      )}
      {allImages.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="출력 결과" className="max-w-full px-4 pb-4 block" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   실시간 실행 결과 (Colab 실행 후 표시)
───────────────────────────────────────────────────── */
function LiveOutputBlock({ result }: { result: ExecResult }) {
  const hasError = !result.success;
  return (
    <div className={`rounded-b border-t overflow-hidden ${hasError ? 'border-[#e8b4a8] bg-[#fdf5f3]' : 'border-[#a8d4b0] bg-[#f4faf5]'}`}>
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${hasError ? 'border-[#e8b4a8] bg-[#faeae6]' : 'border-[#9ecba8] bg-[#e6f4e9]'}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasError ? 'bg-[#c04030]' : 'bg-[#2d8a4a]'}`} />
        <span className={`text-[9px] font-semibold tracking-[0.18em] uppercase ${hasError ? 'text-[#b04030]' : 'text-[#2d7a3a]'}`}>
          실행 결과
        </span>
        {hasError && <span className="text-[9px] text-[#b04030]">오류</span>}
      </div>
      {(result.output || result.error) && (
        <pre className={`px-4 py-3 text-[12.5px] font-mono leading-[1.75] whitespace-pre overflow-x-auto ${hasError ? 'text-[#b04030]' : 'text-[#1a3a20]'}`}>
          {hasError ? result.error : result.output}
        </pre>
      )}
      {result.images?.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={`data:image/png;base64,${img}`} alt="실행 결과" className="max-w-full px-4 pb-4 block" />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   핵심 개념 추출 (코드 없는 섹션용)
───────────────────────────────────────────────────── */
function extractKeyPoints(markdown: string): string[] {
  return markdown
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*+]\s+.+/.test(l) || /^#{2,3}\s+.+/.test(l))
    .map(l => l.replace(/^[-*+#{]+\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

/* ─────────────────────────────────────────────────────
   .ipynb 내보내기 (sections → file download)
───────────────────────────────────────────────────── */
function exportNotebook(sections: NotebookSection[], filename: string) {
  const cells: object[] = [];
  for (const sec of sections) {
    if (sec.markdown.trim()) {
      cells.push({
        cell_type: 'markdown', metadata: {},
        source: sec.markdown.split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l),
      });
    }
    for (const block of sec.codes) {
      cells.push({
        cell_type: 'code', execution_count: null, metadata: {},
        outputs: block.outputs.map(o => ({
          output_type: o.type === 'error' ? 'error' : 'stream',
          name: 'stdout',
          text: [o.text + '\n'],
        })),
        source: block.source.split('\n').map((l, i, a) => i < a.length - 1 ? l + '\n' : l),
      });
    }
  }
  const nb = {
    cells,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: sections[0]?.language ?? 'python' },
    },
    nbformat: 4, nbformat_minor: 5,
  };
  const blob = new Blob([JSON.stringify(nb, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[/\\:*?"<>|]/g, '_')}.ipynb`;
  a.click();
  URL.revokeObjectURL(url);
}

function storageKey(t: string) { return `notebook-edits::${t}`; }

/* ═════════════════════════════════════════════════════
   Props
═════════════════════════════════════════════════════ */
interface LessonViewerProps {
  subjectTitle: string;
  lessonTitle: string;
  sections: NotebookSection[];
  onClose: () => void;
}

/* ═════════════════════════════════════════════════════
   Component
═════════════════════════════════════════════════════ */
export default function LessonViewer({
  subjectTitle, lessonTitle, sections: initialSections, onClose,
}: LessonViewerProps) {

  /* ── 상태 ── */
  const [localSections, setLocalSections] = useState<NotebookSection[]>(initialSections);
  const [activeIdx,     setActiveIdx]     = useState(0);
  const [codeKey,       setCodeKey]       = useState(0);
  const [isEditMode,    setIsEditMode]    = useState(false);
  const [editDraft,     setEditDraft]     = useState<NotebookSection[]>(initialSections);
  const [focusedSec,    setFocusedSec]    = useState(0);
  const [hasLocalSave,  setHasLocalSave]  = useState(false);
  const [showCode,      setShowCode]      = useState(true);

  /* ── Colab 커널 ── */
  const kernel = useColabKernel();
  const [showColabConnect, setShowColabConnect] = useState(false);
  // 실행 상태: key = `${sectionIdx}-${codeIdx}`
  const [runStates,   setRunStates]   = useState<Record<string, 'running' | 'done' | 'error'>>({});
  const [liveOutputs, setLiveOutputs] = useState<Record<string, ExecResult>>({});
  const [focusedCell, setFocusedCell] = useState<string | null>(null);  // `${sIdx}-${cIdx}`
  const [copiedCells, setCopiedCells] = useState<Record<string, boolean>>({});

  const leftRef         = useRef<HTMLDivElement>(null);
  const sectionRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const scrollLock      = useRef(false);
  const scrollLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tocRef          = useRef<HTMLDivElement>(null);
  const tocItemRefs     = useRef<(HTMLButtonElement | null)[]>([]);
  const codePanelRef    = useRef<HTMLDivElement>(null);
  const codeCellRefs    = useRef<Record<string, HTMLDivElement | null>>({});

  /* ── 목차 항목: 모든 섹션의 h1·h2·h3 헤딩을 평탄하게 추출 ── */
  const tocEntries = useMemo<{ level: number; text: string; sectionIdx: number }[]>(() => {
    const secs = isEditMode ? editDraft : localSections;
    const entries: { level: number; text: string; sectionIdx: number }[] = [];
    secs.forEach((sec, si) => {
      const re = /^(#{1,3})\s+(.+)/gm;
      let m: RegExpExecArray | null;
      while ((m = re.exec(sec.markdown)) !== null) {
        entries.push({ level: m[1].length, text: m[2].trim(), sectionIdx: si });
      }
    });
    /* 헤딩이 하나도 없으면 섹션 번호로 폴백 */
    if (entries.length === 0) {
      secs.forEach((sec, si) => {
        const text = sec.markdown.trim().split('\n')[0].replace(/^#+\s*/, '') || `섹션 ${si + 1}`;
        entries.push({ level: 1, text, sectionIdx: si });
      });
    }
    return entries;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editDraft, localSections]);

  /* ── localStorage 로드 ──────────────────────────────
     저장된 편집 내용이 있으면 사용하되,
     outputs(실행 결과)는 항상 신규 파싱 값으로 보완.
     (이전 버전 localStorage에는 outputs가 없을 수 있음)
  ──────────────────────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem(storageKey(lessonTitle));
    let sections = initialSections;
    let hadSave = false;
    if (saved) {
      try {
        const parsed = normalizeSections(JSON.parse(saved));
        // 편집된 markdown/code는 유지, outputs는 신규 파싱으로 복원
        sections = parsed.map((sec, i) => ({
          ...sec,
          codes: sec.codes.map((code, ci) => ({
            ...code,
            outputs: initialSections[i]?.codes[ci]?.outputs ?? code.outputs,
          })),
        }));
        hadSave = true;
      } catch { /* skip */ }
    }
    setLocalSections(sections);
    setHasLocalSave(hadSave);
    setActiveIdx(0);
    setIsEditMode(false);
  }, [lessonTitle, initialSections]);

  /* ── ESC ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') isEditMode ? handleCancelEdit() : onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, onClose]);

  /* ── Shift+Enter: 포커스된 셀 실행 ── */
  useEffect(() => {
    if (isEditMode) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !e.shiftKey) return;
      if (focusedCell === null) return;
      e.preventDefault();
      const [sIdx, cIdx] = focusedCell.split('-').map(Number);
      const block = localSections[sIdx]?.codes[cIdx];
      if (block) handleRun(sIdx, cIdx, block.source);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, focusedCell, localSections]);

  /* ── 섹션 변경 시 포커스 초기화 ── */
  useEffect(() => { setFocusedCell(null); }, [activeIdx, focusedSec]);

  /* ── 방향키: 셀 포커스 있으면 셀 이동, 없으면 섹션 이동 / 좌우 → 코드 패널 토글 ── */
  useEffect(() => {
    if (isEditMode) return;
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      /* → 코드 패널 닫기 / ← 코드 패널 열기 */
      if (e.key === 'ArrowRight') { e.preventDefault(); setShowCode(false); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setShowCode(true);  return; }

      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const secs = localSections;
      const maxSec = secs.length - 1;

      if (focusedCell !== null) {
        /* 코드 셀 간 이동 */
        e.preventDefault();
        const [sIdx, cIdx] = focusedCell.split('-').map(Number);
        const codes = secs[sIdx]?.codes ?? [];
        const nextCIdx = cIdx + dir;
        if (nextCIdx >= 0 && nextCIdx < codes.length) {
          setFocusedCell(`${sIdx}-${nextCIdx}`);
        } else {
          /* 경계에서 섹션 전환 */
          setFocusedCell(null);
          const nextSIdx = Math.max(0, Math.min(maxSec, sIdx + dir));
          if (nextSIdx !== sIdx) scrollTo(nextSIdx);
        }
      } else {
        /* 섹션 간 이동 */
        const nextIdx = Math.max(0, Math.min(maxSec, activeIdx + dir));
        if (nextIdx !== activeIdx) {
          e.preventDefault();
          scrollTo(nextIdx);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, focusedCell, localSections, activeIdx]);

  /* ── 포커스된 셀이 바뀌면 코드 패널을 해당 셀로 스크롤 ── */
  useEffect(() => {
    if (!focusedCell) return;
    const panel = codePanelRef.current;
    const cell  = codeCellRefs.current[focusedCell];
    if (!panel || !cell) return;

    const panelRect = panel.getBoundingClientRect();
    const cellRect  = cell.getBoundingClientRect();
    if (cellRect.top < panelRect.top + 8 || cellRect.bottom > panelRect.bottom - 8) {
      const cellRelTop = cellRect.top - panelRect.top + panel.scrollTop;
      panel.scrollTo({
        top: Math.max(0, cellRelTop - 20),
        behavior: 'smooth',
      });
    }
  }, [focusedCell]);

  /* ── 스크롤 감지 ─────────────────────────────────
     트리거: 패널 중앙(50%) — 섹션 제목이 화면 절반을
     넘어갔을 때 전환해야 "지금 보고 있는 섹션" 느낌
     (25%는 너무 이르고, 50%가 체감상 자연스러움)
  ──────────────────────────────────────────────── */
  const updateActive = useCallback(() => {
    if (scrollLock.current) return;
    const panel = leftRef.current;
    if (!panel) return;

    const { scrollTop, scrollHeight, clientHeight } = panel;
    const panelRect = panel.getBoundingClientRect();

    // 맨 위 도달 → 첫 섹션 강제 (section 0이 짧으면 section 1 top도 trigger 안에 들어오는 문제)
    if (scrollTop <= 10) {
      setActiveIdx(prev => { if (prev !== 0) setCodeKey(k => k + 1); return 0; });
      return;
    }

    // 하단 도달 → 마지막 섹션 강제
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      let last = 0;
      sectionRefs.current.forEach((el, i) => { if (el) last = i; });
      setActiveIdx(prev => { if (prev !== last) setCodeKey(k => k + 1); return last; });
      return;
    }

    // 트리거: 패널 중앙선 — 섹션 top이 중앙을 넘으면 그 섹션이 현재 읽는 섹션
    const triggerY = panelRect.top + clientHeight * 0.5;

    let best = 0;
    sectionRefs.current.forEach((el, i) => {
      if (!el) return;
      if (el.getBoundingClientRect().top <= triggerY) best = i;
    });

    setActiveIdx(prev => { if (prev !== best) setCodeKey(k => k + 1); return best; });
  }, []);

  useEffect(() => {
    if (isEditMode) return;
    const panel = leftRef.current;
    if (!panel) return;
    panel.addEventListener('scroll', updateActive, { passive: true });
    return () => panel.removeEventListener('scroll', updateActive);
  }, [isEditMode, updateActive]);

  /* ── TOC 자동 스크롤: 활성 섹션이 바뀌면 첫 번째 매칭 항목이 보이도록 ── */
  useEffect(() => {
    const toc = tocRef.current;
    if (!toc) return;
    const activeTocIdx = tocEntries.findIndex((e: { sectionIdx: number }) => e.sectionIdx === activeIdx);
    if (activeTocIdx < 0) return;
    const item = tocItemRefs.current[activeTocIdx];
    if (!item) return;
    const tocTop  = toc.scrollTop;
    const tocH    = toc.clientHeight;
    const itemTop = item.offsetTop;
    const itemH   = item.offsetHeight;
    if (itemTop < tocTop + 8 || itemTop + itemH > tocTop + tocH - 8) {
      toc.scrollTo({ top: itemTop - tocH / 2 + itemH / 2, behavior: 'smooth' });
    }
  }, [activeIdx, tocEntries]);

  /* ── TOC 클릭: 즉시 하이라이트 + scroll lock ── */
  const scrollTo = useCallback((idx: number) => {
    setActiveIdx(idx);
    setCodeKey(k => k + 1);

    scrollLock.current = true;
    if (scrollLockTimer.current) clearTimeout(scrollLockTimer.current);
    scrollLockTimer.current = setTimeout(() => { scrollLock.current = false; }, 1000);

    const el = sectionRefs.current[idx];
    const panel = leftRef.current;
    if (el && panel) {
      const offset = el.getBoundingClientRect().top
        - panel.getBoundingClientRect().top
        + panel.scrollTop - 20;
      panel.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    }
  }, []);

  /* ─── 편집 핸들러 ──────────────────────────────── */
  function enterEditMode() {
    setEditDraft(localSections.map(s => ({
      ...s,
      codes: s.codes.map(b => ({ ...b })),
    })));
    setFocusedSec(activeIdx);
    setIsEditMode(true);
  }

  function handleCancelEdit() { setEditDraft(localSections); setIsEditMode(false); }

  function handleSave() {
    // 편집 저장 시 outputs 유지 (원본 outputs는 보존)
    localStorage.setItem(storageKey(lessonTitle), JSON.stringify(editDraft));
    setLocalSections(editDraft);
    setHasLocalSave(true);
    setIsEditMode(false);
  }

  function handleReset() {
    if (!confirm('저장된 편집 내용을 삭제하고 원본으로 되돌릴까요?')) return;
    localStorage.removeItem(storageKey(lessonTitle));
    setLocalSections(initialSections);
    setEditDraft(initialSections);
    setHasLocalSave(false);
    setIsEditMode(false);
  }

  /* ── 코드 복사 ── */
  async function handleCopy(cellKey: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCells(prev => ({ ...prev, [cellKey]: true }));
    setTimeout(() => setCopiedCells(prev => ({ ...prev, [cellKey]: false })), 2000);
  }

  /* ── Colab 코드 실행 ── */
  async function handleRun(sIdx: number, cIdx: number, code: string) {
    if (kernel.status !== 'connected') {
      setShowColabConnect(true);
      return;
    }
    const key = `${sIdx}-${cIdx}`;
    setRunStates(prev => ({ ...prev, [key]: 'running' }));
    const result = await kernel.execute(code);
    setLiveOutputs(prev => ({ ...prev, [key]: result }));
    setRunStates(prev => ({ ...prev, [key]: result.success ? 'done' : 'error' }));
  }

  const updateMd = (idx: number, val: string) =>
    setEditDraft(p => p.map((s, i) => i === idx ? { ...s, markdown: val } : s));

  const updateCode = (sIdx: number, cIdx: number, val: string) =>
    setEditDraft(p => p.map((s, i) => {
      if (i !== sIdx) return s;
      const codes = s.codes.map((b, ci) => ci === cIdx ? { ...b, source: val } : b);
      return { ...s, codes };
    }));

  const addCodeBlock = (sIdx: number) =>
    setEditDraft(p => p.map((s, i) =>
      i === sIdx ? { ...s, codes: [...s.codes, { source: '# 코드를 입력하세요\n', outputs: [] }] } : s
    ));

  const removeCodeBlock = (sIdx: number, cIdx: number) =>
    setEditDraft(p => p.map((s, i) =>
      i === sIdx ? { ...s, codes: s.codes.filter((_, ci) => ci !== cIdx) } : s
    ));

  function addSection() {
    const lang = localSections[0]?.language ?? 'python';
    setEditDraft(p => [...p, {
      id: `section-${Date.now()}`,
      markdown: '## 새 섹션\n\n내용을 입력하세요.',
      codes: [], language: lang,
    }]);
  }

  function removeSection(idx: number) {
    if (editDraft.length <= 1) return;
    setEditDraft(p => p.filter((_, i) => i !== idx));
    setFocusedSec(f => Math.min(f, editDraft.length - 2));
  }

  /* ── 계산값 ── */
  const viewSecs     = isEditMode ? editDraft : localSections;
  const rightIdx     = isEditMode ? focusedSec : activeIdx;
  const rightSec     = viewSecs[rightIdx];
  const hasCodes     = (rightSec?.codes.length ?? 0) > 0;
  const total        = viewSecs.length;
  const keyPoints    = !hasCodes && rightSec ? extractKeyPoints(rightSec.markdown) : [];
  const nextCodeIdx  = !hasCodes && !isEditMode
    ? localSections.findIndex((s, i) => i > rightIdx && s.codes.length > 0)
    : -1;

  /* ═══════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f7f6f3]">

      {/* ── Colab 연결 모달 ── */}
      {showColabConnect && (
        <ColabConnect
          status={kernel.status}
          errorMsg={kernel.errorMsg}
          onConnect={kernel.connect}
          onClose={() => setShowColabConnect(false)}
        />
      )}

      {/* ══ 헤더 ══ */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-[#e4e1da] flex items-center px-6 gap-4 z-10">
        {!isEditMode ? (
          <>
            <button onClick={onClose} className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.06em] text-[#97938c] hover:text-[#1a1918] transition-colors uppercase">
              ← 돌아가기
            </button>
            <span className="text-[#e4e1da]">|</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[12px] text-[#97938c] truncate">{subjectTitle}</span>
              <span className="text-[#e4e1da] text-[10px]">/</span>
              <span className="text-[13px] font-semibold text-[#1a1918] truncate">{lessonTitle}</span>
            </div>
            {hasLocalSave && <span className="text-[10px] text-[#97938c] bg-[#f0ede8] px-2 py-0.5 rounded font-medium">편집됨</span>}
          </>
        ) : (
          <>
            <span className="text-[11px] font-semibold tracking-[0.08em] text-[#1a1918] uppercase">편집 모드</span>
            <span className="text-[#e4e1da]">|</span>
            <span className="text-[12px] text-[#97938c] truncate">{lessonTitle}</span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!isEditMode ? (
            <>
              <span className="text-[11px] text-[#97938c] tabular-nums mr-1">{activeIdx + 1} / {total}</span>
              <div className="w-20 h-[3px] bg-[#eceae5] rounded-full overflow-hidden mr-2">
                <div className="h-full bg-[#1a1918] rounded-full transition-all duration-300"
                     style={{ width: `${((activeIdx + 1) / total) * 100}%` }} />
              </div>
              {/* ── 코랩 연결 상태 ── */}
              {kernel.status === 'connected' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#e8f4e9] border border-[#a8d4b0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2d8a4a]" />
                  <span className="text-[11px] text-[#2d7a3a] font-medium">코랩 연결됨</span>
                  <button
                    onClick={kernel.disconnect}
                    className="text-[10px] text-[#7ab890] hover:text-[#2d7a3a] ml-1 transition-colors"
                    title="연결 해제"
                  >×</button>
                </div>
              ) : kernel.status === 'connecting' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#f0ede8]">
                  <span className="inline-block w-3 h-3 border-2 border-[#97938c] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-[#97938c]">연결 중</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowColabConnect(true)}
                  className={`text-[11px] px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                    kernel.status === 'error'
                      ? 'bg-[#fdf5f3] border border-[#e8b4a8] text-[#b04030] hover:bg-[#faeae6]'
                      : 'bg-[#f0ede8] text-[#97938c] hover:bg-[#e4e1da] hover:text-[#1a1918]'
                  }`}
                >
                  <span className="text-[10px]">⚡</span>
                  {kernel.status === 'error' ? '재연결' : '코랩 연결'}
                </button>
              )}
              <button onClick={() => exportNotebook(localSections, lessonTitle)}
                className="text-[11px] px-3 py-1.5 rounded bg-[#f0ede8] text-[#97938c] hover:bg-[#e4e1da] hover:text-[#1a1918] transition-colors font-medium"
                title="노트북을 .ipynb로 다운로드">
                ↓ .ipynb
              </button>
              <button onClick={enterEditMode}
                className="text-[11px] px-3 py-1.5 rounded bg-[#f0ede8] text-[#97938c] hover:bg-[#e4e1da] hover:text-[#1a1918] transition-colors font-medium">
                편집
              </button>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded text-[#97938c] hover:text-[#1a1918] hover:bg-[#f0ede8] transition-colors text-[18px] leading-none ml-1"
                aria-label="닫기">×</button>
            </>
          ) : (
            <>
              {hasLocalSave && (
                <button onClick={handleReset} className="text-[11px] px-3 py-1.5 rounded text-[#97938c] hover:text-[#1a1918] transition-colors">
                  원본 초기화
                </button>
              )}
              <button onClick={() => exportNotebook(editDraft, lessonTitle)}
                className="text-[11px] px-3 py-1.5 rounded bg-[#f0ede8] text-[#97938c] hover:bg-[#e4e1da] hover:text-[#1a1918] transition-colors font-medium">
                ↓ .ipynb
              </button>
              <button onClick={handleCancelEdit}
                className="text-[11px] px-3 py-1.5 rounded bg-[#f0ede8] text-[#97938c] hover:bg-[#e4e1da] hover:text-[#1a1918] transition-colors font-medium">
                취소
              </button>
              <button onClick={handleSave}
                className="text-[11px] px-4 py-1.5 rounded border border-[#1a1918] text-[#1a1918] hover:bg-[#f0ede8] transition-colors font-medium">
                저장
              </button>
            </>
          )}
        </div>
      </header>

      {/* ══ 바디 ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 목차 사이드바 ── */}
        <aside ref={tocRef} className="w-52 flex-shrink-0 bg-white border-r border-[#e4e1da] overflow-y-auto hidden lg:block">
          <div className="px-4 py-6">
            <p className="text-[10px] tracking-[0.18em] text-[#97938c] uppercase mb-3 font-semibold">목차</p>
            <ul className="space-y-0.5">
              {tocEntries.map((entry, i) => {
                const isActive = isEditMode ? focusedSec === entry.sectionIdx : activeIdx === entry.sectionIdx;
                const pl = entry.level === 1 ? 'pl-3' : entry.level === 2 ? 'pl-5' : 'pl-7';
                return (
                  <li key={i}>
                    <button
                      ref={el => { tocItemRefs.current[i] = el; }}
                      onClick={() => isEditMode ? setFocusedSec(entry.sectionIdx) : scrollTo(entry.sectionIdx)}
                      className={`w-full text-left py-1.5 rounded transition-colors ${pl} pr-3 ${isActive ? 'bg-[#f0ede8]' : 'hover:bg-[#f7f6f3]'}`}>
                      <p className={`leading-snug break-words ${
                        entry.level === 1
                          ? `text-[12px] font-semibold ${isActive ? 'text-[#1a1918]' : 'text-[#1a1918]'}`
                          : entry.level === 2
                            ? `text-[11px] font-medium ${isActive ? 'text-[#3a3835]' : 'text-[#3a3835]'}`
                            : `text-[10px] font-medium ${isActive ? 'text-[#97938c]' : 'text-[#97938c]'}`
                      }`}>
                        {entry.level === 2 && <span className="text-[#c3bfb8] mr-1 select-none">–</span>}
                        {entry.level === 3 && <span className="text-[#e4e1da] mr-1 select-none">·</span>}
                        {entry.text}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            {isEditMode && (
              <button onClick={addSection}
                className="w-full mt-3 py-2 border border-dashed border-[#e4e1da] rounded text-[11px] text-[#97938c] hover:text-[#1a1918] hover:border-[#c3bfb8] transition-colors">
                + 섹션 추가
              </button>
            )}
          </div>
        </aside>

        {/* ══ 이론 패널 ══ */}
        {!isEditMode ? (
          <div ref={leftRef} className="flex-1 overflow-y-auto">
            <div className="max-w-[900px] mx-auto px-6 py-10 pb-40">
              {localSections.map((sec, i) => (
                <div key={sec.id} ref={el => { sectionRefs.current[i] = el; }} className="mb-4 relative">
                  <div className={`absolute -left-4 top-0 bottom-0 w-[2px] rounded-full transition-all duration-300 ${activeIdx === i ? 'bg-[#1a1918] opacity-100' : 'opacity-0'}`} />
                  <div className={`rounded px-10 py-9 overflow-hidden transition-colors duration-200 ${activeIdx === i ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]' : 'hover:bg-white/60'}`}>
                    <div className="flex items-center gap-2 mb-5">
                      <span className={`text-[10px] font-semibold tracking-[0.14em] uppercase tabular-nums ${activeIdx === i ? 'text-[#1a1918]' : 'text-[#97938c]'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {sec.codes.length > 0 && (
                        <span className="text-[10px] text-[#97938c] bg-[#f0ede8] px-2 py-0.5 rounded font-medium">
                          코드 {sec.codes.length}개
                        </span>
                      )}
                    </div>
                    <MdWithImages>{sec.markdown}</MdWithImages>
                    {sec.markdownImages && sec.markdownImages.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {sec.markdownImages.map((src, imgIdx) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={imgIdx} src={src} alt="마크다운 이미지" className="max-w-full rounded border border-[#e4e1da]" />
                        ))}
                      </div>
                    )}
                    {/* 나무위키식 용어 해설 패널 — 마지막 섹션에만 표시 */}
                    {i === localSections.length - 1 && (
                      <GlossaryFootnotePanel sections={localSections} />
                    )}
                  </div>
                  {i < localSections.length - 1 && <div className="mx-4 my-2 border-b border-[#eceae5]" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── 편집 모드 ── */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[680px] mx-auto px-10 py-10 pb-40 space-y-3">
              {editDraft.map((sec, i) => (
                <div key={sec.id}
                  className={`rounded border bg-white transition-all duration-150 ${
                    focusedSec === i
                      ? 'border-[#1a1918] shadow-[0_1px_8px_rgba(0,0,0,0.08)]'
                      : 'border-[#eceae5] hover:border-[#e4e1da]'
                  }`}>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-[#f5f4f0] cursor-pointer" onClick={() => setFocusedSec(i)}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold tracking-[0.14em] uppercase tabular-nums ${focusedSec === i ? 'text-[#1a1918]' : 'text-[#97938c]'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] text-[#97938c]">
                        {sec.codes.length > 0 ? `코드 ${sec.codes.length}개` : '이론 전용'}
                      </span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeSection(i); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-[#c3bfb8] hover:text-[#97938c] hover:bg-[#f5f4f0] transition-colors text-[14px]">×</button>
                  </div>
                  <div className="p-5">
                    <textarea value={sec.markdown}
                      onChange={e => updateMd(i, e.target.value)}
                      onFocus={() => setFocusedSec(i)}
                      placeholder="마크다운으로 이론 내용을 작성하세요"
                      className={`w-full bg-[#f9f8f6] border rounded p-4 text-[13.5px] text-[#1a1918] leading-[1.9] resize-none focus:outline-none transition-colors ${focusedSec === i ? 'border-[#c3bfb8]' : 'border-[#eceae5]'}`}
                      rows={Math.max(5, sec.markdown.split('\n').length + 2)} />
                  </div>
                </div>
              ))}
              <button onClick={addSection}
                className="w-full py-3 border border-dashed border-[#e4e1da] rounded text-[12px] text-[#97938c] hover:text-[#1a1918] hover:border-[#c3bfb8] transition-colors">
                + 섹션 추가
              </button>
            </div>
          </div>
        )}

        {/* ══ 코드 패널 ══════════════════════════════ */}
        {showCode ? (
        <div className="w-[40%] flex-shrink-0 bg-white flex flex-col overflow-hidden border-l border-[#e4e1da]">

          {/* 코드 패널 헤더 */}
          <div className="flex-shrink-0 px-5 py-3.5 border-b border-[#eceae5] flex items-center justify-between bg-[#f9f8f6]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCode(false)}
                className="text-[10px] font-medium text-[#97938c] hover:text-[#1a1918] px-2 py-1 rounded hover:bg-[#eceae5] transition-colors flex items-center gap-1"
                title="코드 패널 숨기기"
              >
                닫기 ›
              </button>
              <span className="text-[#e4e1da]">·</span>
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#97938c]">
                {rightSec?.language ?? 'Python'}
              </span>
              <span className="text-[#e4e1da]">·</span>
              <span className="text-[11px] text-[#97938c] tabular-nums">섹션 {String(rightIdx + 1).padStart(2, '0')}</span>
            </div>
            {!hasCodes && !isEditMode && (
              <span className="text-[10px] text-[#97938c] bg-[#f0ede8] px-2 py-0.5 rounded">이론 섹션</span>
            )}
            {hasCodes && (
              <span className="text-[10px] text-[#97938c] font-medium">{rightSec?.codes.length}개 블록</span>
            )}
          </div>

          {/* ── 뷰 모드: 코드 + 출력 ── */}
          {!isEditMode ? (
            <div key={codeKey} ref={codePanelRef} className="flex-1 overflow-y-auto animate-fadeIn">
              {hasCodes ? (
                <div className="p-5 space-y-4">
                  {rightSec.codes.map((block: CodeBlock, ci: number) => {
                    const cellKey  = `${rightIdx}-${ci}`;
                    const runState = runStates[cellKey];
                    const live     = liveOutputs[cellKey];
                    const isRunning = runState === 'running';

                    const isFocused = focusedCell === cellKey;
                    const isCopied  = copiedCells[cellKey];

                    return (
                    <div
                      key={ci}
                      ref={el => { codeCellRefs.current[cellKey] = el; }}
                      onClick={() => setFocusedCell(cellKey)}
                      className={`rounded border overflow-hidden cursor-default transition-all duration-150 ${
                        isFocused
                          ? 'border-[#3a3835] shadow-[0_0_0_2px_rgba(58,56,53,0.08)]'
                          : 'border-[#eceae5] hover:border-[#c3bfb8]'
                      }`}
                    >
                      {/* 포커스 왼쪽 악센트 */}
                      <div className={`relative`}>
                        {isFocused && (
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3a3835] z-10 rounded-l" />
                        )}
                      </div>

                      {/* 코드 헤더 */}
                      <div className={`px-4 py-2 border-b flex items-center justify-between transition-colors ${
                        isFocused ? 'bg-[#eceae5] border-[#c3bfb8]' : 'bg-[#f5f3ef] border-[#eceae5]'
                      }`}>
                        <span className="text-[10px] text-[#97938c] font-medium uppercase tracking-[0.1em]">
                          {rightSec.codes.length > 1 ? `In [${ci + 1}]` : rightSec.language}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* 복사 버튼 */}
                          <button
                            onClick={e => { e.stopPropagation(); handleCopy(cellKey, block.source); }}
                            className="text-[10px] font-medium px-2 py-0.5 rounded text-[#97938c] hover:text-[#1a1918] hover:bg-[#e4e1da] transition-colors"
                            title="코드 복사"
                          >
                            {isCopied ? '✓ 복사됨' : '복사'}
                          </button>
                          <span className="text-[#e4e1da]">|</span>
                          {/* 실행 버튼 */}
                          <button
                            onClick={e => { e.stopPropagation(); handleRun(rightIdx, ci, block.source); }}
                            disabled={isRunning}
                            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded transition-colors ${
                              isRunning
                                ? 'text-[#c3bfb8] cursor-not-allowed'
                                : kernel.status === 'connected'
                                  ? 'text-[#2d7a3a] hover:bg-[#e6f4e9] hover:text-[#1a5228]'
                                  : 'text-[#97938c] hover:bg-[#eceae5] hover:text-[#1a1918]'
                            }`}
                            title={kernel.status === 'connected' ? 'Shift+Enter로 실행' : 'Colab 연결 후 실행 가능'}
                          >
                            {isRunning ? (
                              <>
                                <span className="inline-block w-3 h-3 border-[1.5px] border-[#97938c] border-t-transparent rounded-full animate-spin" />
                                실행 중
                              </>
                            ) : (
                              <>▶ 실행{isFocused && <span className="text-[#c3bfb8] font-normal ml-1">⇧↵</span>}</>
                            )}
                          </button>
                        </div>
                      </div>
                      {/* 코드 */}
                      <div className={`p-5 transition-colors ${isFocused ? 'bg-[#ece9e3]' : 'bg-[#f5f3ef]'}`}>
                        <SyntaxHighlighter
                          language={rightSec.language}
                          style={warmLight}
                          customStyle={{ background: 'transparent', padding: 0, margin: 0 }}
                          wrapLongLines={false}>
                          {block.source}
                        </SyntaxHighlighter>
                      </div>
                      {/* 실행 결과: 라이브 우선, 없으면 노트북 정적 출력 */}
                      {live
                        ? <LiveOutputBlock result={live} />
                        : <OutputBlock outputs={block.outputs} idx={ci} />
                      }
                    </div>
                    );
                  })}
                </div>
              ) : (
                /* 코드 없는 섹션 */
                <div className="flex-1 flex flex-col p-6 gap-4">
                  <div className="rounded border border-[#eceae5] bg-[#f9f8f6] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded bg-white border border-[#eceae5] flex items-center justify-center text-[16px]">📖</div>
                      <div>
                        <p className="text-[12px] font-semibold text-[#1a1918]">이론 설명 섹션</p>
                        <p className="text-[11px] text-[#97938c]">코드 예제 없음</p>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-[#97938c] leading-relaxed">
                      이 섹션은 개념 설명으로 구성됩니다. 왼쪽 내용을 읽은 후 다음 섹션으로 넘어가세요.
                    </p>
                  </div>
                  {keyPoints.length > 0 && (
                    <div className="rounded border border-[#eceae5] bg-white p-5">
                      <p className="text-[10px] font-semibold text-[#97938c] uppercase tracking-[0.14em] mb-3">핵심 개념</p>
                      <ul className="space-y-2">
                        {keyPoints.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-[#d8d5cf] flex-shrink-0 mt-[3px] text-[8px]">▸</span>
                            <span className="text-[13px] text-[#3a3835] leading-snug">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {nextCodeIdx !== -1 && (
                    <button onClick={() => scrollTo(nextCodeIdx)}
                      className="w-full py-3 rounded border border-dashed border-[#e4e1da] text-[12px] text-[#97938c] hover:bg-[#f5f3ef] hover:border-[#c3bfb8] hover:text-[#1a1918] transition-colors flex items-center justify-center gap-2">
                      다음 코드 섹션으로 →
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── 편집 모드: 코드 textarea ── */
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <span className="text-[11px] font-semibold text-[#97938c] uppercase tracking-[0.1em]">
                섹션 {String(focusedSec + 1).padStart(2, '0')} 코드
              </span>
              {editDraft[focusedSec]?.codes.length === 0 && (
                <div className="rounded border border-dashed border-[#eceae5] p-6 text-center">
                  <p className="text-[12px] text-[#97938c]">코드 블록이 없습니다</p>
                </div>
              )}
              {editDraft[focusedSec]?.codes.map((block: CodeBlock, ci: number) => (
                <div key={ci} className="relative group rounded border border-[#eceae5] overflow-hidden">
                  {editDraft[focusedSec].codes.length > 1 && (
                    <div className="px-4 py-2 bg-[#f5f3ef] border-b border-[#eceae5] flex items-center justify-between">
                      <span className="text-[10px] text-[#97938c] font-medium uppercase tracking-[0.1em]">In [{ci + 1}]</span>
                      <button onClick={() => removeCodeBlock(focusedSec, ci)}
                        className="text-[11px] text-[#c3bfb8] hover:text-[#97938c] transition-colors">삭제</button>
                    </div>
                  )}
                  {editDraft[focusedSec].codes.length === 1 && (
                    <button onClick={() => removeCodeBlock(focusedSec, ci)}
                      className="absolute top-2.5 right-3 text-[11px] text-[#c3bfb8] hover:text-[#97938c] transition-colors opacity-0 group-hover:opacity-100 z-10">삭제</button>
                  )}
                  <textarea value={block.source}
                    onChange={e => updateCode(focusedSec, ci, e.target.value)}
                    placeholder="# Python 코드를 입력하세요"
                    spellCheck={false}
                    className="w-full bg-[#f5f3ef] p-5 font-mono text-[13px] text-[#2d2a27] leading-[1.8] resize-none focus:outline-none focus:bg-[#f0ede8] transition-colors"
                    rows={Math.max(5, block.source.split('\n').length + 2)} />
                </div>
              ))}
              <button onClick={() => addCodeBlock(focusedSec)}
                className="w-full py-2.5 border border-dashed border-[#e4e1da] rounded text-[12px] text-[#97938c] hover:text-[#1a1918] hover:border-[#c3bfb8] transition-colors">
                + 코드 블록 추가
              </button>
            </div>
          )}

          {/* 하단 네비게이션 (뷰 모드) */}
          {!isEditMode && (
            <div className="flex-shrink-0 border-t border-[#eceae5] px-5 py-3 flex items-center justify-between bg-[#f9f8f6]">
              <button onClick={() => scrollTo(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0}
                className="text-[11px] text-[#97938c] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium">
                ← 이전
              </button>
              <div className="flex gap-1">
                {localSections.map((_, i) => (
                  <button key={i} onClick={() => scrollTo(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${activeIdx === i ? 'bg-[#1a1918] w-4' : 'bg-[#c3bfb8] w-1.5 hover:bg-[#97938c]'}`} />
                ))}
              </div>
              <button onClick={() => scrollTo(Math.min(total - 1, activeIdx + 1))} disabled={activeIdx === total - 1}
                className="text-[11px] text-[#97938c] hover:text-[#1a1918] disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium">
                다음 →
              </button>
            </div>
          )}
        </div>
        ) : (
          /* 코드 패널 접힌 상태 — 클릭하면 다시 열림 */
          <div className="flex-shrink-0 w-9 bg-[#f9f8f6] border-l border-[#e4e1da] flex flex-col items-center justify-center">
            <button
              onClick={() => setShowCode(true)}
              className="flex flex-col items-center gap-1 text-[#97938c] hover:text-[#1a1918] hover:bg-[#eceae5] transition-colors rounded px-1 py-3 w-full"
              title="코드 패널 열기"
            >
              <span className="text-[13px] leading-none">‹</span>
              <span className="text-[9px] font-semibold tracking-[0.1em] uppercase leading-none mt-0.5">코드</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
