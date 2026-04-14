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
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-10 flex flex-col md:flex-row gap-10 items-start">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] tracking-[0.22em] text-[#97938c] uppercase mb-5 font-medium">
              {course.jobGroup} · {course.jobRole}
            </p>
            <h1 className="text-[36px] font-bold text-[#1a1918] leading-[1.2] tracking-tight mb-5">
              {course.name}
            </h1>
            <p className="text-[15px] text-[#58554f] leading-[1.9] font-light">{course.goal}</p>
            <Link
              href="/curriculum"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-[#1a1918] text-white text-[13px] font-semibold tracking-[0.04em] rounded-xl hover:bg-[#2e2c29] transition-colors"
            >
              커리큘럼 보기 →
            </Link>
          </div>

          {/* Completion */}
          <div className="w-full md:w-52 flex-shrink-0 bg-[#f7f6f3] rounded-xl p-6">
            <p className="text-[10px] tracking-[0.2em] text-[#97938c] uppercase mb-3 font-medium">훈련 완료율</p>
            <div className="flex items-end gap-1 mb-4">
              <span className="text-[54px] font-bold tabular-nums leading-none text-[#1a1918]">{completion}</span>
              <span className="text-[20px] text-[#c3bfb8] mb-1 font-light">%</span>
            </div>
            <div className="h-[2px] bg-[#e4e1da] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#1a1918] rounded-full transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-[11px] text-[#c3bfb8]">{course.startDate.slice(0, 7)} – {course.endDate.slice(0, 7)}</p>
            <div className="mt-4 pt-4 border-t border-[#e4e1da] grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-[#c3bfb8] mb-1 tracking-wide">세션</p>
                <p className="text-[20px] font-bold tabular-nums text-[#1a1918]">{totalSessions}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#c3bfb8] mb-1 tracking-wide">교과목</p>
                <p className="text-[20px] font-bold tabular-nums text-[#1a1918]">{subjects.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 학습 역량 ─────────────────────────── */}
      <section className="pb-16">
        <h2 className="text-[10px] font-semibold tracking-[0.22em] text-[#97938c] uppercase mb-6">학습 역량</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {highlights.map((h) => (
            <div key={h.num} className="bg-white rounded-xl border border-[#e4e1da] p-6 flex gap-5">
              <span className="text-[12px] font-semibold text-[#c3bfb8] tabular-nums flex-shrink-0 mt-0.5">{h.num}</span>
              <div>
                <p className="text-[15px] font-semibold text-[#1a1918] mb-2">{h.label}</p>
                <p className="text-[13px] text-[#7a776f] leading-[1.8] font-light">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 커리큘럼 구성 ────────────────────── */}
      <section className="pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[10px] font-semibold tracking-[0.22em] text-[#97938c] uppercase">커리큘럼 구성</h2>
          <Link href="/curriculum" className="text-[13px] text-[#97938c] hover:text-[#1a1918] transition-colors">
            전체 보기 →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#e4e1da] overflow-hidden">
          {(['정규교과', '프로젝트', '기타'] as Category[]).map((cat, catIdx) => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            return (
              <div key={cat} className={catIdx > 0 ? 'border-t border-[#eceae5]' : ''}>
                <div className="flex items-center justify-between px-6 py-3 bg-[#f7f6f3] border-b border-[#eceae5]">
                  <p className="text-[11px] font-semibold text-[#58554f] tracking-[0.08em] uppercase">{cat}</p>
                  <p className="text-[11px] text-[#c3bfb8] tabular-nums">{items.reduce((s, x) => s + x.totalHours, 0)}h</p>
                </div>
                {items.map((subject, i) => {
                  const sessions = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex items-center gap-4 px-6 py-3 border-b border-[#f5f4f0] last:border-0 hover:bg-[#f7f6f3] transition-colors"
                    >
                      <span className="text-[11px] text-[#c3bfb8] tabular-nums flex-shrink-0 font-medium">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[14px] font-medium text-[#1a1918] group-hover:text-[#000] flex-shrink-0">{subject.title}</span>
                      <span className="flex-1 border-b border-dashed border-[#e4e1da] mb-[2px]" />
                      <span className="text-[12px] text-[#c3bfb8] tabular-nums flex-shrink-0">{sessions}개 세션</span>
                      <span className="text-[13px] font-semibold text-[#58554f] tabular-nums flex-shrink-0">{subject.totalHours}h</span>
                      <span className="text-[12px] text-[#c3bfb8] group-hover:text-[#7a776f] transition-colors flex-shrink-0">→</span>
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
