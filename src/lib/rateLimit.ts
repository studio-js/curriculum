/**
 * rateLimit.ts — 인메모리 IP 기반 요청 제한
 *
 * 서버리스(Netlify Functions) 환경에서는 인스턴스 간 상태를 공유하지 않으므로
 * 동일 인스턴스 내에서만 동작하지만, 기본적인 남용 방지에 충분합니다.
 * 고트래픽 환경이라면 Upstash Redis 등 외부 스토어로 교체하세요.
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

/* 오래된 항목 정리 (메모리 누수 방지) */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** 윈도우 크기 (ms). 기본 60초 */
  windowMs?: number;
  /** 윈도우 내 최대 요청 수. 기본 30 */
  max?: number;
}

export function checkRateLimit(
  ip: string,
  options: RateLimitOptions = {},
): { ok: boolean; retryAfter?: number } {
  const { windowMs = 60_000, max = 30 } = options;
  const now = Date.now();

  /* 100건마다 cleanup */
  if (buckets.size > 0 && buckets.size % 100 === 0) cleanup();

  const entry = buckets.get(ip);

  if (!entry || now > entry.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= max) {
    return {
      ok: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { ok: true };
}

/** Request 객체에서 클라이언트 IP 추출 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
