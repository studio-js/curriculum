import { notFound } from 'next/navigation';
import { curriculumData } from '@/data/curriculum';
import SubjectLayout from '@/components/SubjectLayout';

export async function generateStaticParams() {
  return curriculumData.subjects.map((s) => ({ id: s.id }));
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject = curriculumData.subjects.find((s) => s.id === id);
  if (!subject) notFound();

  return <SubjectLayout subject={subject} />;
}
