'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

const NAV = [
  { href: '/admin/students', label: '수강생 관리' },
  { href: '/admin/schedule', label: '수업 일정 설정' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuthContext();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/');
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <span className="inline-block w-5 h-5 border-2 border-[#e4e1da] border-t-[#1a1918] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div>
      {/* Admin 서브 네비게이션 */}
      <div className="border-b border-[#e4e1da] bg-[#f7f6f3]">
        <div className="max-w-4xl mx-auto px-8 h-[44px] flex items-center gap-2">
          {/* 브레드크럼 */}
          <Link href="/" className="text-[11px] text-[#c3bfb8] hover:text-[#97938c] transition-colors flex-shrink-0">
            관리자
          </Link>
          <span className="text-[#e4e1da] text-[11px] flex-shrink-0">/</span>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-[12px] px-3 py-1 rounded-md transition-colors ${
                  pathname === href
                    ? 'bg-white text-[#1a1918] font-semibold border border-[#e4e1da] shadow-sm'
                    : 'text-[#97938c] hover:text-[#1a1918]'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
