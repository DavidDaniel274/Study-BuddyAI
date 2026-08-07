'use client';

/** Torn-paper divider — a jagged edge that looks like ripped paper. */
export function TornDivider({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <div className={`relative h-4 w-full ${className}`} aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 16"
        preserveAspectRatio="none"
        style={{ transform: flip ? 'scaleY(-1)' : undefined }}
      >
        <path
          d="M0 8 L40 4 L80 12 L120 6 L160 10 L200 3 L240 11 L280 5 L320 13 L360 7 L400 10 L440 4 L480 12 L520 6 L560 10 L600 4 L640 12 L680 6 L720 11 L760 5 L800 13 L840 7 L880 10 L920 4 L960 12 L1000 6 L1040 11 L1080 5 L1120 13 L1160 7 L1200 10 L1200 16 L0 16 Z"
          fill="currentColor"
          className="text-border"
        />
      </svg>
    </div>
  );
}
