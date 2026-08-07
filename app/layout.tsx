import './globals.css';
import type { Metadata } from 'next';
import { Nunito, Poppins } from 'next/font/google';
import { Providers } from '@/components/providers';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'StudyFlow AI — Study smarter, not harder',
  description:
    'An AI-powered academic productivity platform that combines project management, intelligent study assistance, document analysis, scheduling, and analytics into one delightful experience.',
  openGraph: {
    title: 'StudyFlow AI — Study smarter, not harder',
    description:
      'AI tutoring, document intelligence, project management, scheduling, analytics, and gamification — all in one playful notebook-inspired workspace.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${poppins.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
