import Link from 'next/link';
import { curriculumData } from '@/data/curriculum';

function getCompletion(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

const tracks = [
  { num: '01', label: '데이터 엔지니어링', desc: 'Python·SQL·웹 스크레핑으로 원천 데이터를 수집하고 정제하는 파이프라인을 설계합니다.' },
  { num: '02', label: '통계 & 머신러닝',   desc: '인과추론부터 XGBoost·LightGBM 앙상블까지 예측 모델의 핵심 이론과 실습을 다룹니다.' },
  { num: '03', label: '시계열 & 딥러닝',   desc: 'ARIMA부터 TFT까지 통계와 딥러닝을 아우르는 시계열 분석 전 스펙트럼을 학습합니다.' },
  { num: '04', label: 'LLM & 자동화',      desc: 'RAG·Function Calling으로 비정형 텍스트를 정형 데이터로 자동 처리하는 시스템을 구축합니다.' },
];

export default function HomePage() {
  const { course, subjects } = curriculumData;
  const completion    = getCompletion(course.startDate, course.endDate);
  const totalSessions = subjects.reduce(
    (s, sub) => s + sub.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0,
  );
  const totalHours = subjects.reduce((s, sub) => s + sub.totalHours, 0);

  const tooltipText = `${totalSessions}세션 · ${subjects.length}개 교과목 · ${totalHours}h · ${completion}% 완료 · ${course.startDate.slice(0, 7)} – ${course.endDate.slice(0, 7)}`;

  return (
    <div className="max-w-4xl mx-auto px-8">

      {/* ── Hero ── */}
      <section className="pt-20 pb-10">
        <p className="text-[13px] tracking-[0.2em] text-[#97938c] uppercase mb-10 font-medium">
          {course.jobGroup} · {course.jobRole}
        </p>

        <h1 className="text-[46px] font-bold text-[#1a1918] leading-[1.1] tracking-tight mb-6">
          {course.name}
        </h1>

        <p className="text-[15px] text-[#58554f] leading-[1.9] max-w-[600px] mb-9">
          {course.goal}
        </p>

        <Link
          href="/curriculum"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1918] text-white text-[13px] font-medium tracking-[0.04em] rounded hover:bg-[#2f2c28] transition-colors"
        >
          커리큘럼 보기 →
        </Link>
      </section>

      {/* ── 진행 바 (= 섹션 구분선 + 호버 툴팁) ── */}
      <div className="group relative py-4 cursor-default">
        {/* 툴팁 */}
        <div className="absolute left-0 -top-1 translate-y-[-100%] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <span className="text-[11px] text-[#97938c] tabular-nums">{tooltipText}</span>
        </div>

        {/* 바 */}
        <div className="h-[1.5px] bg-[#e4e1da] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1a1918] rounded-full"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* ── 학습 트랙 ── */}
      <section className="pt-8 pb-20">
        <p className="text-[10px] tracking-[0.3em] text-[#97938c] uppercase mb-8 font-medium">학습 트랙</p>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {tracks.map((t, idx) => (
            <div
              key={t.num}
              className={[
                'flex gap-5 p-8',
                idx < 2 ? 'border-b border-[#e4e1da]' : '',
                idx % 2 === 0 ? 'sm:border-r border-[#e4e1da]' : '',
              ].join(' ')}
            >
              <span className="text-[11px] font-medium text-[#c3bfb8] tabular-nums flex-shrink-0 mt-0.5 tracking-[0.08em]">
                {t.num}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-[#1a1918] mb-2.5 tracking-tight">{t.label}</p>
                <p className="text-[13px] text-[#58554f] leading-[1.85]">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
