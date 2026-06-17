import { cn } from "@/lib/cn";

type IconProps = { className?: string };

// LabDuel mark: two crossed blades forming a duel / deflection.
export function LabDuelMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <path d="M5 27L21 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M11 7l16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
    </svg>
  );
}

const PATHS: Record<string, React.ReactNode> = {
  shield: (
    <path
      d="M12 3l7 2.5v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10v-5L12 3z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  scope: (
    <>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  pulse: (
    <path
      d="M3 12h4l2-6 4 12 2-6h6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  mask: (
    <path
      d="M4 7c4-1 12-1 16 0 0 6-2 9-8 11C6 16 4 13 4 7z M9 11h.01M15 11h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
  ),
  bolt: (
    <path
      d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.8" fill="none" />
    </>
  ),
};

export function RoleGlyph({ glyph, className }: { glyph: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden>
      {PATHS[glyph] ?? PATHS.shield}
    </svg>
  );
}
