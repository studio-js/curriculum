'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, profile, loading, isAdmin, logout, configured } = useAuthContext();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  /* 역할별 nav 항목 */
  const navItems = !user
    ? []
    : isAdmin
      ? [
          { href: '/admin/students', label: '수강생 관리' },
          { href: '/admin/schedule', label: '일정 설정'  },
        ]
      : [{ href: '/classroom', label: '수강실' }];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#ece9e3]">
      <div className="max-w-4xl mx-auto px-8 h-[60px] flex items-center justify-between">
        <Link href="/" className="text-[13px] font-semibold text-[#1a1918] tracking-[0.1em] uppercase">
          MODULABS
        </Link>

        <div className="flex items-center gap-7">
          {navItems.length > 0 && (
            <nav className="flex items-center gap-7">
              {navItems.map(({ href, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={(e) => {
                      if (active) {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        router.refresh();
                      }
                    }}
                    className={`text-[13px] transition-colors active:scale-[0.97] ${
                      active
                        ? 'text-[#1a1918] font-medium'
                        : 'text-[#97938c] hover:text-[#3a3835]'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          {configured && !loading && (
            user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  <p className="text-[13px] font-medium text-[#1a1918]">
                    {profile?.name ?? profile?.email ?? user.email}
                  </p>
                  {profile?.role && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-[#c3bfb8] text-[#3a3835] leading-none tracking-[0.04em]">
                      {profile.role === 'admin' ? '관리자' : '수강생'}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[12px] text-[#97938c] hover:text-[#1a1918] transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[12px] font-medium px-4 py-1.5 rounded border border-[#1a1918] text-[#1a1918] hover:bg-[#1a1918] hover:text-white transition-colors"
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
