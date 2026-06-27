import type { Metadata } from 'next';
import './globals.css';
import { ResponsiveLayout } from '@/components/mobile-sidebar';

export const metadata: Metadata = {
  title: {
    default: 'AI Virtual Try-On Studio',
    template: '%s | AI Try-On',
  },
  description: 'AI-powered virtual try-on platform. Generate models, upload garments, and create stunning try-on images.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">
        <ResponsiveLayout>
          {children}
        </ResponsiveLayout>
      </body>
    </html>
  );
}
