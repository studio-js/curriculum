/**
 * /api/admin/notebooks — 관리자 노트북 업로드 · 삭제 API
 *
 * 모든 쓰기 작업을 서버사이드에서 수행하여
 * 클라이언트가 service_role 키에 접근하지 않아도 됩니다.
 *
 * Authorization: Bearer <access_token> 헤더 필수.
 * admin 역할이 아니면 403을 반환합니다.
 */
import { NextResponse } from 'next/server';
import { createAdminClient, verifyAdminFromRequest } from '@/lib/supabaseServer';
import { notebookStoragePath } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const MAX_BODY_BYTES  = 50 * 1024 * 1024; // 50 MB
const MAX_TITLE_LEN   = 300;              // 과목·레슨 제목 최대 길이

function json(body: object, status = 200) {
  return NextResponse.json(body, { status });
}

/** 공통: Rate Limit + 관리자 검증 */
async function guardAdmin(req: Request) {
  /* Rate Limit: IP당 분당 20회 */
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    const res = json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429);
    res.headers.set('Retry-After', String(rl.retryAfter ?? 60));
    return { guard: res, auth: null };
  }

  const auth = await verifyAdminFromRequest(req);
  if (!auth)         return { guard: json({ error: '인증이 필요합니다.' }, 401),        auth: null };
  if (!auth.isAdmin) return { guard: json({ error: '관리자 권한이 필요합니다.' }, 403), auth: null };

  return { guard: null, auth };
}

/* ── POST: 노트북 업로드 ─────────────────────────────────────────── */
export async function POST(req: Request) {
  const { guard, auth } = await guardAdmin(req);
  if (guard) return guard;

  /* Content-Length 사전 체크 */
  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return json({ error: '파일이 너무 큽니다. (최대 50MB)' }, 413);
  }

  /* 바디 파싱 + 입력 검증 */
  let subjectTitle: string, lessonTitle: string, sectionsJson: string;
  try {
    const body = await req.json();

    subjectTitle = String(body.subjectTitle ?? '').trim();
    lessonTitle  = String(body.lessonTitle  ?? '').trim();
    sectionsJson = String(body.sectionsJson ?? '').trim();

    /* 필드 누락 */
    if (!subjectTitle || !lessonTitle || !sectionsJson) throw new Error('missing');

    /* 제목 길이 제한 (SQL 인젝션 · 경로 조작 방어) */
    if (subjectTitle.length > MAX_TITLE_LEN || lessonTitle.length > MAX_TITLE_LEN) {
      return json({ error: '제목이 너무 깁니다.' }, 400);
    }

    /* 경로 탐색 문자 차단 */
    if (/[<>:"\\|?*\x00-\x1f]/.test(subjectTitle + lessonTitle)) {
      return json({ error: '허용되지 않는 문자가 포함되어 있습니다.' }, 400);
    }

    /* JSON 유효성 검증 */
    const parsed = JSON.parse(sectionsJson);
    if (!Array.isArray(parsed)) throw new Error('not array');

    /* 실제 바이트 크기 체크 */
    if (new TextEncoder().encode(sectionsJson).length > MAX_BODY_BYTES) throw new Error('too large');
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  /* Storage 업로드 */
  const admin = createAdminClient();
  const path  = notebookStoragePath(subjectTitle, lessonTitle);
  const blob  = new Blob([sectionsJson], { type: 'application/json' });

  const { error: uploadErr } = await admin.storage
    .from('notebooks')
    .upload(path, blob, { upsert: true, contentType: 'application/json' });

  if (uploadErr) return json({ error: '업로드에 실패했습니다.' }, 500);

  /* DB upsert */
  const { error: dbErr } = await admin
    .from('lesson_notebooks')
    .upsert(
      { subject_title: subjectTitle, lesson_title: lessonTitle, storage_path: path, uploaded_by: auth!.uid },
      { onConflict: 'subject_title,lesson_title' },
    );

  if (dbErr) return json({ error: '데이터베이스 저장에 실패했습니다.' }, 500);
  return json({ path, error: null });
}

/* ── DELETE: 노트북 삭제 ─────────────────────────────────────────── */
export async function DELETE(req: Request) {
  const { guard, auth } = await guardAdmin(req);
  if (guard) return guard;

  let subjectTitle: string, lessonTitle: string, storagePath: string | undefined;
  try {
    const body = await req.json();

    subjectTitle = String(body.subjectTitle ?? '').trim();
    lessonTitle  = String(body.lessonTitle  ?? '').trim();
    storagePath  = body.storagePath ? String(body.storagePath).trim() : undefined;

    if (!subjectTitle || !lessonTitle) throw new Error('missing');
    if (subjectTitle.length > MAX_TITLE_LEN || lessonTitle.length > MAX_TITLE_LEN) {
      return json({ error: '제목이 너무 깁니다.' }, 400);
    }
  } catch {
    return json({ error: '올바르지 않은 요청 형식입니다.' }, 400);
  }

  /* storagePath 경로 탐색 방어 (.. 포함 경로 차단) */
  const safePath = storagePath ?? notebookStoragePath(subjectTitle, lessonTitle);
  if (safePath.includes('..') || safePath.startsWith('/')) {
    return json({ error: '허용되지 않는 경로입니다.' }, 400);
  }

  const admin = createAdminClient();
  await admin.storage.from('notebooks').remove([safePath]);
  await admin
    .from('lesson_notebooks')
    .delete()
    .eq('subject_title', subjectTitle)
    .eq('lesson_title', lessonTitle);

  return json({ error: null });
}
