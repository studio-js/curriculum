import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Supabase 환경변수가 설정됐는지 여부 */
export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/* 환경변수 없이는 createClient를 호출하지 않음 */
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

/* ── 타입 ── */
export type UserRole = 'admin' | 'student';

export interface Profile {
  id:         string;
  email:      string;
  role:       UserRole;
  created_at: string;
}

/* ── Storage 헬퍼 ── */

/** Storage 내 노트북 경로: notebooks/{과정slug}/{레슨slug}.json
 *  Supabase Storage는 ASCII 경로만 허용하므로 비ASCII 문자는 제거.
 *  한글만 있는 제목은 빈 문자열이 되어 충돌하므로,
 *  항상 타이틀 해시를 접미사로 붙여 경로 고유성을 보장한다. */
export function notebookStoragePath(subjectTitle: string, lessonTitle: string): string {
  const toSlug = (s: string) => {
    // 타이틀 전체의 안정적 해시 (32bit unsigned → base36)
    const hash = (s.split('').reduce(
      (h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0
    ) >>> 0).toString(36);

    // ASCII 영숫자만 추출해 가독성 있는 접두사로 사용
    const prefix = s
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);

    return prefix ? `${prefix}_${hash}` : `nb_${hash}`;
  };
  return `${toSlug(subjectTitle)}/${toSlug(lessonTitle)}.json`;
}

/** 노트북 섹션 JSON → Storage 업로드, lesson_notebooks 레코드 upsert
 *  성공 시 실제 저장된 storage path를 반환 — 이후 download/delete에 사용 */
export async function uploadNotebook(
  subjectTitle: string,
  lessonTitle:  string,
  sectionsJson: string,
): Promise<{ error: string | null; path: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase가 설정되지 않았습니다.', path: null };

  const path = notebookStoragePath(subjectTitle, lessonTitle);

  const blob = new Blob([sectionsJson], { type: 'application/json' });
  const { error: uploadErr } = await supabase.storage
    .from('notebooks')
    .upload(path, blob, { upsert: true, contentType: 'application/json' });

  if (uploadErr) return { error: uploadErr.message, path: null };

  const { error: dbErr } = await supabase
    .from('lesson_notebooks')
    .upsert(
      { subject_title: subjectTitle, lesson_title: lessonTitle, storage_path: path },
      { onConflict: 'subject_title,lesson_title' },
    );

  return { error: dbErr ? dbErr.message : null, path };
}

/** Storage에서 섹션 JSON 다운로드
 *  storagePath: DB에서 가져온 실제 경로 (없으면 재생성 — 구버전 호환) */
export async function downloadNotebook(
  subjectTitle: string,
  lessonTitle:  string,
  storagePath?: string,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabaseConfigured) return { data: null, error: 'Supabase가 설정되지 않았습니다.' };

  const path = storagePath ?? notebookStoragePath(subjectTitle, lessonTitle);
  const { data: blob, error } = await supabase.storage.from('notebooks').download(path);
  if (error) return { data: null, error: error.message };

  const text = await blob.text();
  return { data: text, error: null };
}

/** lesson_notebooks 레코드 + Storage 파일 삭제
 *  storagePath: DB에서 가져온 실제 경로 (없으면 재생성 — 구버전 호환) */
export async function deleteNotebookRemote(
  subjectTitle: string,
  lessonTitle:  string,
  storagePath?: string,
): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase가 설정되지 않았습니다.' };

  const path = storagePath ?? notebookStoragePath(subjectTitle, lessonTitle);
  await supabase.storage.from('notebooks').remove([path]);
  await supabase
    .from('lesson_notebooks')
    .delete()
    .eq('subject_title', subjectTitle)
    .eq('lesson_title', lessonTitle);

  return { error: null };
}

/** 전체 lesson_notebooks 목록 조회 */
export async function listNotebooks(): Promise<{
  data: { subject_title: string; lesson_title: string; storage_path: string }[];
  error: string | null;
}> {
  if (!supabaseConfigured) return { data: [], error: null };

  const { data, error } = await supabase
    .from('lesson_notebooks')
    .select('subject_title, lesson_title, storage_path')
    .order('subject_title')
    .order('lesson_title');

  return { data: data ?? [], error: error?.message ?? null };
}
