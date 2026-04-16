import Link from 'next/link';
import { curriculumData } from '@/data/curriculum';
import { Category } from '@/types/curriculum';

function getCompletion(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

const highlights = [
  { num: '01', label: '데이터 엔지니어링', desc: 'Python·SQL·웹 스크레핑으로 원천 데이터를 수집하고 정제하는 파이프라인을 설계합니다.' },
  { num: '02', label: '통계 & 머신러닝', desc: '인과추론부터 XGBoost·LightGBM 앙상블까지 예측 모델의 핵심 이론과 실습을 다룹니다.' },
  { num: '03', label: '시계열 & 딥러닝', desc: 'ARIMA부터 TFT까지 통계와 딥러닝을 아우르는 시계열 분석 전 스펙트럼을 학습합니다.' },
  { num: '04', label: 'LLM & 자동화', desc: 'RAG·Function Calling으로 비정형 텍스트를 정형 데이터로 자동 처리하는 시스템을 구축합니다.' },
];

export default function HomePage() {
  const { course, subjects } = curriculumData;
  const completion = getCompletion(course.startDate, course.endDate);
  const totalSessions = subjects.reduce(
    (s, sub) => s + sub.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0
  );

  const byCategory = subjects.reduce<Record<Category, typeof subjects>>(
    (acc, s) => { (acc[s.category] ??= []).push(s); return acc; },
    {} as Record<Category, typeof subjects>
  );

  return (
    <div className="max-w-5xl mx-auto px-8">

      {/* ── Hero ───────────────────────────────── */}
      <section className="pt-14 pb-20">
        <div>
          {/* 상단 메타 */}
          <p className="text-[10px] tracking-[0.28em] text-[#97938c] uppercase mb-8 font-medium">
            {course.jobGroup} · {course.jobRole}
          </p>

          <div className="flex flex-col md:flex-row md:items-end gap-10 mb-12">
            {/* 제목 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[42px] font-bold text-[#1a1918] leading-[1.15] tracking-tight mb-0">
                {course.name}
              </h1>
            </div>
            {/* 기간 + CTA */}
            <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-4">
              <p className="text-[12px] text-[#97938c] tabular-nums font-medium">
                {course.startDate.slice(0, 7)} – {course.endDate.slice(0, 7)}
              </p>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#1a1918] text-[#1a1918] text-[12px] font-medium tracking-[0.06em] rounded hover:bg-[#1a1918] hover:text-white transition-colors"
              >
                커리큘럼 보기 →
              </Link>
            </div>
          </div>

          {/* 설명 + 통계 */}
          <div className="flex flex-col md:flex-row gap-10">
            <p className="flex-1 text-[15px] text-[#3a3835] leading-[1.95]">{course.goal}</p>
            <div className="flex-shrink-0 flex gap-10 md:gap-12">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#97938c] uppercase mb-2 font-medium">세션</p>
                <p className="text-[32px] font-bold tabular-nums text-[#1a1918] leading-none">{totalSessions}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#97938c] uppercase mb-2 font-medium">교과목</p>
                <p className="text-[32px] font-bold tabular-nums text-[#1a1918] leading-none">{subjects.length}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#97938c] uppercase mb-2 font-medium">완료율</p>
                <p className="text-[32px] font-bold tabular-nums text-[#1a1918] leading-none">{completion}<span className="text-[16px] text-[#97938c] ml-0.5">%</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 학습 역량 ─────────────────────────── */}
      <section className="border-t border-[#e4e1da] pt-12 pb-16">
        <h2 className="text-[10px] font-medium tracking-[0.28em] text-[#97938c] uppercase mb-8">학습 역량</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {highlights.map((h, idx) => (
            <div key={h.num} className={`p-7 flex gap-5 ${idx < 2 ? 'border-b border-[#e4e1da]' : ''} ${idx % 2 === 0 ? 'sm:border-r border-[#e4e1da]' : ''}`}>
              <span className="text-[11px] font-medium text-[#97938c] tabular-nums flex-shrink-0 mt-0.5 tracking-[0.06em]">{h.num}</span>
              <div>
                <p className="text-[15px] font-semibold text-[#1a1918] mb-2.5 tracking-tight">{h.label}</p>
                <p className="text-[13px] text-[#58554f] leading-[1.85]">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 커리큘럼 구성 ────────────────────── */}
      <section className="pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-medium tracking-[0.28em] text-[#97938c] uppercase">커리큘럼 구성</h2>
          <Link href="/curriculum" className="text-[12px] text-[#97938c] hover:text-[#1a1918] transition-colors tracking-[0.04em]">
            전체 보기 →
          </Link>
        </div>

        <div className="border border-[#e4e1da]">
          {(['정규교과', '프로젝트', '기타'] as Category[]).map((cat, catIdx) => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            return (
              <div key={cat} className={catIdx > 0 ? 'border-t border-[#e4e1da]' : ''}>
                <div className="flex items-center justify-between px-6 py-3 bg-[#f7f6f3] border-b border-[#e4e1da]">
                  <p className="text-[10px] font-medium text-[#97938c] tracking-[0.16em] uppercase">{cat}</p>
                  <p className="text-[11px] text-[#97938c] tabular-nums font-medium">{items.reduce((s, x) => s + x.totalHours, 0)}h</p>
                </div>
                {items.map((subject, i) => {
                  const sessions = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex items-center gap-4 px-6 py-3.5 border-b border-[#f0ede8] last:border-0 hover:bg-[#faf9f7] transition-colors"
                    >
                      <span className="text-[11px] text-[#c3bfb8] tabular-nums flex-shrink-0 font-medium w-5">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[13px] font-medium text-[#1a1918] flex-shrink-0 tracking-tight">{subject.title}</span>
                      <span className="flex-1 border-b border-dashed border-[#ece9e3] mb-[2px]" />
                      <span className="text-[11px] text-[#97938c] tabular-nums flex-shrink-0">{sessions}세션</span>
                      <span className="text-[12px] font-semibold text-[#3a3835] tabular-nums flex-shrink-0">{subject.totalHours}h</span>
                      <span className="text-[11px] text-[#c3bfb8] group-hover:text-[#97938c] transition-colors flex-shrink-0">→</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
