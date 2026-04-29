import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminFromRequest } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function json(body: object, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return json({ error: '요청이 너무 많습니다.' }, 429);

  const auth = await verifyAdminFromRequest(req);
  if (!auth)         return json({ error: '인증이 필요합니다.' }, 401);
  if (!auth.isAdmin) return json({ error: '관리자 권한이 필요합니다.' }, 403);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('courses')
    .select('id, title, description, start_date, end_date, created_at')
    .order('start_date', { ascending: true });

  if (error) return json({ error: '데이터를 불러오는데 실패했습니다.' }, 500);
  return json({ courses: data ?? [] });
}
