"use client";

import { Logo } from "./ui";
import { PhasePill, ConnIndicator } from "./game";
import type { Phase } from "@/lib/shared/types";
import type { ConnStatus } from "./hooks";

export function LiveBar({
  code,
  phase,
  status,
  right,
}: {
  code: string;
  phase: Phase;
  status: ConnStatus;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="hidden font-mono text-xs uppercase tracking-[0.3em] text-paper/40 sm:inline">
            {code}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PhasePill phase={phase} />
          <ConnIndicator status={status} />
          {right}
        </div>
      </div>
    </header>
  );
}

export function CenterMessage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="animate-rise mx-auto mt-10 max-w-md text-center">
      <h2 className="font-display text-2xl font-black">{title}</h2>
      {children && <div className="mt-2 text-paper/60">{children}</div>}
    </div>
  );
}
