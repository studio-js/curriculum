import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminFromRequest } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

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

const VALID_CATEGORIES = ['정규교과', '프로젝트', '기타'] as const;

/* POST: 과목 생성 */
export async function POST(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let course_id: string, slug: string, title: string, category: string,
      description: string | null, total_hours: number;
  try {
    const body = await req.json();
    course_id   = String(body.course_id ?? '').trim();
    title       = String(body.title     ?? '').trim();
    category    = String(body.category  ?? '').trim();
    slug        = (body.slug ? String(body.slug).trim() : `subj-${Date.now().toString(36)}`);
    description = body.description ? String(body.description).trim() : null;
    total_hours = Number.isFinite(Number(body.total_hours)) ? Number(body.total_hours) : 0;

    if (!course_id || !title)                    throw new Error('필수 항목 누락');
    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      throw new Error('유효하지 않은 카테고리');
    }
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : '올바르지 않은 요청' }, 400);
  }

  const admin = createAdminClient();

  /* 마지막 position 계산 */
  const { data: lastRow } = await admin
    .from('course_subjects')
    .select('position')
    .eq('course_id', course_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (lastRow?.position ?? -1) + 1;

  const { data, error } = await admin
    .from('course_subjects')
    .insert({ course_id, slug, title, category, description, total_hours, position })
    .select()
    .single();

  if (error) return json({ error: '과목 생성 실패: ' + error.message }, 500);
  return json({ subject: data });
}

/* PATCH: 과목 수정 또는 일괄 순서 변경 */
export async function PATCH(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let body: { id?: string; course_id?: string; ordered_ids?: string[];
              title?: string; category?: string; description?: string | null;
              total_hours?: number; slug?: string; };
  try {
    body = await req.json();
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();

  /* 일괄 순서 변경 */
  if (Array.isArray(body.ordered_ids) && body.course_id) {
    const ids = body.ordered_ids;
    const errors: string[] = [];
    await Promise.all(
      ids.map(async (id, idx) => {
        const { error } = await admin
          .from('course_subjects')
          .update({ position: idx })
          .eq('id', id)
          .eq('course_id', body.course_id!);
        if (error) errors.push(error.message);
      }),
    );
    if (errors.length) return json({ error: '순서 변경 실패: ' + errors[0] }, 500);
    return json({ ok: true });
  }

  /* 단일 수정 */
  if (!body.id) return json({ error: 'id required' }, 400);

  const updates: Record<string, string | number | null> = {};
  if (body.title       !== undefined) updates.title       = String(body.title).trim();
  if (body.description !== undefined) updates.description = body.description ?? null;
  if (body.category    !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category as typeof VALID_CATEGORIES[number])) {
      return json({ error: '유효하지 않은 카테고리' }, 400);
    }
    updates.category = body.category;
  }
  if (body.total_hours !== undefined) updates.total_hours = Number(body.total_hours);
  if (body.slug        !== undefined) updates.slug        = String(body.slug).trim();

  if (Object.keys(updates).length === 0) return json({ error: '수정할 항목이 없습니다.' }, 400);

  const { error } = await admin.from('course_subjects').update(updates).eq('id', body.id);
  if (error) return json({ error: '과목 수정 실패: ' + error.message }, 500);
  return json({ ok: true });
}

/* DELETE: 과목 삭제 (cascade nodes) */
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
  const { error } = await admin.from('course_subjects').delete().eq('id', id);
  if (error) return json({ error: '과목 삭제 실패: ' + error.message }, 500);
  return json({ ok: true });
}
