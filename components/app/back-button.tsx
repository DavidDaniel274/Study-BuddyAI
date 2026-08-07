'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BackButton({ href, className }: { href?: string; className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('mb-2 -ml-2', className)}
      onClick={() => (href ? router.push(href) : router.back())}
    >
      <ArrowLeft className="mr-1 h-4 w-4" /> Back
    </Button>
  );
}
