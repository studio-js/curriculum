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

/* POST: 노드 생성 */
export async function POST(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let course_id: string, subject_id: string, slug: string, title: string,
      description: string | null, hours: number;
  try {
    const body = await req.json();
    course_id   = String(body.course_id  ?? '').trim();
    subject_id  = String(body.subject_id ?? '').trim();
    title       = String(body.title      ?? '').trim();
    slug        = (body.slug ? String(body.slug).trim() : `node-${Date.now().toString(36)}`);
    description = body.description ? String(body.description).trim() : null;
    hours       = Number.isFinite(Number(body.hours)) ? Number(body.hours) : 0;

    if (!course_id || !subject_id || !title) throw new Error('필수 항목 누락');
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : '올바르지 않은 요청' }, 400);
  }

  const admin = createAdminClient();

  const { data: lastRow } = await admin
    .from('course_nodes')
    .select('position')
    .eq('subject_id', subject_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (lastRow?.position ?? -1) + 1;

  const { data, error } = await admin
    .from('course_nodes')
    .insert({ course_id, subject_id, slug, title, description, hours, position })
    .select()
    .single();

  if (error) return json({ error: '노드 생성 실패: ' + error.message }, 500);
  return json({ node: data });
}

/* PATCH: 노드 수정 또는 일괄 순서 변경 */
export async function PATCH(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let body: { id?: string; subject_id?: string; ordered_ids?: string[];
              title?: string; description?: string | null;
              hours?: number; slug?: string; };
  try {
    body = await req.json();
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();

  /* 일괄 순서 변경 (subject 내에서) */
  if (Array.isArray(body.ordered_ids) && body.subject_id) {
    const errors: string[] = [];
    await Promise.all(
      body.ordered_ids.map(async (id, idx) => {
        const { error } = await admin
          .from('course_nodes')
          .update({ position: idx })
          .eq('id', id)
          .eq('subject_id', body.subject_id!);
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
  if (body.hours       !== undefined) updates.hours       = Number(body.hours);
  if (body.slug        !== undefined) updates.slug        = String(body.slug).trim();

  if (Object.keys(updates).length === 0) return json({ error: '수정할 항목이 없습니다.' }, 400);

  const { error } = await admin.from('course_nodes').update(updates).eq('id', body.id);
  if (error) return json({ error: '노드 수정 실패: ' + error.message }, 500);
  return json({ ok: true });
}

/* DELETE: 노드 삭제 */
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
  const { error } = await admin.from('course_nodes').delete().eq('id', id);
  if (error) return json({ error: '노드 삭제 실패: ' + error.message }, 500);
  return json({ ok: true });
}
