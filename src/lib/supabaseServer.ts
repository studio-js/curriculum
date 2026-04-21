/**
 * supabaseServer.ts — 서버사이드 전용 (API Route / Server Component)
 *
 * service_role 키를 사용하므로 절대 클라이언트 번들에 포함되면 안 됩니다.
 * SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_ 접두사 없이 .env.local에 추가하세요.
 */
import { createClient } from '@supabase/supabase-js';
import { Profile } from './supabase';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL   ?? '';
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY  ?? '';

/** service_role 클라이언트 — RLS를 우회하므로 서버에서만 사용 */
export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('[supabaseServer] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Authorization: Bearer <token> 헤더에서 사용자를 검증하고
 * admin 역할인지 확인합니다.
 *
 * @returns { uid, isAdmin } 또는 오류 시 null
 */
export async function verifyAdminFromRequest(
  req: Request,
): Promise<{ uid: string; isAdmin: boolean } | null> {
  const authorization = req.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return null;

  const admin = createAdminClient();

  /* JWT 검증 — Supabase가 서명·만료를 확인 */
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  /* 프로필에서 role 조회 (service_role이므로 RLS 우회) */
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<Pick<Profile, 'role'>>();

  return { uid: user.id, isAdmin: profile?.role === 'admin' };
}
