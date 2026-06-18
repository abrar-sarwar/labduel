"use client";

import { useEffect, useState } from "react";
import { Logo } from "./ui";
import { StatusPill } from "./console";
import type { Phase } from "@/lib/shared/types";
import type { ConnStatus } from "./hooks";

const PHASE: Record<Phase, { label: string; tone: "ok" | "warn" | "idle" | "info"; pulse?: boolean }> = {
  lobby: { label: "Lobby", tone: "idle" },
  roleReveal: { label: "Role Assign", tone: "info" },
  roundBriefing: { label: "Briefing", tone: "info" },
  active: { label: "Live", tone: "ok", pulse: true },
  submissionLock: { label: "Locked", tone: "warn" },
  debrief: { label: "Debrief", tone: "info" },
  shop: { label: "Strategy", tone: "info" },
  finalResults: { label: "Results", tone: "ok" },
};

const CONN: Record<ConnStatus, { label: string; tone: "ok" | "warn" | "idle"; pulse?: boolean }> = {
  connecting: { label: "Linking", tone: "idle" },
  live: { label: "Online", tone: "ok", pulse: true },
  reconnecting: { label: "Reconnecting", tone: "warn", pulse: true },
};

function Clock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const fmt = () => setT(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="hidden font-mono text-[0.66rem] tabular-nums text-paper/40 sm:inline">{t}</span>;
}

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
  const p = PHASE[phase];
  const c = CONN[status];
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0c12]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="hidden items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-paper/40 sm:inline-flex">
            session
            <span className="rounded-[4px] border border-white/10 bg-white/[0.03] px-1.5 py-0.5 tracking-[0.3em] text-paper/75">
              {code}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={p.tone} pulse={p.pulse}>
            {p.label}
          </StatusPill>
          <StatusPill tone={c.tone} pulse={c.pulse}>
            {c.label}
          </StatusPill>
          <Clock />
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
