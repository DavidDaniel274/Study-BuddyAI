'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  fire: number; // increment to trigger
  count?: number;
}

const COLORS = ['#4F7DF3', '#6C63FF', '#FFD166', '#06D6A0', '#F78FB3', '#FF7F50', '#8BD3DD'];

/** Lightweight confetti burst — no external deps. Fire by changing the `fire` prop. */
export function Confetti({ fire, count = 80 }: ConfettiProps) {
  const [pieces, setPieces] = useState<
    { id: number; left: number; color: string; delay: number; size: number; rotate: number }[]
  >([]);

  useEffect(() => {
    if (fire === 0) return;
    const next = Array.from({ length: count }, (_, i) => ({
      id: i + fire * 1000,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.3,
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 1500);
    return () => clearTimeout(t);
  }, [fire, count]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animationDelay: `${p.delay}s`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
