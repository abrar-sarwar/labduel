"use client";

import { cn } from "@/lib/cn";
import type { Team, Phase } from "@/lib/shared/types";
import { RoleGlyph } from "./icons";
import { useCountdown, type ConnStatus } from "./hooks";

export const teamLabel = (t: Team) => (t === "red" ? "Red Team" : "Blue Team");

export function teamClasses(team: Team | null | undefined) {
  if (team === "red")
    return {
      text: "text-red-team",
      bg: "bg-red-team",
      border: "border-red-team/40",
      soft: "bg-red-team/10",
      glow: "shadow-glowred",
    };
  if (team === "blue")
    return {
      text: "text-blue-team",
      bg: "bg-blue-team",
      border: "border-blue-team/40",
      soft: "bg-blue-team/10",
      glow: "shadow-glowblue",
    };
  return { text: "text-paper/60", bg: "bg-white/20", border: "border-white/15", soft: "bg-white/5", glow: "" };
}

export function TeamCrest({
  team,
  size = "md",
}: {
  team: Team;
  size?: "sm" | "md" | "lg";
}) {
  const c = teamClasses(team);
  const dim = { sm: "h-8 w-8", md: "h-11 w-11", lg: "h-16 w-16" }[size];
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center rounded-xl border",
        c.border,
        c.soft,
        dim
      )}
    >
      <RoleGlyph
        glyph={team === "red" ? "bolt" : "shield"}
        className={cn(c.text, size === "lg" ? "h-8 w-8" : "h-5 w-5")}
      />
    </span>
  );
}

export function TeamTag({ team, className }: { team: Team; className?: string }) {
  const c = teamClasses(team);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-xs font-bold uppercase tracking-wider",
        c.border,
        c.soft,
        c.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.bg)} />
      {teamLabel(team)}
    </span>
  );
}

const PHASE_LABELS: Record<Phase, string> = {
  lobby: "Lobby",
  roleReveal: "Role Reveal",
  roundBriefing: "Briefing",
  active: "Live Round",
  submissionLock: "Locked",
  debrief: "Debrief",
  shop: "Strategy Shop",
  finalResults: "Results",
};

export function PhasePill({ phase }: { phase: Phase }) {
  const live = phase === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.25em]",
        live ? "border-mint/40 bg-mint/10 text-mint" : "border-white/12 bg-white/5 text-paper/70"
      )}
    >
      {live && <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />}
      {PHASE_LABELS[phase]}
    </span>
  );
}

export function ConnIndicator({ status }: { status: ConnStatus }) {
  const map = {
    connecting: { c: "text-paper/50 border-white/10", dot: "bg-paper/40", t: "Connecting" },
    live: { c: "text-mint border-mint/30", dot: "bg-mint", t: "Live" },
    reconnecting: { c: "text-warn border-warn/30", dot: "bg-warn animate-pulse", t: "Reconnecting" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-widest", map.c)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", map.dot)} />
      {map.t}
    </span>
  );
}

export function Countdown({
  deadline,
  totalSeconds,
  big,
}: {
  deadline: number | null;
  totalSeconds: number;
  big?: boolean;
}) {
  const { label, msLeft } = useCountdown(deadline);
  const frac = deadline && msLeft != null ? Math.max(0, Math.min(1, msLeft / (totalSeconds * 1000))) : 0;
  const urgent = msLeft != null && msLeft <= 10_000 && msLeft > 0;
  return (
    <div className="w-full">
      <div
        className={cn(
          "tabular-nums font-mono font-bold leading-none transition-colors",
          big ? "text-5xl" : "text-2xl",
          urgent ? "text-danger" : "text-paper"
        )}
        // fixed min width prevents layout shift as digits change
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {label}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300 ease-linear", urgent ? "bg-danger" : "bg-gold")}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBar({ red, blue }: { red: number; blue: number }) {
  const total = Math.max(1, red + blue);
  const redPct = (red / total) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between font-display">
        <span className="text-red-team text-2xl font-black tabular-nums">{red}</span>
        <span className="eyebrow">Score</span>
        <span className="text-blue-team text-2xl font-black tabular-nums">{blue}</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-600">
        <div
          className="h-full bg-gradient-to-r from-red-deep to-red-team transition-[width] duration-700 ease-out"
          style={{ width: `${redPct}%` }}
        />
        <div className="h-full flex-1 bg-gradient-to-r from-blue-team to-blue-deep transition-[width] duration-700 ease-out" />
      </div>
    </div>
  );
}

export function CoinFlip({
  initiative,
  round,
  bonus,
}: {
  initiative: Team;
  round: number;
  bonus: number;
}) {
  const c = teamClasses(initiative);
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="perspective py-2">
        <div key={round} className="preserve-3d animate-coin-flip relative h-28 w-28">
          {/* two faces so the spin clearly reads as a coin flip */}
          {(["front", "back"] as const).map((face) => (
            <div
              key={face}
              className="backface-hidden absolute inset-0 grid place-items-center rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #ffe39a, #f6b73c 55%, #b9821a)",
                boxShadow:
                  "0 14px 40px -10px rgba(246,183,60,0.7), inset 0 0 0 4px rgba(0,0,0,0.14)",
                transform: face === "back" ? "rotateX(180deg)" : undefined,
              }}
            >
              <span className="font-display text-4xl font-black text-ink/80">
                {initiative === "red" ? "R" : "B"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow">Initiative</p>
        <p className={cn("font-display text-2xl font-black uppercase", c.text)}>
          {teamLabel(initiative)} moves first
        </p>
        <p className="mt-1 text-sm text-paper/60">
          +{Math.round((bonus - 1) * 100)}% initiative bonus this round
        </p>
      </div>
    </div>
  );
}

export function RoleCard({
  role,
  team,
}: {
  role: { name: string; blurb: string; glyph: string };
  team: Team;
}) {
  const c = teamClasses(team);
  return (
    <div className={cn("panel relative overflow-hidden p-5", c.glow)}>
      <div className={cn("absolute inset-x-0 top-0 h-1", c.bg)} />
      <div className="flex items-start gap-4">
        <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-xl border", c.border, c.soft)}>
          <RoleGlyph glyph={role.glyph} className={cn("h-7 w-7", c.text)} />
        </span>
        <div>
          <p className="eyebrow">{teamLabel(team)} · Role</p>
          <h3 className="font-display text-2xl font-black">{role.name}</h3>
          <p className="mt-1 text-sm text-paper/70">{role.blurb}</p>
        </div>
      </div>
    </div>
  );
}
