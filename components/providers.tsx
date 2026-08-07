'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme-context';
import { UserProvider } from '@/lib/user-context';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>{children}</UserProvider>
      <Toaster />
    </ThemeProvider>
  );
}
