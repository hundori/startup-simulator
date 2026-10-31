import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Startup Simulator — 창업 수업용 경영 시뮬레이터',
  description:
    '조별로 가상의 회사를 세우고 3년 동안 경영 이벤트를 겪으며 전략을 선택하는 교육용 시뮬레이터입니다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3f5f8',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
