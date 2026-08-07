'use client';

import Link from 'next/link';
import { PaperCard, Mascot, WashiTape } from '@/components/paper';
import { GraduationCap } from 'lucide-react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute left-8 top-16 hidden md:block"><div className="h-12 w-12 rotate-12 rounded-lg bg-secondary/60 shadow-paper-sm" /></div>
      <div className="pointer-events-none absolute right-10 top-24 hidden md:block"><div className="h-10 w-10 -rotate-6 rounded-full bg-pink/40 shadow-paper-sm" /></div>
      <div className="pointer-events-none absolute bottom-16 left-16 hidden md:block"><div className="h-9 w-9 rotate-12 rounded-md bg-accent/30 shadow-paper-sm" /></div>

      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-paper-sm">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="font-display text-xl font-extrabold">StudyFlow<span className="text-primary"> AI</span></span>
        </Link>

        <PaperCard className="relative p-7" lift={false}>
          <WashiTape color="mint" rotate={-4} width={90} className="-top-3 left-6" />
          <div className="mb-5 flex items-center gap-3">
            <Mascot mood="happy" size={56} float={false} />
            <div>
              <h1 className="font-display text-xl font-extrabold leading-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {children}
        </PaperCard>
      </div>
    </div>
  );
}
