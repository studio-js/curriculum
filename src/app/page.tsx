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
  { label: '데이터 엔지니어링', desc: 'Python·SQL·웹 스크레핑으로 원천 데이터를 수집·정제하는 파이프라인을 설계합니다.' },
  { label: '통계 & 머신러닝', desc: '인과추론부터 심화통계, XGBoost·LightGBM 앙상블까지 예측 모델의 핵심을 익힙니다.' },
  { label: '시계열 & 딥러닝', desc: 'ARIMA부터 TFT까지 통계와 딥러닝을 아우르는 시계열 분석 전 스펙트럼을 다룹니다.' },
  { label: 'LLM & 자동화', desc: 'RAG·Function Calling으로 비정형 텍스트를 정형 데이터로 자동화하는 파이프라인을 구축합니다.' },
];

export default function HomePage() {
  const { course, subjects } = curriculumData;
  const completion = getCompletion(course.startDate, course.endDate);
  const totalSessions = subjects.reduce((s, sub) => s + sub.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0);

  const byCategory = subjects.reduce<Record<Category, typeof subjects>>(
    (acc, s) => { (acc[s.category] ??= []).push(s); return acc; },
    {} as Record<Category, typeof subjects>
  );

  return (
    <div className="max-w-5xl mx-auto px-8">

      {/* ── Hero ───────────────────────────────── */}
      <section className="pt-16 pb-14 border-b border-[#e8e8e8]">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-xl">
            <p className="text-[11px] tracking-[0.18em] text-[#999] uppercase mb-4">{course.jobGroup} · {course.jobRole}</p>
            <h1 className="text-[32px] font-medium text-[#111] leading-tight tracking-tight mb-5">{course.name}</h1>
            <p className="text-[15px] text-[#555] leading-[1.85]">{course.goal}</p>
            <Link
              href="/curriculum"
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 bg-[#111] text-white text-[13px] font-medium rounded-lg hover:bg-[#333] transition-colors"
            >
              커리큘럼 보기 →
            </Link>
          </div>

          {/* Completion card */}
          <div className="flex-shrink-0 w-56 border border-[#e8e8e8] rounded-2xl p-6">
            <p className="text-[11px] tracking-wider text-[#aaa] uppercase mb-3">훈련 완료율</p>
            <p className="text-[52px] font-medium tabular-nums leading-none text-[#111] mb-1">
              {completion}<span className="text-[22px] text-[#bbb]">%</span>
            </p>
            <div className="h-[3px] bg-[#efefef] rounded-full overflow-hidden mt-4 mb-4">
              <div className="h-full bg-[#111] rounded-full" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-[11px] text-[#bbb]">{course.startDate.slice(0, 7)} – {course.endDate.slice(0, 7)}</p>
            <div className="mt-4 pt-4 border-t border-[#f4f4f4] grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-[#bbb] mb-0.5">세션</p>
                <p className="text-[15px] font-medium tabular-nums">{totalSessions}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#bbb] mb-0.5">교과목</p>
                <p className="text-[15px] font-medium tabular-nums">{subjects.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you'll learn ─────────────────── */}
      <section className="py-14 border-b border-[#e8e8e8]">
        <h2 className="text-[13px] font-medium text-[#333] tracking-wide uppercase mb-7">학습 역량</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {highlights.map((h) => (
            <div key={h.label} className="group">
              <p className="text-[14px] font-medium text-[#111] mb-2">{h.label}</p>
              <p className="text-[13px] text-[#666] leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Curriculum overview ───────────────── */}
      <section className="py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-[13px] font-medium text-[#333] tracking-wide uppercase">커리큘럼 구성</h2>
          <Link href="/curriculum" className="text-[13px] text-[#888] hover:text-[#111] transition-colors">전체 보기 →</Link>
        </div>

        <div className="space-y-10">
          {(['정규교과', '프로젝트', '기타'] as Category[]).map((cat) => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <div className="flex items-baseline justify-between mb-3 pb-3 border-b border-[#f0f0f0]">
                  <p className="text-[12px] font-medium text-[#444]">{cat}</p>
                  <p className="text-[11px] text-[#bbb] tabular-nums">{items.reduce((s, x) => s + x.totalHours, 0)}h</p>
                </div>
                <div className="space-y-0">
                  {items.map((subject, i) => (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex items-baseline justify-between py-3 border-b border-[#f8f8f8] hover:bg-[#fafafa] -mx-3 px-3 rounded transition-colors"
                    >
                      <div className="flex items-baseline gap-4">
                        <span className="text-[11px] text-[#ddd] font-mono tabular-nums w-5">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-[14px] font-medium text-[#222] group-hover:text-[#000]">{subject.title}</span>
                      </div>
                      <span className="text-[12px] text-[#aaa] tabular-nums ml-4 flex-shrink-0">{subject.totalHours}h</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
