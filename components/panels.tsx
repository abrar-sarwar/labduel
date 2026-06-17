"use client";

import { cn } from "@/lib/cn";
import type { PublicDebrief, PublicFinal, PublicSquad, PublicRound, Team } from "@/lib/shared/types";
import { teamClasses, teamLabel, TeamCrest } from "./game";

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
                  {s.memberNames.join(" · ") || "—"}
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
  return (
    <div className="animate-pop space-y-5 text-center">
      <p className="eyebrow">Final result</p>
      {final.winner === "tie" ? (
        <h1 className="font-display text-5xl font-black text-gold">It&apos;s a draw!</h1>
      ) : (
        <h1 className={cn("font-display text-5xl font-black uppercase", c.text)}>
          {teamLabel(winnerTeam!)} wins
        </h1>
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
