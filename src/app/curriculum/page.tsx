import Link from 'next/link';
import { curriculumData } from '@/data/curriculum';

type Sector = {
  num: string;
  label: string;
  desc: string;
  ids: string[];
};

const sectors: Sector[] = [
  {
    num: '01',
    label: '데이터 엔지니어링',
    desc: 'Python·SQL·웹 스크레핑으로 원천 데이터를 수집하고 정제하는 파이프라인을 설계합니다.',
    ids: ['python-data-analysis', 'data-wrangling', 'sql-analysis', 'data-visualization', 'project-viz'],
  },
  {
    num: '02',
    label: '통계 & 머신러닝',
    desc: '인과추론부터 XGBoost·LightGBM 앙상블까지 예측 모델의 핵심 이론과 실습을 다룹니다.',
    ids: ['statistics', 'machine-learning', 'advanced-stats', 'project-insight'],
  },
  {
    num: '03',
    label: '시계열 & 딥러닝',
    desc: 'ARIMA부터 TFT까지 통계와 딥러닝을 아우르는 시계열 분석 전 스펙트럼을 학습합니다.',
    ids: ['time-series', 'project-demand'],
  },
  {
    num: '04',
    label: 'LLM & 자동화',
    desc: 'RAG·Function Calling으로 비정형 텍스트를 정형 데이터로 자동 처리하는 시스템을 구축합니다.',
    ids: ['nlp', 'project-cx'],
  },
];

const operationsIds = ['project-aiffel', 'onboarding', 'career-seminar', 'offboarding'];

export default function CurriculumPage() {
  const { subjects } = curriculumData;

  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

  const totalHours = subjects.reduce((sum, s) => sum + s.totalHours, 0);
  const totalSessions = subjects.reduce(
    (sum, s) => sum + s.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0
  );

  const operationSubjects = operationsIds.map((id) => subjectMap[id]).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-8">

      {/* ── Header ── */}
      <section className="pt-14 pb-5">
        <p className="text-[10px] tracking-[0.28em] text-[#97938c] uppercase mb-6 font-medium">전체 과정</p>
        <div className="flex items-center justify-between">
          <h1 className="text-[36px] font-bold text-[#1a1918] tracking-tight">커리큘럼</h1>
          <p className="text-[12px] text-[#97938c] tabular-nums font-medium">
            {subjects.length}개 교과목 · {totalSessions}개 세션 · {totalHours}h
          </p>
        </div>
      </section>

      {/* ── Sectors ── */}
      <div className="pb-20 border-t border-[#e4e1da]">
        {sectors.map((sector) => {
          const items = sector.ids.map((id) => subjectMap[id]).filter(Boolean);
          const sectorHours = items.reduce((sum, s) => sum + s.totalHours, 0);

          return (
            <section key={sector.num}>
              {/* Sector header */}
              <div className="flex gap-6 pt-10 pb-7">
                <span className="text-[11px] font-medium text-[#97938c] tabular-nums flex-shrink-0 mt-0.5 tracking-[0.06em]">{sector.num}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1a1918] mb-2 tracking-tight">{sector.label}</p>
                  <p className="text-[13px] text-[#58554f] leading-[1.85]">{sector.desc}</p>
                </div>
                <span className="text-[22px] font-bold text-[#1a1918] tabular-nums flex-shrink-0 leading-none mt-0.5">
                  {sectorHours}<span className="text-[13px] text-[#97938c] ml-0.5 font-medium">h</span>
                </span>
              </div>

              {/* Subject list */}
              <div className="border border-[#e4e1da] mb-12">
                {items.map((subject, i) => {
                  const sessions = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex items-center gap-4 px-6 py-3.5 border-b border-[#f0ede8] last:border-0 hover:bg-[#faf9f7] transition-colors"
                    >
                      <span className="text-[11px] text-[#c3bfb8] tabular-nums flex-shrink-0 font-medium w-5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[13px] font-medium text-[#1a1918] flex-shrink-0 tracking-tight">{subject.title}</span>
                      {subject.category === '프로젝트' && (
                        <span className="text-[10px] text-[#97938c] border border-[#e4e1da] px-1.5 py-0.5 flex-shrink-0 tracking-[0.08em] font-medium">
                          프로젝트
                        </span>
                      )}
                      <span className="flex-1 border-b border-dashed border-[#ece9e3] mb-[2px]" />
                      <span className="text-[11px] text-[#97938c] tabular-nums flex-shrink-0">{sessions}세션</span>
                      <span className="text-[12px] font-semibold text-[#3a3835] tabular-nums flex-shrink-0">{subject.totalHours}h</span>
                      <span className="text-[11px] text-[#c3bfb8] group-hover:text-[#97938c] transition-colors flex-shrink-0">→</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── 과정 운영 ── */}
        {operationSubjects.length > 0 && (
          <section>
            <div className="flex gap-6 pt-10 pb-7">
              <span className="text-[11px] font-medium text-[#97938c] tabular-nums flex-shrink-0 mt-0.5 tracking-[0.06em]">—</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#1a1918] mb-2 tracking-tight">과정 운영</p>
                <p className="text-[13px] text-[#58554f] leading-[1.85]">과정 시작·마무리 및 커리어 지원 프로그램</p>
              </div>
            </div>
            <div className="border border-[#e4e1da] mb-12">
              {operationSubjects.map((subject, i) => {
                const sessions = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                return (
                  <Link
                    key={subject.id}
                    href={`/curriculum/${subject.id}`}
                    className="group flex items-center gap-4 px-6 py-3.5 border-b border-[#f0ede8] last:border-0 hover:bg-[#faf9f7] transition-colors"
                  >
                    <span className="text-[11px] text-[#c3bfb8] tabular-nums flex-shrink-0 font-medium w-5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[13px] font-medium text-[#1a1918] flex-shrink-0 tracking-tight">{subject.title}</span>
                    {subject.category === '프로젝트' && (
                      <span className="text-[10px] text-[#97938c] border border-[#e4e1da] px-1.5 py-0.5 flex-shrink-0 tracking-[0.08em] font-medium">
                        프로젝트
                      </span>
                    )}
                    <span className="flex-1 border-b border-dashed border-[#ece9e3] mb-[2px]" />
                    {sessions > 0 && (
                      <span className="text-[11px] text-[#97938c] tabular-nums flex-shrink-0">{sessions}세션</span>
                    )}
                    <span className="text-[12px] font-semibold text-[#3a3835] tabular-nums flex-shrink-0">{subject.totalHours}h</span>
                    <span className="text-[11px] text-[#c3bfb8] group-hover:text-[#97938c] transition-colors flex-shrink-0">→</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

    </div>
  );
}
