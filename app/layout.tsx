import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ADHD向け 1分アイドリング式タイマー',
  description: '1分のアイドリングと休憩を自分で選べる、シンプルなタイマー。'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
