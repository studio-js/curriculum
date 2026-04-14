import Link from 'next/link';
import { curriculumData } from '@/data/curriculum';
import { Category } from '@/types/curriculum';

const categoryMeta: Record<Category, { desc: string }> = {
  정규교과: { desc: '데이터 과학자에게 필요한 핵심 기술을 체계적으로 습득하는 이론·실습 과목' },
  프로젝트: { desc: '실제 비즈니스 데이터로 수행하는 실전 과제 및 해커톤' },
  기타: { desc: '과정 시작·마무리 및 커리어 지원 프로그램' },
};

export default function CurriculumPage() {
  const { subjects } = curriculumData;
  const categories: Category[] = ['정규교과', '프로젝트', '기타'];

  const byCategory = subjects.reduce<Record<Category, typeof subjects>>(
    (acc, s) => { (acc[s.category] ??= []).push(s); return acc; },
    {} as Record<Category, typeof subjects>
  );

  const totalHours = subjects.reduce((sum, s) => sum + s.totalHours, 0);
  const totalSessions = subjects.reduce(
    (sum, s) => sum + s.nodes.reduce((ns, n) => ns + n.lessons.length, 0), 0
  );

  return (
    <div className="max-w-5xl mx-auto px-8">

      <section className="py-12">
        <h1 className="text-[30px] font-bold text-[#1a1a1a] tracking-tight mb-2">커리큘럼</h1>
        <p className="text-[15px] text-[#777]">{subjects.length}개 교과목 · {totalSessions}개 세션 · 총 {totalHours}h</p>
      </section>

      <div className="space-y-14 pb-20">
        {categories.map((cat) => {
          const items = byCategory[cat];
          if (!items?.length) return null;
          const catHours = items.reduce((sum, s) => sum + s.totalHours, 0);

          return (
            <section key={cat}>
              <div className="flex items-end justify-between mb-5 pb-4 border-b border-[#e5e5e5]">
                <div>
                  <h2 className="text-[20px] font-bold text-[#1a1a1a] mb-1">{cat}</h2>
                  <p className="text-[14px] text-[#777]">{categoryMeta[cat].desc}</p>
                </div>
                <span className="text-[13px] text-[#aaa] tabular-nums flex-shrink-0 ml-4">{catHours}h</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((subject) => {
                  const sessions = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                  const allTopics = subject.nodes.flatMap(n => n.topics).slice(0, 4);

                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex flex-col bg-white border border-[#e5e5e5] rounded-xl overflow-hidden hover:border-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-150"
                    >
                      {/* Card top */}
                      <div className="p-5 flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-medium text-[#999] tracking-widest uppercase">
                            {subject.nodes.length > 1 ? `${subject.nodes.length}개 노드` : '단일 노드'}
                          </span>
                          <span className="text-[13px] font-semibold text-[#333] tabular-nums">{subject.totalHours}h</span>
                        </div>

                        <h3 className="text-[16px] font-semibold text-[#1a1a1a] leading-snug mb-4 group-hover:text-[#000]">
                          {subject.title}
                        </h3>

                        {/* Node list (다중 노드인 경우) */}
                        {subject.nodes.length > 1 && (
                          <ul className="space-y-1.5 mb-4">
                            {subject.nodes.map((node, ni) => (
                              <li key={node.id} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] text-[#ccc] font-mono tabular-nums flex-shrink-0">{String(ni + 1).padStart(2, '0')}</span>
                                  <span className="text-[13px] text-[#555] truncate">{node.title}</span>
                                </span>
                                <span className="text-[12px] text-[#bbb] tabular-nums flex-shrink-0">{node.hours}h</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* 단일 노드면 설명 한 줄 */}
                        {subject.nodes.length === 1 && (
                          <p className="text-[13px] text-[#666] leading-[1.7] mb-4">
                            {subject.nodes[0].description.slice(0, 72)}…
                          </p>
                        )}

                        {/* Topics */}
                        <div className="flex flex-wrap gap-1.5">
                          {allTopics.map((t) => (
                            <span key={t} className="text-[11px] text-[#666] bg-[#f5f5f5] border border-[#ebebeb] px-2 py-0.5 rounded-md">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center justify-between px-5 py-3 bg-[#fafafa] border-t border-[#f0f0f0]">
                        <span className="text-[12px] text-[#aaa]">{sessions}개 세션</span>
                        <span className="text-[12px] text-[#bbb] group-hover:text-[#555] transition-colors">보기 →</span>
                      </div>
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
