'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e4e1da]">
      <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-[13px] font-semibold text-[#1a1918] tracking-[0.04em] uppercase">
          AI 데이터 인텔리전스
        </Link>
        <nav className="flex items-center gap-7">
          {[
            { href: '/', label: '개요' },
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
      </div>
    </header>
  );
}
