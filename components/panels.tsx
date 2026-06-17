"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type {
  PublicDebrief,
  PublicFinal,
  PublicSquad,
  PublicRound,
  Team,
  InsiderView,
  HostModeration,
} from "@/lib/shared/types";
import { teamClasses, teamLabel, TeamCrest } from "./game";
import { postAction } from "./hooks";
import { upgradesForTeam } from "@/lib/content/upgrades";
import type { TeamEconomy } from "@/lib/shared/types";

export function MissionBrief({ round }: { round: PublicRound }) {
  const c = teamClasses(round.initiative);
  return (
    <div className="panel overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Round {round.number}</p>
        <span className={cn("chip", c.border, c.soft, c.text)}>
          {teamLabel(round.initiative)} initiative
        </span>
      </div>
      <h2 className="mt-2 font-display text-3xl font-black">{round.title}</h2>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-gold/80">
        {round.concept}
      </p>
      <p className="mt-4 text-paper/80">{round.publicBrief}</p>
    </div>
  );
}

export function DebriefBlock({ debrief }: { debrief: PublicDebrief }) {
  return (
    <div className="animate-rise space-y-4">
      <div className="panel p-6">
        <p className="eyebrow">Debrief · Round {debrief.round}</p>
        <h2 className="mt-2 font-display text-3xl font-black">{debrief.title}</h2>
        <p className="mt-3 text-paper/80">{debrief.summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel border-red-team/30 p-5">
          <p className="font-display text-sm font-bold uppercase text-red-team">What Red did</p>
          <p className="mt-2 text-sm text-paper/75">{debrief.red}</p>
        </div>
        <div className="panel border-blue-team/30 p-5">
          <p className="font-display text-sm font-bold uppercase text-blue-team">What Blue did</p>
          <p className="mt-2 text-sm text-paper/75">{debrief.blue}</p>
        </div>
      </div>
      <div className="panel border-gold/30 bg-gold/5 p-5">
        <p className="eyebrow text-gold/80">Remember this</p>
        <p className="mt-2 font-display text-lg font-bold">{debrief.takeaway}</p>
      </div>
      <div className="flex items-center justify-center gap-6 font-display">
        <span className="text-red-team">
          <span className="text-xs uppercase">Red +</span>{" "}
          <span className="text-2xl font-black tabular-nums">{debrief.roundScore.red}</span>
        </span>
        <span className="text-blue-team">
          <span className="text-xs uppercase">Blue +</span>{" "}
          <span className="text-2xl font-black tabular-nums">{debrief.roundScore.blue}</span>
        </span>
      </div>
    </div>
  );
}

export function ScoreboardSquads({ squads }: { squads: PublicSquad[] }) {
  const render = (team: Team) => {
    const list = squads
      .filter((s) => s.team === team)
      .sort((a, b) => b.score - a.score);
    const c = teamClasses(team);
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <TeamCrest team={team} size="sm" />
          <p className={cn("font-display text-sm font-bold uppercase", c.text)}>
            {teamLabel(team)}
          </p>
        </div>
        <div className="space-y-1.5">
          {list.length === 0 && (
            <p className="text-xs text-paper/40">No squads yet</p>
          )}
          {list.map((s) => (
            <div
              key={s.id}
              className={cn("flex items-center justify-between rounded-lg border px-3 py-2", c.border, c.soft)}
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{s.name}</p>
                <p className="truncate text-[0.7rem] text-paper/50">
                  {s.memberNames.join(" · ") || "-"}
                </p>
              </div>
              <span className="ml-2 font-display text-lg font-black tabular-nums">{s.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {render("red")}
      {render("blue")}
    </div>
  );
}

export function FinalBlock({ final }: { final: PublicFinal }) {
  const winnerTeam = final.winner === "tie" ? null : (final.winner as Team);
  const c = teamClasses(winnerTeam);
  const checkmate = final.checkmate;
  return (
    <div className="animate-pop space-y-5 text-center">
      {checkmate?.unlocked && (
        <div className="mx-auto max-w-xl animate-pop rounded-xl2 border border-red-team/50 bg-red-team/10 p-5 shadow-glowred">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-red-team">
            ♛ Checkmate Protocol
          </p>
          <p className="mt-2 font-display text-2xl font-black text-red-team">
            The insider delivered. Red seizes the win.
          </p>
        </div>
      )}
      {final.breach?.breached && (
        <div className="mx-auto max-w-xl animate-pop rounded-xl2 border border-danger/50 bg-danger/10 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.4em] text-danger">⚠ Full breach</p>
          <p className="mt-2 font-display text-2xl font-black text-danger">
            The company fell to 100% breach. Red wins.
          </p>
        </div>
      )}
      <p className="eyebrow">Final result</p>
      {final.winner === "tie" ? (
        <h1 className="font-display text-5xl font-black text-gold">It&apos;s a draw!</h1>
      ) : (
        <h1 className={cn("font-display text-5xl font-black uppercase", c.text)}>
          {teamLabel(winnerTeam!)} wins
        </h1>
      )}
      {checkmate?.enabled && checkmate.insiderName && (
        <p className="text-sm text-paper/70">
          The Insider was{" "}
          <span className="font-display font-bold text-red-team">{checkmate.insiderName}</span>
          {checkmate.unlocked ? ", and they pulled it off." : ", Blue held the line."}
        </p>
      )}
      <div className="mx-auto flex max-w-sm items-center justify-center gap-8">
        <div className="text-red-team">
          <p className="text-xs uppercase tracking-widest">Red</p>
          <p className="font-display text-5xl font-black tabular-nums">{final.scores.red}</p>
        </div>
        <span className="font-display text-2xl text-paper/30">vs</span>
        <div className="text-blue-team">
          <p className="text-xs uppercase tracking-widest">Blue</p>
          <p className="font-display text-5xl font-black tabular-nums">{final.scores.blue}</p>
        </div>
      </div>
      {final.mvpSquad && (
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-gold">MVP Squad</span>
          <span className="font-display font-bold">{final.mvpSquad.name}</span>
          <span className="font-display font-black tabular-nums text-gold">{final.mvpSquad.score}</span>
        </div>
      )}
      <div className="panel mx-auto max-w-xl p-5 text-left">
        <p className="eyebrow">What you learned</p>
        <ul className="mt-3 space-y-2">
          {final.recap.map((r) => (
            <li key={r.round} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-gold/20 font-display text-xs font-black text-gold">
                {r.round}
              </span>
              <span className="text-paper/75">{r.takeaway}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------- Economy / Shop ----------------

export function CompanyDamageMeter({ value, compact }: { value: number; compact?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 80 ? "bg-danger" : pct >= 50 ? "bg-warn" : "bg-mint";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="eyebrow">Company breach</span>
        <span className={cn("font-mono tabular-nums", pct >= 80 ? "text-danger" : "text-paper/70")}>
          {pct}%
        </span>
      </div>
      <div className={cn("mt-1.5 w-full overflow-hidden rounded-full bg-white/10", compact ? "h-2" : "h-3")}>
        <div className={cn("h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${pct}%` }} />
      </div>
      {!compact && pct >= 80 && (
        <p className="mt-1 text-[0.7rem] text-danger">Critical, at 100% the company is fully breached (Red wins).</p>
      )}
    </div>
  );
}

export function MoneyTag({ amount, team }: { amount: number; team?: Team }) {
  const c = teamClasses(team ?? null);
  return (
    <span className={cn("inline-flex items-center gap-1 font-display font-black tabular-nums", c.text)}>
      <span className="text-gold">¤</span>
      {amount}
    </span>
  );
}

/** One team's shop board. Interactive when `canBuy` (host); read-only otherwise. */
export function ShopBoard({
  team,
  economy,
  code,
  canBuy,
  onBought,
}: {
  team: Team;
  economy: TeamEconomy;
  code: string;
  canBuy: boolean;
  onBought: () => void;
}) {
  const c = teamClasses(team);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const catalog = upgradesForTeam(team);

  async function buy(upgradeId: string) {
    setBusyId(upgradeId);
    setErr(null);
    try {
      await postAction(`/api/games/${code}/shop`, { team, upgradeId });
      onBought();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={cn("panel p-5", c.border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TeamCrest team={team} size="sm" />
          <p className={cn("font-display text-sm font-black uppercase", c.text)}>{teamLabel(team)}</p>
        </div>
        <div className="text-right">
          <MoneyTag amount={economy.money} team={team} />
          {economy.premium > 0 && (
            <p className="text-[0.65rem] text-warn">−{economy.premium}/round premium</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {catalog.map((u) => {
          const owned = economy.upgrades.includes(u.id);
          const affordable = economy.money >= u.cost;
          return (
            <div
              key={u.id}
              className={cn(
                "rounded-xl border p-3 transition",
                owned ? "border-mint/40 bg-mint/5" : "border-white/10 bg-ink-700/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold">{u.name}</p>
                    {owned && <span className="font-mono text-[0.6rem] uppercase tracking-widest text-mint">Owned</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-paper/70">{u.blurb}</p>
                  <p className="mt-0.5 text-[0.7rem] text-paper/40">{u.concept}</p>
                </div>
                <div className="shrink-0 text-right">
                  <MoneyTag amount={u.cost} />
                  {canBuy && !owned && (
                    <button
                      disabled={!affordable || busyId !== null}
                      onClick={() => buy(u.id)}
                      className={cn(
                        "mt-1 block rounded-lg px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide transition disabled:opacity-40",
                        c.bg,
                        "text-ink"
                      )}
                    >
                      {busyId === u.id ? "…" : affordable ? "Buy" : "Can't afford"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </div>
  );
}

// ---------------- Insider (player-side, secret) ----------------

/** Shown at role reveal: the private "you are the insider" briefing. */
export function InsiderRevealCard() {
  return (
    <div className="animate-pop rounded-xl2 border border-red-team/50 bg-red-team/10 p-5 shadow-glowred">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-red-team">
        ◐ Eyes only
      </p>
      <h3 className="mt-2 font-display text-2xl font-black text-red-team">
        You are the Insider
      </h3>
      <p className="mt-2 text-sm text-paper/80">
        You&apos;re on Blue, but you secretly work for Red. Blend in, do your normal
        tasks for cover, and quietly weaken Blue when the chance comes. Sabotage every
        round and you can trigger the <span className="text-red-team">Checkmate Protocol</span>.
        Tell no one.
      </p>
    </div>
  );
}

/** The insider's live objective panel during a round. */
export function InsiderPanel({
  insider,
  code,
  active,
  onActed,
}: {
  insider: InsiderView;
  code: string;
  /** true during the active phase (choice can be made) */
  active: boolean;
  onActed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function choose(choice: "sabotage" | "layLow") {
    setBusy(true);
    setErr(null);
    try {
      await postAction(`/api/games/${code}/insider`, { choice });
      onActed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl2 border border-red-team/50 bg-gradient-to-b from-red-team/12 to-ink-800/60 p-5 shadow-glowred">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-red-team">◐ Insider · Eyes only</p>
        <span className="chip border-red-team/40 bg-red-team/10 text-red-team">
          Sabotage {insider.progress}/{insider.threshold}
        </span>
      </div>

      {insider.objective ? (
        <>
          <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-widest text-paper/45">
            {insider.objective.concept}
          </p>
          <p className="mt-1 font-display text-lg font-bold leading-snug">
            {insider.objective.prompt}
          </p>

          {active ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                disabled={busy}
                onClick={() => choose("sabotage")}
                className={cn(
                  "strike h-11 rounded-xl font-display text-sm font-bold uppercase tracking-wide transition disabled:opacity-50",
                  insider.sabotagedThisRound
                    ? "bg-red-team text-white shadow-glowred"
                    : "border border-red-team/50 bg-red-team/10 text-red-team hover:bg-red-team/20"
                )}
              >
                {insider.sabotagedThisRound ? "✓ Sabotaging" : insider.objective.doLabel}
              </button>
              <button
                disabled={busy}
                onClick={() => choose("layLow")}
                className={cn(
                  "h-11 rounded-xl font-display text-sm font-bold uppercase tracking-wide transition disabled:opacity-50",
                  !insider.sabotagedThisRound
                    ? "bg-white/15 text-paper"
                    : "border border-white/15 text-paper/70 hover:bg-white/10"
                )}
              >
                {!insider.sabotagedThisRound ? "✓ Lying low" : insider.objective.layLabel}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-paper/60">
              {insider.sabotagedThisRound
                ? "You moved on this one. Stay cool, act natural."
                : "You stayed clean this round."}
            </p>
          )}
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-paper/60">No opening this round. Keep your cover.</p>
      )}
    </div>
  );
}

// ---------------- Host moderation (host-only) ----------------

export function HostModerationPanel({ moderation }: { moderation: HostModeration }) {
  if (!moderation.insiderEnabled) return null;
  const { checkmate } = moderation;
  const pct = checkmate.threshold > 0 ? (checkmate.progress / checkmate.threshold) * 100 : 0;
  return (
    <div
      className={cn(
        "panel p-5",
        checkmate.unlocked ? "border-red-team/50 shadow-glowred" : "border-red-team/25"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-team">
          ◐ Moderation · host only
        </p>
        {checkmate.unlocked && (
          <span className="chip border-red-team/50 bg-red-team/15 text-red-team">Checkmate ready</span>
        )}
      </div>
      <p className="mt-2 text-sm text-paper/70">
        Insider:{" "}
        <span className="font-display font-bold text-paper">
          {moderation.insiderName ?? "- not assigned (need 3+ Blue)"}
        </span>
      </p>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-paper/55">
          <span>Checkmate Protocol</span>
          <span className="tabular-nums">
            {checkmate.progress}/{checkmate.threshold} rounds sabotaged
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-red-team transition-[width] duration-500"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
      {moderation.rounds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {moderation.rounds.map((r) => (
            <span
              key={r.round}
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[0.65rem]",
                r.sabotaged ? "bg-red-team/20 text-red-team" : "bg-white/5 text-paper/40"
              )}
            >
              R{r.round} {r.sabotaged ? "✓" : "-"}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[0.7rem] text-paper/40">
        Visible only to you. Players never see this.
      </p>
    </div>
  );
}
