'use client';

import { UserProvider } from '@/lib/user-context';
import { Sidebar } from '@/components/app/sidebar';
import { Topbar } from '@/components/app/topbar';
import { Mascot } from '@/components/paper';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-64">
        <Topbar />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
