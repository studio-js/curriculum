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

export async function GET(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const course_id = searchParams.get('course_id');

  const admin = createAdminClient();
  let query = admin
    .from('subject_schedule')
    .select('id, course_id, subject_slug, available_from, updated_at');

  if (course_id) query = query.eq('course_id', course_id);

  const { data, error } = await query.order('subject_slug');
  if (error) return json({ error: '데이터를 불러오는데 실패했습니다.' }, 500);
  return json({ schedule: data ?? [] });
}

export async function POST(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let course_id: string, subject_slug: string, available_from: string | null;
  try {
    const body = await req.json();
    course_id     = String(body.course_id     ?? '').trim();
    subject_slug  = String(body.subject_slug  ?? '').trim();
    available_from = body.available_from
      ? String(body.available_from).trim()
      : null;
    if (!course_id || !subject_slug) throw new Error('missing');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('subject_schedule')
    .upsert(
      {
        course_id,
        subject_slug,
        available_from,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'course_id,subject_slug' },
    );

  if (error) return json({ error: '저장에 실패했습니다.' }, 500);
  return json({ error: null });
}
