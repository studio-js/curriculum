'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, profile, loading, logout, configured } = useAuthContext();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e4e1da]">
      <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-[13px] font-semibold text-[#1a1918] tracking-[0.04em] uppercase">
          AI 데이터 인텔리전스
        </Link>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-7">
            {[
              { href: '/',           label: '개요' },
              { href: '/curriculum', label: '커리큘럼' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-[13px] tracking-[0.02em] transition-colors ${
                  pathname === href
                    ? 'text-[#1a1918] font-semibold'
                    : 'text-[#97938c] hover:text-[#1a1918]'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── 사용자 영역 (Supabase 설정된 경우만) ── */}
          {configured && !loading && (
            user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1a1918] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {(profile?.email ?? user.email ?? '?')[0].toUpperCase()}
                  </span>
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-medium text-[#1a1918] leading-none">
                      {profile?.email ?? user.email}
                    </p>
                    {profile?.role && (
                      <p className="text-[10px] text-[#c3bfb8] mt-0.5">
                        {profile.role === 'admin' ? '관리자' : '수강생'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[11px] text-[#97938c] hover:text-[#1a1918] transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[12px] font-medium px-4 py-1.5 rounded-lg bg-[#1a1918] text-white hover:bg-[#3a3835] transition-colors"
              >
                로그인
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
