import Link from 'next/link';
import { curriculumData } from '@/data/curriculum';

const sectors = [
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

  const totalHours    = subjects.reduce((sum, s) => sum + s.totalHours, 0);
  const totalSessions = subjects.reduce(
    (sum, s) => sum + s.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0,
  );

  const operationSubjects = operationsIds.map((id) => subjectMap[id]).filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-8">

      {/* ── Header ── */}
      <section className="pt-20 pb-10">
        <p className="text-[10px] tracking-[0.3em] text-[#97938c] uppercase mb-10 font-medium">전체 과정</p>
        <div className="flex items-end justify-between gap-6">
          <h1 className="text-[28px] font-bold text-[#1a1918] tracking-tight leading-none">커리큘럼</h1>
          <p className="text-[12px] text-[#97938c] tabular-nums font-medium pb-1">
            {subjects.length}개 교과목 · {totalSessions}개 세션 · {totalHours}h
          </p>
        </div>
      </section>

      {/* ── Sectors ── */}
      <div className="pb-24">
        {[...sectors, { num: '—', label: '과정 운영', desc: '과정 시작·마무리 및 커리어 지원 프로그램', ids: operationsIds }].map((sector) => {
          const items       = sector.ids.map((id) => subjectMap[id]).filter(Boolean);
          const sectorHours = items.reduce((sum, s) => sum + s.totalHours, 0);

          return (
            <section key={sector.num} className="border-t border-[#e4e1da] pt-10 pb-12">

              {/* Sector header — same language as 메인 track items */}
              <div className="flex gap-6 items-start mb-6">
                <span className="text-[11px] font-medium text-[#c3bfb8] tabular-nums flex-shrink-0 mt-0.5 tracking-[0.08em] w-7">
                  {sector.num}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] font-semibold text-[#1a1918] mb-2 tracking-tight">{sector.label}</p>
                  <p className="text-[13px] text-[#58554f] leading-[1.8]">{sector.desc}</p>
                </div>
                {sectorHours > 0 && (
                  <p className="text-[20px] font-bold tabular-nums text-[#1a1918] flex-shrink-0 leading-none mt-0.5">
                    {sectorHours}<span className="text-[11px] text-[#97938c] ml-0.5 font-medium">h</span>
                  </p>
                )}
              </div>

              {/* Subject rows — 선 없이 여백으로 구분 */}
              <div className="ml-[52px]">
                {items.map((subject, i) => {
                  const sessions  = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                  const isProject = subject.category === '프로젝트';
                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex items-center gap-4 py-3 -mx-3 px-3 rounded transition-colors hover:bg-[#f7f6f3]"
                    >
                      <span className="text-[11px] text-[#c3bfb8] tabular-nums flex-shrink-0 font-medium w-5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[13.5px] font-medium text-[#1a1918] flex-shrink-0 tracking-tight">
                        {subject.title}
                      </span>
                      {isProject && (
                        <span className="text-[10px] text-[#97938c] border border-[#e4e1da] px-1.5 py-0.5 flex-shrink-0 tracking-[0.06em] font-medium rounded">
                          프로젝트
                        </span>
                      )}
                      <span className="flex-1" />
                      <span className="text-[12px] text-[#97938c] tabular-nums flex-shrink-0">{sessions}세션</span>
                      <span className="text-[12px] text-[#97938c] tabular-nums flex-shrink-0 w-10 text-right">
                        {subject.totalHours}h
                      </span>
                      <span className="text-[11px] text-[#c3bfb8] group-hover:text-[#97938c] transition-colors flex-shrink-0">→</span>
                    </Link>
                  );
                })}
              </div>

            </section>
          );
        })}
      </div>

    </div>
  );
}
