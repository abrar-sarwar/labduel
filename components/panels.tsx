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
import { Win } from "./console";
import { postAction } from "./hooks";
import { upgradesForTeam } from "@/lib/content/upgrades";
import type { TeamEconomy } from "@/lib/shared/types";

export function MissionBrief({ round }: { round: PublicRound }) {
  const c = teamClasses(round.initiative);
  return (
    <Win
      title={`// mission brief · r${round.number}`}
      right={
        <span className={cn("chip", c.border, c.soft, c.text)}>
          {teamLabel(round.initiative)} initiative
        </span>
      }
    >
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-gold/80">
        {round.concept}
      </p>
      <h2 className="mt-1.5 font-display text-3xl font-black leading-tight">{round.title}</h2>
      <p className="mt-3 leading-relaxed text-paper/80">{round.publicBrief}</p>
    </Win>
  );
}

export function DebriefBlock({ debrief }: { debrief: PublicDebrief }) {
  return (
    <div className="animate-rise space-y-4">
      <Win
        title={`// debrief · r${debrief.round}`}
        right={
          <span className="flex items-center gap-3 font-mono text-sm font-bold tabular-nums">
            <span className="text-red-team">R+{debrief.roundScore.red}</span>
            <span className="text-blue-team">B+{debrief.roundScore.blue}</span>
          </span>
        }
      >
        <h2 className="font-display text-2xl font-black leading-tight">{debrief.title}</h2>
        <p className="mt-2 leading-relaxed text-paper/80">{debrief.summary}</p>
      </Win>
      <div className="grid gap-4 md:grid-cols-2">
        <Win title="// red actions" className="border-red-team/30">
          <p className="text-sm leading-relaxed text-paper/75">{debrief.red}</p>
        </Win>
        <Win title="// blue actions" className="border-blue-team/30">
          <p className="text-sm leading-relaxed text-paper/75">{debrief.blue}</p>
        </Win>
      </div>
      <Win title="// key takeaway" className="border-gold/30">
        <p className="font-display text-lg font-bold leading-snug text-gold/95">{debrief.takeaway}</p>
      </Win>
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
              className={cn("flex items-center justify-between rounded-[6px] border px-3 py-2", c.border, c.soft)}
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold">{s.name}</p>
                <p className="truncate font-mono text-[0.66rem] text-paper/50">
                  {s.memberNames.join(" · ") || "-"}
                </p>
              </div>
              <span className="ml-2 font-mono text-lg font-bold tabular-nums">{s.score}</span>
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
        <div className="mx-auto max-w-xl animate-pop rounded-[var(--radius)] border border-red-team/50 bg-red-team/10 p-5 shadow-glowred">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.3em] text-red-team">
            [ checkmate protocol triggered ]
          </p>
          <p className="mt-2 font-display text-2xl font-black text-red-team">
            The insider delivered. Red seizes the win.
          </p>
        </div>
      )}
      {final.breach?.breached && (
        <div className="mx-auto max-w-xl animate-pop rounded-[var(--radius)] border border-danger/50 bg-danger/10 p-5">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.3em] text-danger">
            [ full breach · 100% ]
          </p>
          <p className="mt-2 font-display text-2xl font-black text-danger">
            The company fell to a full breach. Red wins.
          </p>
        </div>
      )}
      <p className="eyebrow">// final result</p>
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
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-[var(--radius)] border border-red-team/30 bg-red-team/[0.06] py-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-red-team">red</p>
          <p className="font-display text-5xl font-black tabular-nums">{final.scores.red}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-blue-team/30 bg-blue-team/[0.06] py-3">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-blue-team">blue</p>
          <p className="font-display text-5xl font-black tabular-nums">{final.scores.blue}</p>
        </div>
      </div>
      {final.mvpSquad && (
        <div className="mx-auto inline-flex items-center gap-2 rounded-[5px] border border-gold/30 bg-gold/10 px-3 py-1.5">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gold">mvp squad</span>
          <span className="font-display font-bold">{final.mvpSquad.name}</span>
          <span className="font-mono font-bold tabular-nums text-gold">{final.mvpSquad.score}</span>
        </div>
      )}
      <Win title="// session recap" className="mx-auto max-w-xl text-left">
        <ul className="space-y-2">
          {final.recap.map((r) => (
            <li key={r.round} className="flex gap-3 border-b border-white/5 pb-2 text-sm last:border-0 last:pb-0">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] bg-gold/20 font-mono text-xs font-bold text-gold">
                {r.round}
              </span>
              <span className="text-paper/75">{r.takeaway}</span>
            </li>
          ))}
        </ul>
      </Win>
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

/**
 * One team's shop board. Teammates upvote (`canVote`); the team leader commits the
 * buy (`canBuy`). Host/projector views are read-only with the vote tallies shown.
 */
export function ShopBoard({
  team,
  economy,
  code,
  votes,
  leaderName,
  meId,
  canVote,
  canBuy,
  onChange,
}: {
  team: Team;
  economy: TeamEconomy;
  code: string;
  votes: Record<string, string[]>;
  leaderName: string | null;
  meId: string | null;
  canVote: boolean;
  canBuy: boolean;
  onChange: () => void;
}) {
  const c = teamClasses(team);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const catalog = upgradesForTeam(team);

  async function act(body: object, id: string) {
    setBusyId(id);
    setErr(null);
    try {
      await postAction(`/api/games/${code}/shop`, body);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Win
      className={c.border}
      title={
        <span className="flex items-center gap-2">
          <span className={c.text}>// {team === "red" ? "red" : "blue"} loadout</span>
        </span>
      }
      right={
        <span className="flex items-center gap-1.5">
          <MoneyTag amount={economy.money} team={team} />
          {economy.premium > 0 && (
            <span className="font-mono text-[0.62rem] text-warn">−{economy.premium}/rd</span>
          )}
        </span>
      }
    >
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <TeamCrest team={team} size="sm" />
        <div>
          <p className={cn("font-display text-sm font-black uppercase leading-none", c.text)}>{teamLabel(team)}</p>
          <p className="mt-1 font-mono text-[0.66rem] text-paper/50">
            leader: <span className="text-paper/80">{leaderName ?? "unassigned"}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {catalog.map((u) => {
          const owned = economy.upgrades.includes(u.id);
          const affordable = economy.money >= u.cost;
          const voters = votes[u.id] ?? [];
          const iVoted = meId != null && voters.includes(meId);
          return (
            <div
              key={u.id}
              className={cn(
                "rounded-[6px] border p-3 transition",
                owned ? "border-mint/40 bg-mint/5" : "border-white/10 bg-white/[0.015]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold">{u.name}</p>
                    {owned && <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-mint">owned</span>}
                    {!owned && voters.length > 0 && (
                      <span className={cn("rounded-[4px] px-1.5 font-mono text-[0.62rem] font-bold tabular-nums", c.soft, c.text)}>
                        {voters.length} vote{voters.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-paper/70">{u.blurb}</p>
                  <p className="mt-0.5 font-mono text-[0.66rem] text-paper/40">{u.concept}</p>
                </div>
                <div className="shrink-0 space-y-1 text-right">
                  <MoneyTag amount={u.cost} />
                  {!owned && canVote && (
                    <button
                      disabled={busyId !== null}
                      onClick={() => act({ kind: "vote", upgradeId: u.id }, u.id)}
                      className={cn(
                        "block w-full rounded-[5px] border px-3 py-1.5 font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] transition",
                        iVoted ? cn(c.bg, "border-transparent text-ink") : cn(c.border, "text-paper/80 hover:bg-white/5")
                      )}
                    >
                      {iVoted ? "voted" : "vote"}
                    </button>
                  )}
                  {!owned && canBuy && (
                    <button
                      disabled={!affordable || busyId !== null}
                      onClick={() => act({ kind: "buy", team, upgradeId: u.id }, u.id)}
                      className={cn(
                        "block w-full rounded-[5px] px-3 py-1.5 font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink transition disabled:opacity-40",
                        c.bg
                      )}
                    >
                      {busyId === u.id ? "…" : affordable ? "buy" : "no funds"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {err && <p className="mt-2 font-mono text-xs text-danger">! {err}</p>}
    </Win>
  );
}

// ---------------- Insider (player-side, secret) ----------------

/** Shown at role reveal: the private "you are the insider" briefing. */
export function InsiderRevealCard() {
  return (
    <div className="animate-pop rounded-[var(--radius)] border border-red-team/50 bg-red-team/10 p-5 shadow-glowred">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-red-team">
        [ classified · eyes only ]
      </p>
      <h3 className="mt-2 font-display text-2xl font-black text-red-team">
        You are the Insider
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-paper/80">
        You&apos;re on Blue, but you secretly work for Red. Blend in, do your normal
        tasks for cover, and quietly weaken Blue when the chance comes. Sustained
        sabotage unlocks the <span className="text-red-team">Checkmate Protocol</span>.
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
    <div className="rounded-[var(--radius)] border border-red-team/50 bg-gradient-to-b from-red-team/12 to-ink-800/60 p-5 shadow-glowred">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-red-team">[ insider · eyes only ]</p>
        <span className="chip border-red-team/40 bg-red-team/10 text-red-team">
          sabotage {insider.progress}/{insider.threshold}
        </span>
      </div>

      {insider.objective ? (
        <>
          <p className="mt-3 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-paper/45">
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
                  "strike h-11 rounded-[6px] font-display text-sm font-bold uppercase tracking-wide transition disabled:opacity-50",
                  insider.sabotagedThisRound
                    ? "bg-red-team text-white shadow-glowred"
                    : "border border-red-team/50 bg-red-team/10 text-red-team hover:bg-red-team/20"
                )}
              >
                {insider.sabotagedThisRound ? "[x] sabotaging" : insider.objective.doLabel}
              </button>
              <button
                disabled={busy}
                onClick={() => choose("layLow")}
                className={cn(
                  "h-11 rounded-[6px] font-display text-sm font-bold uppercase tracking-wide transition disabled:opacity-50",
                  !insider.sabotagedThisRound
                    ? "bg-white/15 text-paper"
                    : "border border-white/15 text-paper/70 hover:bg-white/10"
                )}
              >
                {!insider.sabotagedThisRound ? "[x] lying low" : insider.objective.layLabel}
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
    <Win
      className={cn(checkmate.unlocked ? "border-red-team/50 shadow-glowred" : "border-red-team/25")}
      title={<span className="text-red-team">// moderation · host only</span>}
      right={
        checkmate.unlocked ? (
          <span className="chip border-red-team/50 bg-red-team/15 text-red-team">checkmate ready</span>
        ) : undefined
      }
    >
      <p className="text-sm text-paper/70">
        Insider:{" "}
        <span className="font-display font-bold text-paper">
          {moderation.insiderName ?? "unassigned (need 3+ Blue)"}
        </span>
      </p>
      <div className="mt-3">
        <div className="flex items-center justify-between font-mono text-[0.66rem] text-paper/55">
          <span className="uppercase tracking-[0.12em]">checkmate protocol</span>
          <span className="tabular-nums">
            {checkmate.progress}/{checkmate.threshold} sabotaged
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
                "rounded-[4px] px-2 py-0.5 font-mono text-[0.64rem] tabular-nums",
                r.sabotaged ? "bg-red-team/20 text-red-team" : "bg-white/5 text-paper/40"
              )}
            >
              r{r.round} {r.sabotaged ? "[x]" : "[ ]"}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 font-mono text-[0.64rem] text-paper/40">
        Visible only to you. Players never see this.
      </p>
    </Win>
  );
}
