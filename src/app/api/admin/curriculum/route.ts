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

/* GET /api/admin/curriculum?course_id=xxx
 * 해당 과정의 subjects + nodes 반환 */
export async function GET(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  const url = new URL(req.url);
  const course_id = url.searchParams.get('course_id');
  if (!course_id) return json({ error: 'course_id required' }, 400);

  const admin = createAdminClient();

  const [{ data: subjects, error: sErr }, { data: nodes, error: nErr }] = await Promise.all([
    admin
      .from('course_subjects')
      .select('id, slug, title, category, description, total_hours, position')
      .eq('course_id', course_id)
      .order('position'),
    admin
      .from('course_nodes')
      .select('id, slug, subject_id, title, description, hours, position')
      .eq('course_id', course_id)
      .order('position'),
  ]);

  if (sErr || nErr) return json({ error: '커리큘럼 조회 실패' }, 500);

  return json({ subjects: subjects ?? [], nodes: nodes ?? [] });
}

/* POST /api/admin/curriculum
 * body: { course_id, source: 'default' | <other_course_uuid> }
 * - 'default'         : curriculumData(코드 내 기본 템플릿)에서 복사
 * - <other_course_uuid>: 해당 과정의 DB 커리큘럼에서 복사 */
export async function POST(req: Request) {
  const { guard } = await guardAdmin(req);
  if (guard) return guard;

  let course_id: string, source: string;
  let subjectSlugFilter: Set<string> | null = null;
  let nodeSlugFilter:    Set<string> | null = null;
  try {
    const body = await req.json();
    course_id = String(body.course_id ?? '').trim();
    source    = String(body.source    ?? 'default').trim();
    if (Array.isArray(body.subject_slugs)) {
      subjectSlugFilter = new Set(body.subject_slugs.map((s: unknown) => String(s)));
    }
    if (Array.isArray(body.node_slugs)) {
      nodeSlugFilter = new Set(body.node_slugs.map((s: unknown) => String(s)));
    }
    if (!course_id) throw new Error('missing course_id');
    if (source === course_id) throw new Error('cannot copy from self');
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : '올바르지 않은 요청 형식입니다.' }, 400);
  }

  const admin = createAdminClient();

  /* 소스 데이터 준비 — subjects[] + nodes[] */
  type Subject = { slug: string; title: string; category: string; description: string | null; total_hours: number; position: number; };
  type Node    = { slug: string; subject_slug: string; title: string; description: string | null; hours: number; position: number; };

  let sourceSubjects: Subject[] = [];
  let sourceNodes:    Node[]    = [];

  if (source === 'default') {
    sourceSubjects = curriculumData.subjects.map((s, idx) => ({
      slug:        s.id,
      title:       s.title,
      category:    s.category,
      description: null,
      total_hours: s.totalHours,
      position:    idx,
    }));
    sourceNodes = curriculumData.subjects.flatMap(s =>
      s.nodes.map((n, idx) => ({
        slug:         n.id,
        subject_slug: s.id,
        title:        n.title,
        description:  n.description ?? null,
        hours:        n.hours,
        position:     idx,
      })),
    );
  } else {
    /* 다른 과정에서 복사 */
    const [{ data: srcSubs }, { data: srcNds }] = await Promise.all([
      admin.from('course_subjects')
        .select('slug, title, category, description, total_hours, position, id')
        .eq('course_id', source).order('position'),
      admin.from('course_nodes')
        .select('slug, subject_id, title, description, hours, position')
        .eq('course_id', source).order('position'),
    ]);

    if (!srcSubs || srcSubs.length === 0) {
      return json({ error: '소스 과정에 커리큘럼이 없습니다.' }, 400);
    }

    const subIdToSlug = new Map((srcSubs ?? []).map(s => [s.id as string, s.slug as string]));

    sourceSubjects = (srcSubs ?? []).map(s => ({
      slug:        s.slug,
      title:       s.title,
      category:    s.category,
      description: s.description,
      total_hours: s.total_hours,
      position:    s.position,
    }));

    sourceNodes = (srcNds ?? [])
      .map(n => ({
        slug:         n.slug,
        subject_slug: subIdToSlug.get(n.subject_id) ?? '',
        title:        n.title,
        description:  n.description,
        hours:        n.hours,
        position:     n.position,
      }))
      .filter(n => n.subject_slug);
  }

  /* 선택적 필터 적용 */
  if (subjectSlugFilter) {
    sourceSubjects = sourceSubjects.filter(s => subjectSlugFilter!.has(s.slug));
  }
  /* 노드 필터: ① subject가 포함되어야 하고 ② node_slugs가 있다면 그것에 매칭 */
  const includedSubjectSlugs = new Set(sourceSubjects.map(s => s.slug));
  sourceNodes = sourceNodes.filter(n => {
    if (!includedSubjectSlugs.has(n.subject_slug)) return false;
    if (nodeSlugFilter && !nodeSlugFilter.has(n.slug)) return false;
    return true;
  });

  if (sourceSubjects.length === 0) {
    return json({ error: '가져올 과목이 없습니다.' }, 400);
  }

  /* 1) subjects upsert (대상 course_id 기준) */
  const subjectRows = sourceSubjects.map(s => ({
    course_id,
    slug:        s.slug,
    title:       s.title,
    category:    s.category,
    description: s.description,
    total_hours: s.total_hours,
    position:    s.position,
  }));

  const { data: insertedSubjects, error: sErr } = await admin
    .from('course_subjects')
    .upsert(subjectRows, { onConflict: 'course_id,slug' })
    .select('id, slug');

  if (sErr) return json({ error: '과목 시드 실패: ' + sErr.message }, 500);

  const subjectMap = new Map((insertedSubjects ?? []).map(s => [s.slug, s.id]));

  /* 2) nodes upsert */
  const nodeRows = sourceNodes
    .map(n => {
      const subjectDbId = subjectMap.get(n.subject_slug);
      if (!subjectDbId) return null;
      return {
        course_id,
        subject_id:  subjectDbId,
        slug:        n.slug,
        title:       n.title,
        description: n.description,
        hours:       n.hours,
        position:    n.position,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (nodeRows.length > 0) {
    const { error: nErr } = await admin
      .from('course_nodes')
      .upsert(nodeRows, { onConflict: 'course_id,slug' });
    if (nErr) return json({ error: '노드 시드 실패: ' + nErr.message }, 500);
  }

  return json({
    ok:       true,
    subjects: subjectRows.length,
    nodes:    nodeRows.length,
    source,
  });
}
