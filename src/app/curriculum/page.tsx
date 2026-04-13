import Link from 'next/link';
import { curriculumData } from '@/data/curriculum';
import { Category } from '@/types/curriculum';

const categoryMeta: Record<Category, { label: string; description: string }> = {
  정규교과: {
    label: '정규교과',
    description: '데이터 과학자에게 필요한 핵심 기술을 체계적으로 습득하는 이론·실습 과목',
  },
  프로젝트: {
    label: '프로젝트',
    description: '실제 비즈니스 데이터로 수행하는 실전 과제 및 해커톤',
  },
  기타: {
    label: '기타',
    description: '과정 시작·마무리 및 커리어 지원 프로그램',
  },
};

export default function CurriculumPage() {
  const { subjects } = curriculumData;
  const categories: Category[] = ['정규교과', '프로젝트', '기타'];

  const byCategory = subjects.reduce<Record<Category, typeof subjects>>(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<Category, typeof subjects>
  );

  const totalHours = subjects.reduce((sum, s) => sum + s.totalHours, 0);
  const totalSessions = subjects.reduce(
    (sum, s) => sum + s.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0
  );

  return (
    <div className="max-w-5xl mx-auto px-8">

      {/* Header */}
      <section className="pt-14 pb-10 border-b border-[#e8e8e8]">
        <h1 className="text-[26px] font-medium text-[#111] tracking-tight mb-2">커리큘럼</h1>
        <p className="text-[14px] text-[#666]">
          {subjects.length}개 교과목 · {totalSessions}개 세션 · 총 {totalHours}h
        </p>
      </section>

      {/* Categories */}
      <section className="py-12 space-y-16">
        {categories.map((cat) => {
          const items = byCategory[cat];
          if (!items || items.length === 0) return null;
          const meta = categoryMeta[cat];
          const catHours = items.reduce((sum, s) => sum + s.totalHours, 0);

          return (
            <div key={cat}>
              {/* Category header */}
              <div className="mb-7">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h2 className="text-[16px] font-medium text-[#111]">{meta.label}</h2>
                  <span className="text-[12px] text-[#999] tabular-nums">{catHours}h</span>
                </div>
                <p className="text-[13px] text-[#777]">{meta.description}</p>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((subject) => {
                  const subjectSessions = subject.nodes.reduce((sum, n) => sum + n.lessons.length, 0);
                  const preview = subject.nodes[0].description;

                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex flex-col border border-[#e8e8e8] rounded-xl p-5 hover:border-[#222] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-150 bg-white"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-[11px] text-[#888] tracking-wider uppercase">
                          {subject.nodes.length > 1
                            ? `${subject.nodes.length}개 노드`
                            : '단일 노드'}
                        </span>
                        <span className="text-[12px] font-medium text-[#333] tabular-nums flex-shrink-0">
                          {subject.totalHours}h
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-[15px] font-medium text-[#111] leading-snug mb-2.5 group-hover:text-[#000]">
                        {subject.title}
                      </h3>

                      {/* Description */}
                      <p className="text-[13px] text-[#666] leading-relaxed flex-1 mb-4 line-clamp-3">
                        {preview}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3.5 border-t border-[#f2f2f2]">
                        <span className="text-[12px] text-[#aaa]">{subjectSessions}개 세션</span>
                        <span className="text-[12px] text-[#aaa] group-hover:text-[#333] transition-colors">
                          보기 →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}
