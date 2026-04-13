import { Category } from '@/types/curriculum';

interface Props {
  category: Category;
  size?: 'sm' | 'md';
}

const categoryStyles: Record<Category, string> = {
  정규교과: 'bg-blue-50 text-blue-600',
  프로젝트: 'bg-emerald-50 text-emerald-600',
  기타: 'bg-gray-100 text-gray-500',
};

export default function CategoryBadge({ category, size = 'sm' }: Props) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-block rounded-full font-medium ${sizeClass} ${categoryStyles[category]}`}>
      {category}
    </span>
  );
}
