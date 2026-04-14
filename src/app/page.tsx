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
      <section className="py-16">
        <div className="bg-white rounded-2xl border border-[#e5e5e5] p-10 flex flex-col md:flex-row gap-10 items-start">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] tracking-[0.2em] text-[#888] uppercase mb-4">
              {course.jobGroup} · {course.jobRole}
            </p>
            <h1 className="text-[34px] font-bold text-[#1a1a1a] leading-[1.25] tracking-tight mb-5">
              {course.name}
            </h1>
            <p className="text-[16px] text-[#555] leading-[1.85]">{course.goal}</p>
            <Link
              href="/curriculum"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-[#1a1a1a] text-white text-[14px] font-semibold rounded-xl hover:bg-[#333] transition-colors"
            >
              커리큘럼 보기 →
            </Link>
          </div>

          {/* Completion */}
          <div className="w-full md:w-52 flex-shrink-0 bg-[#f5f5f5] rounded-xl p-6">
            <p className="text-[11px] tracking-[0.15em] text-[#888] uppercase mb-3">훈련 완료율</p>
            <div className="flex items-end gap-1 mb-4">
              <span className="text-[56px] font-bold tabular-nums leading-none text-[#1a1a1a]">{completion}</span>
              <span className="text-[22px] text-[#bbb] mb-1">%</span>
            </div>
            <div className="h-[3px] bg-[#e5e5e5] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#1a1a1a] rounded-full" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-[12px] text-[#aaa]">{course.startDate.slice(0, 7)} – {course.endDate.slice(0, 7)}</p>
            <div className="mt-4 pt-4 border-t border-[#e5e5e5] grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-[#aaa] mb-1">세션</p>
                <p className="text-[18px] font-bold tabular-nums text-[#1a1a1a]">{totalSessions}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#aaa] mb-1">교과목</p>
                <p className="text-[18px] font-bold tabular-nums text-[#1a1a1a]">{subjects.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 학습 역량 ─────────────────────────── */}
      <section className="pb-16">
        <h2 className="text-[12px] font-semibold tracking-[0.18em] text-[#888] uppercase mb-6">학습 역량</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {highlights.map((h) => (
            <div key={h.num} className="bg-white rounded-xl border border-[#e5e5e5] p-6 flex gap-5">
              <span className="text-[13px] font-semibold text-[#ccc] tabular-nums flex-shrink-0 mt-0.5">{h.num}</span>
              <div>
                <p className="text-[16px] font-semibold text-[#1a1a1a] mb-2">{h.label}</p>
                <p className="text-[14px] text-[#666] leading-[1.75]">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 커리큘럼 구성 ────────────────────── */}
      <section className="pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[12px] font-semibold tracking-[0.18em] text-[#888] uppercase">커리큘럼 구성</h2>
          <Link href="/curriculum" className="text-[14px] text-[#888] hover:text-[#1a1a1a] transition-colors">
            전체 보기 →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
          {(['정규교과', '프로젝트', '기타'] as Category[]).map((cat, catIdx) => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            return (
              <div key={cat} className={catIdx > 0 ? 'border-t border-[#f0f0f0]' : ''}>
                <div className="flex items-center justify-between px-6 py-3 bg-[#fafafa] border-b border-[#f0f0f0]">
                  <p className="text-[12px] font-semibold text-[#555] tracking-wide">{cat}</p>
                  <p className="text-[12px] text-[#bbb] tabular-nums">{items.reduce((s, x) => s + x.totalHours, 0)}h</p>
                </div>
                {items.map((subject, i) => (
                  <Link
                    key={subject.id}
                    href={`/curriculum/${subject.id}`}
                    className="group flex items-center px-6 py-2.5 border-b border-[#f8f8f8] last:border-0 hover:bg-[#fafafa] transition-colors"
                  >
                    <span className="text-[12px] text-[#999] font-mono tabular-nums w-7 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[15px] font-medium text-[#1a1a1a] group-hover:text-[#000] flex-1">{subject.title}</span>
                    <span className="text-[13px] font-medium text-[#666] tabular-nums flex-shrink-0 ml-4">{subject.totalHours}h</span>
                    <span className="text-[13px] text-[#bbb] group-hover:text-[#777] transition-colors ml-3 flex-shrink-0">→</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
