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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('enrollments')
    .select('id, student_id, course_id, status, enrolled_at, removed_at')
    .order('enrolled_at', { ascending: true });

  if (error) return json({ error: '데이터를 불러오는데 실패했습니다.' }, 500);
  return json({ enrollments: data ?? [] });
}

export async function POST(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let student_id: string, course_id: string;
  try {
    const body = await req.json();
    student_id = String(body.student_id ?? '').trim();
    course_id  = String(body.course_id  ?? '').trim();
    if (!student_id || !course_id) throw new Error('missing');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('enrollments')
    .upsert(
      {
        student_id,
        course_id,
        status:      'active',
        enrolled_at: new Date().toISOString(),
        removed_at:  null,
      },
      { onConflict: 'student_id,course_id' },
    );

  if (error) return json({ error: '등록에 실패했습니다.' }, 500);
  return json({ error: null });
}

export async function DELETE(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let student_id: string, course_id: string;
  try {
    const body = await req.json();
    student_id = String(body.student_id ?? '').trim();
    course_id  = String(body.course_id  ?? '').trim();
    if (!student_id || !course_id) throw new Error('missing');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('enrollments')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('student_id', student_id)
    .eq('course_id', course_id);

  if (error) return json({ error: '제거에 실패했습니다.' }, 500);
  return json({ error: null });
}
