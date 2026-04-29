'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { curriculumData } from '@/data/curriculum';

const TRACKS = [
  {
    num: '01',
    title: '데이터 엔지니어링',
    desc: 'Python·SQL·웹 스크레이핑으로 원천 데이터를 수집하고 정제하는 파이프라인을 설계합니다.',
  },
  {
    num: '02',
    title: '통계 & 머신러닝',
    desc: '인과추론부터 XGBoost·LightGBM 앙상블까지 예측 모델의 핵심 이론과 실습을 다룹니다.',
  },
  {
    num: '03',
    title: '시계열 & 딥러닝',
    desc: 'ARIMA부터 TFT까지 통계와 딥러닝을 아우르는 시계열 분석 전 스펙트럼을 학습합니다.',
  },
  {
    num: '04',
    title: 'LLM & 자동화',
    desc: 'RAG·Function Calling으로 비정형 텍스트를 정형 데이터로 자동 처리하는 시스템을 구축합니다.',
  },
];

function toYM(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export default function OverviewPage() {
  const { user, isAdmin } = useAuthContext();
  const { course, subjects } = curriculumData;

  const ctaHref  = user ? '/curriculum' : '/login';
  const ctaLabel = user
    ? (isAdmin ? '커리큘럼 보기 →' : '커리큘럼 입장 →')
    : '로그인하여 수강하기 →';

  /* 통계 계산 */
  const stats = useMemo(() => {
    const totalSubjects = subjects.length;

    const start    = new Date(course.startDate);
    const end      = new Date(course.endDate);
    const now      = new Date();
    const elapsed  = Math.max(0, now.getTime() - start.getTime());
    const total    = end.getTime() - start.getTime();
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

    const elapsedDays   = Math.max(0, Math.round(elapsed  / 86400000));
    const remainingDays = Math.max(0, Math.round((end.getTime() - Math.max(now.getTime(), start.getTime())) / 86400000));

    return { totalSubjects, progress, elapsedDays, remainingDays };
  }, [course, subjects]);

  return (
    <div className="max-w-4xl mx-auto px-8">

      {/* ── 히어로 ── */}
      <section className="pt-24 pb-10">
        <p className="text-[13px] tracking-[0.2em] text-[#97938c] uppercase mb-5 font-medium">
          {course.jobGroup} · {course.jobRole}
        </p>
        <h1 className="text-[44px] font-bold text-[#1a1918] leading-[1.1] tracking-tight mb-6 max-w-[680px]">
          {course.name}
        </h1>
        <p className="text-[14px] text-[#58554f] leading-[1.9] max-w-[560px] mb-10">
          {course.goal}
        </p>
        <Link
          href={ctaHref}
          className="inline-flex items-center px-7 py-3.5 bg-[#1a1918] text-white text-[13px] font-medium tracking-[0.04em] rounded hover:bg-[#2d2b29] transition-colors"
        >
          {ctaLabel}
        </Link>
      </section>

      {/* ── 진행률 바 ── */}
      <div className="pb-12">
        {/* 스탯 텍스트 */}
        <p className="text-[14px] text-[#97938c] mb-3 tabular-nums">
          {stats.totalSubjects}개 교과목 · {stats.progress}% 완료 · {toYM(course.startDate)} – {toYM(course.endDate)}
        </p>

        {/* 진행 바 (hover 시 툴팁) */}
        <div className="relative group py-3 -my-3 cursor-default">
          <div className="flex h-[2px] w-full overflow-hidden">
            <div
              className="bg-[#1a1918] h-full flex-shrink-0 transition-all"
              style={{ width: `${stats.progress}%` }}
            />
            <div className="flex-1 bg-[#e4e1da] h-full" />
          </div>

          {/* 호버 툴팁 */}
          <div className="absolute left-0 bottom-4 hidden group-hover:flex items-center gap-4 bg-[#1a1918] text-white text-[11px] px-4 py-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
            <span className="font-semibold">{stats.progress}% 진행</span>
            <span className="text-white/40">·</span>
            <span>{stats.elapsedDays}일 경과</span>
            <span className="text-white/40">·</span>
            <span>{stats.remainingDays}일 남음</span>
          </div>
        </div>
      </div>

      {/* ── 학습 트랙 ── */}
      <section className="pb-20">
        <p className="text-[14px] tracking-[0.05em] text-[#97938c] mb-3 font-medium">학습 트랙</p>

        <div className="grid grid-cols-2">
          {TRACKS.map((track, i) => (
            <div
              key={track.num}
              className={`px-8 pt-5 pb-10 ${
                i === 0 ? 'border-b border-r border-[#e4e1da]' :
                i === 1 ? 'border-b border-[#e4e1da]' :
                i === 2 ? 'border-r border-[#e4e1da]' : ''
              }`}
            >
              <p className="text-[12px] font-medium text-[#c3bfb8] tabular-nums mb-4">{track.num}</p>
              <h3 className="text-[20px] font-bold text-[#1a1918] tracking-tight mb-3">{track.title}</h3>
              <p className="text-[13px] text-[#58554f] leading-[1.8]">{track.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
