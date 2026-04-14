'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
      <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-[14px] font-semibold text-[#1a1a1a] tracking-tight">
          AI 데이터 인텔리전스
        </Link>
        <nav className="flex items-center gap-6">
          {[
            { href: '/', label: '개요' },
            { href: '/curriculum', label: '커리큘럼' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-[14px] transition-colors ${
                pathname === href
                  ? 'text-[#1a1a1a] font-medium'
                  : 'text-[#888] hover:text-[#1a1a1a]'
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
