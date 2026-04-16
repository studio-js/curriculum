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

      <section className="py-16">
        <div className="border-t border-[#e4e1da] pt-10">
          <p className="text-[10px] tracking-[0.28em] text-[#97938c] uppercase mb-6 font-medium">전체 과정</p>
          <div className="flex items-end justify-between">
            <h1 className="text-[36px] font-bold text-[#1a1918] tracking-tight">커리큘럼</h1>
            <p className="text-[12px] text-[#97938c] tabular-nums font-medium mb-1">{subjects.length}개 교과목 · {totalSessions}개 세션 · {totalHours}h</p>
          </div>
        </div>
      </section>

      <div className="space-y-14 pb-20">
        {categories.map((cat) => {
          const items = byCategory[cat];
          if (!items?.length) return null;
          const catHours = items.reduce((sum, s) => sum + s.totalHours, 0);

          return (
            <section key={cat}>
              <div className="flex items-end justify-between mb-6 pb-5 border-b border-[#e4e1da]">
                <div>
                  <p className="text-[10px] font-medium tracking-[0.28em] text-[#97938c] uppercase mb-2">{cat}</p>
                  <p className="text-[13px] text-[#58554f] leading-relaxed max-w-xl">{categoryMeta[cat].desc}</p>
                </div>
                <span className="text-[24px] font-bold text-[#1a1918] tabular-nums flex-shrink-0 ml-4 leading-none mb-0.5">{catHours}<span className="text-[14px] text-[#97938c] ml-0.5 font-medium">h</span></span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((subject) => {
                  const sessions = subject.nodes.reduce((s, n) => s + n.lessons.length, 0);
                  const allTopics = subject.nodes.flatMap(n => n.topics).slice(0, 4);

                  return (
                    <Link
                      key={subject.id}
                      href={`/curriculum/${subject.id}`}
                      className="group flex flex-col bg-white border border-[#e4e1da] rounded overflow-hidden hover:border-[#1a1918] hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-150"
                    >
                      {/* Card top */}
                      <div className="p-5 flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-medium text-[#97938c] tracking-[0.16em] uppercase">
                            {subject.nodes.length > 1 ? `${subject.nodes.length}개 노드` : '단일 노드'}
                          </span>
                          <span className="text-[13px] font-bold text-[#1a1918] tabular-nums">{subject.totalHours}h</span>
                        </div>

                        <h3 className="text-[15px] font-semibold text-[#1a1918] leading-snug mb-4 group-hover:text-[#000]">
                          {subject.title}
                        </h3>

                        {/* 다중 노드 — 노드 목록 */}
                        {subject.nodes.length > 1 && (
                          <ul className="space-y-1.5 mb-4">
                            {subject.nodes.map((node, ni) => (
                              <li key={node.id} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-[11px] text-[#97938c] tabular-nums flex-shrink-0 font-bold">{String(ni + 1).padStart(2, '0')}</span>
                                  <span className="text-[12px] text-[#1a1918] font-medium truncate">{node.title}</span>
                                </span>
                                <span className="text-[11px] text-[#3a3835] tabular-nums flex-shrink-0 font-medium">{node.hours}h</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* 단일 노드 — 설명 */}
                        {subject.nodes.length === 1 && (
                          <p className="text-[13px] text-[#3a3835] leading-[1.75] mb-4">
                            {subject.nodes[0].description.slice(0, 72)}…
                          </p>
                        )}

                        {/* Topics */}
                        <div className="flex flex-wrap gap-1.5">
                          {allTopics.map((t) => (
                            <span key={t} className="text-[11px] text-[#58554f] bg-[#f0ede8] px-2 py-0.5 rounded font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center justify-between px-5 py-3 bg-[#f7f6f3] border-t border-[#eceae5]">
                        <span className="text-[12px] text-[#3a3835] font-medium">{sessions}개 세션</span>
                        <span className="text-[12px] text-[#3a3835] font-semibold group-hover:text-[#1a1918] transition-colors">보기 →</span>
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
