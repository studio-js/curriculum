import type { NextConfig } from "next";

/* ── Content Security Policy ──────────────────────────────────────────────
   - script-src: 'unsafe-eval' — Pyodide (WebAssembly) 필수
   - connect-src: https: — Colab 터널 URL이 사용자 입력이므로 도메인 고정 불가
   - frame-ancestors 'none' — X-Frame-Options: DENY 와 동일 효과 (현대 브라우저)
   ──────────────────────────────────────────────────────────────────────── */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://accounts.google.com https:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

const SECURITY_HEADERS = [
  /* 클릭재킹 방지 */
  { key: 'X-Frame-Options',          value: 'DENY' },
  /* MIME 스니핑 방지 */
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  /* Referrer 최소화 */
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  /* 불필요한 기기 권한 차단 */
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  /* HTTPS 강제 (배포 환경) */
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  /* XSS · 코드 인젝션 방지 */
  { key: 'Content-Security-Policy',  value: CSP },
  /* DNS 프리페치 허용 (성능) */
  { key: 'X-DNS-Prefetch-Control',   value: 'on' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
