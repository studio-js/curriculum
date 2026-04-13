'use client';

import Link from 'next/link';
import { Subject } from '@/types/curriculum';
import CategoryBadge from './CategoryBadge';

interface Props {
  subject: Subject;
}

export default function SubjectCard({ subject }: Props) {
  return (
    <Link
      href={`/curriculum/${subject.id}`}
      className="block group p-5 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
          style={{ backgroundColor: subject.color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
            {subject.title}
          </h3>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
          {subject.totalHours}h
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <CategoryBadge category={subject.category} />
        <span className="text-xs text-gray-400">
          {subject.nodes.length}개 노드
        </span>
      </div>

      <div className="mt-3 h-1 bg-gray-50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full opacity-60"
          style={{
            backgroundColor: subject.color,
            width: '100%',
          }}
        />
      </div>
    </Link>
  );
}
