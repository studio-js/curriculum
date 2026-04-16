import type { Metadata } from 'next';
import { Noto_Sans_KR, Jost, EB_Garamond } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext';

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
});

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'AI 데이터 인텔리전스 전문가 과정',
  description: '심화 통계부터 시계열, 최신 LLM 기술을 통합해 비즈니스 난제를 정밀하게 예측/해결하는 고숙련 데이터 과학자 양성 과정',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jost.variable} ${notoSansKR.variable} ${ebGaramond.variable}`}>
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
