'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[#e8e8e8]">
      <div className="max-w-4xl mx-auto px-8 h-12 flex items-center justify-between">
        <Link href="/" className="text-[13px] tracking-tight text-[#111]">
          AI 데이터 인텔리전스
        </Link>
        <nav className="flex items-center gap-6">
          {[
            { href: '/', label: '개요' },
            { href: '/curriculum', label: '커리큘럼' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] transition-colors ${
                pathname === item.href
                  ? 'text-[#111]'
                  : 'text-[#999] hover:text-[#111]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
