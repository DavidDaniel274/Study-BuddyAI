'use client';

import { cn } from '@/lib/utils';

type Mood = 'happy' | 'wave' | 'think' | 'celebrate' | 'sleep';

interface MascotProps {
  mood?: Mood;
  size?: number;
  className?: string;
  float?: boolean;
}

/** A friendly hand-drawn notebook mascot. SVG-based, theme-aware. */
export function Mascot({ mood = 'happy', size = 120, className, float = true }: MascotProps) {
  const eyeY = mood === 'sleep' ? 56 : 54;
  const mouth =
    mood === 'celebrate'
      ? 'M44 64 Q60 82 76 64'
      : mood === 'think'
        ? 'M52 70 Q60 66 68 70'
        : 'M46 66 Q60 78 74 66';

  return (
    <div className={cn('relative inline-block', float && 'animate-float', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
        {/* spiral binding */}
        <g stroke="#9AA7C7" strokeWidth="2.5" strokeLinecap="round">
          <line x1="14" y1="22" x2="14" y2="30" />
          <line x1="26" y1="20" x2="26" y2="28" />
          <line x1="38" y1="22" x2="38" y2="30" />
        </g>
        {/* notebook body */}
        <rect x="18" y="18" width="84" height="84" rx="14" fill="#FFFDF7" stroke="#4F7DF3" strokeWidth="3" />
        {/* ruled lines */}
        <g stroke="#4F7DF3" strokeWidth="1.5" opacity="0.25">
          <line x1="24" y1="40" x2="96" y2="40" />
          <line x1="24" y1="50" x2="96" y2="50" />
          <line x1="24" y1="92" x2="96" y2="92" />
        </g>
        {/* red margin line */}
        <line x1="34" y1="20" x2="34" y2="100" stroke="#F78FB3" strokeWidth="2" opacity="0.5" />
        {/* eyes */}
        {mood === 'sleep' ? (
          <g stroke="#222" strokeWidth="2.5" strokeLinecap="round">
            <path d="M44 56 q4 -4 8 0" />
            <path d="M68 56 q4 -4 8 0" />
          </g>
        ) : mood === 'celebrate' ? (
          <g stroke="#222" strokeWidth="2.5" strokeLinecap="round">
            <path d="M42 52 q6 -6 12 0" />
            <path d="M66 52 q6 -6 12 0" />
          </g>
        ) : (
          <g fill="#222">
            <circle cx="48" cy={eyeY} r="4" />
            <circle cx="72" cy={eyeY} r="4" />
          </g>
        )}
        {/* cheeks */}
        <circle cx="40" cy="64" r="4" fill="#F78FB3" opacity="0.5" />
        <circle cx="80" cy="64" r="4" fill="#F78FB3" opacity="0.5" />
        {/* mouth */}
        <path d={mouth} stroke="#222" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* wave arm */}
        {mood === 'wave' && (
          <g stroke="#4F7DF3" strokeWidth="3" strokeLinecap="round">
            <path d="M102 36 q8 -8 4 -16" />
            <circle cx="104" cy="18" r="3" fill="#FFD166" stroke="#FFB703" />
          </g>
        )}
        {/* sparkles for celebrate */}
        {mood === 'celebrate' && (
          <g fill="#FFB703">
            <path d="M20 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
            <path d="M100 90 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" />
          </g>
        )}
      </svg>
    </div>
  );
}
