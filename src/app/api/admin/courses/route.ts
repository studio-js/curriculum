import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminFromRequest } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { curriculumData } from '@/data/curriculum';

function json(body: object, status = 200) {
  return NextResponse.json(body, { status });
}

async function guardAdmin(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return { guard: json({ error: '요청이 너무 많습니다.' }, 429), auth: null };

  const auth = await verifyAdminFromRequest(req);
  if (!auth)         return { guard: json({ error: '인증이 필요합니다.' }, 401), auth: null };
  if (!auth.isAdmin) return { guard: json({ error: '관리자 권한이 필요합니다.' }, 403), auth: null };

  return { guard: null, auth };
}

export async function GET(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('courses')
    .select('id, title, description, start_date, end_date, created_at')
    .order('start_date', { ascending: true });

  if (error) return json({ error: '데이터를 불러오는데 실패했습니다.' }, 500);
  return json({ courses: data ?? [] });
}

/* 새 과정 생성 */
export async function POST(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let title: string, description: string | null, start_date: string | null, end_date: string | null;
  try {
    const body = await req.json();
    title       = String(body.title ?? '').trim();
    description = body.description ? String(body.description).trim() : null;
    start_date  = body.start_date  ? String(body.start_date)         : null;
    end_date    = body.end_date    ? String(body.end_date)           : null;
    if (!title) throw new Error('missing title');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();
  const { data: course, error } = await admin
    .from('courses')
    .insert({ title, description, start_date, end_date })
    .select()
    .single();

  if (error || !course) return json({ error: '생성에 실패했습니다.' }, 500);

  /* 신규 과정 생성 시 기본 커리큘럼 자동 시드 (실패해도 과정 자체는 생성 OK) */
  try {
    const subjectRows = curriculumData.subjects.map((s, idx) => ({
      course_id:   course.id,
      slug:        s.id,
      title:       s.title,
      category:    s.category,
      total_hours: s.totalHours,
      position:    idx,
    }));
    const { data: insertedSubjects } = await admin
      .from('course_subjects')
      .upsert(subjectRows, { onConflict: 'course_id,slug' })
      .select('id, slug');

    const subjectMap = new Map((insertedSubjects ?? []).map(s => [s.slug, s.id]));
    const nodeRows: Array<{
      course_id: string; subject_id: string; slug: string; title: string;
      description: string | null; hours: number; position: number;
    }> = [];
    for (const s of curriculumData.subjects) {
      const sid = subjectMap.get(s.id);
      if (!sid) continue;
      s.nodes.forEach((n, idx) => {
        nodeRows.push({
          course_id:   course.id,
          subject_id:  sid,
          slug:        n.id,
          title:       n.title,
          description: n.description ?? null,
          hours:       n.hours,
          position:    idx,
        });
      });
    }
    if (nodeRows.length > 0) {
      await admin.from('course_nodes').upsert(nodeRows, { onConflict: 'course_id,slug' });
    }
  } catch {
    /* 시드 실패는 무시 — 과정은 정상 생성됨, 추후 수동 시드 가능 */
  }

  return json({ course });
}

/* 과정 정보 수정 */
export async function PATCH(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let id: string;
  let updates: Record<string, string | null> = {};
  try {
    const body = await req.json();
    id = String(body.id ?? '').trim();
    if (!id) throw new Error('missing id');

    if (body.title       !== undefined) updates.title       = String(body.title).trim();
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.start_date  !== undefined) updates.start_date  = body.start_date  || null;
    if (body.end_date    !== undefined) updates.end_date    = body.end_date    || null;

    if (Object.keys(updates).length === 0) throw new Error('no fields');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();
  const { error } = await admin.from('courses').update(updates).eq('id', id);

  if (error) return json({ error: '수정에 실패했습니다.' }, 500);
  return json({ error: null });
}

/* 과정 삭제 */
export async function DELETE(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let id: string;
  try {
    const body = await req.json();
    id = String(body.id ?? '').trim();
    if (!id) throw new Error('missing id');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();
  const { error } = await admin.from('courses').delete().eq('id', id);

  if (error) return json({ error: '삭제에 실패했습니다.' }, 500);
  return json({ error: null });
}
