"use client";

import { useParams } from "next/navigation";
import { useGameStream } from "@/components/hooks";
import { Logo } from "@/components/ui";
import { ScoreBar, CoinFlip, Countdown, ConnIndicator, PhasePill } from "@/components/game";
import {
  MissionBrief,
  DebriefBlock,
  ScoreboardSquads,
  FinalBlock,
  ShopBoard,
  CompanyDamageMeter,
} from "@/components/panels";
import { Win } from "@/components/console";
import { SiegeBoard } from "@/components/siege";
import { ParelyItMark } from "@/components/icons";

export default function ProjectorPage() {
  const { code } = useParams<{ code: string }>();
  const { pub, status } = useGameStream(code);

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
        <div className="flex items-center gap-4">
          <Logo size="lg" />
          <span className="hidden items-center gap-2 font-mono text-sm uppercase tracking-[0.22em] text-paper/40 lg:inline-flex">
            session
            <span className="rounded-[5px] border border-white/10 bg-white/[0.03] px-2 py-0.5 tracking-[0.3em] text-paper/80">
              {code}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {pub && <PhasePill phase={pub.phase} />}
          <ConnIndicator status={status} />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-10">
        {!pub && <p className="text-center font-mono text-2xl text-paper/50">// connecting…</p>}

        {/* LOBBY, giant code */}
        {pub?.phase === "lobby" && (
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-base uppercase tracking-[0.3em] text-paper/40">// join session at /join</p>
            <p className="my-6 font-display text-[10rem] font-black leading-none tracking-[0.1em] text-gold">
              {code}
            </p>
            <div className="flex items-center gap-3 font-mono text-2xl tabular-nums text-paper/70">
              <ParelyItMark className="h-8 w-8 text-gold" />
              <span>{pub.playerCount} connected</span>
            </div>
            <div className="mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
              {pub.players.map((p) => (
                <span
                  key={p.id}
                  className="animate-pop rounded-[6px] border border-white/12 bg-white/[0.03] px-3 py-1.5 font-mono text-lg"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {pub && pub.phase !== "lobby" && (
          <div className="space-y-8">
            {pub.phase === "roleReveal" && (
              <div className="text-center">
                <p className="font-mono text-base uppercase tracking-[0.3em] text-paper/40">// roles assigned</p>
                <h1 className="mt-2 font-display text-6xl font-black">Squads, lock in</h1>
                <p className="mt-3 font-mono text-2xl text-paper/60">First round is loading.</p>
              </div>
            )}

            {pub.phase === "roundBriefing" && pub.round && (
              <div className="grid items-center gap-6 md:grid-cols-2">
                <Win title="// coin flip" bodyClass="p-8">
                  <CoinFlip initiative={pub.round.initiative} round={pub.round.number} bonus={pub.round.bonus} />
                </Win>
                <MissionBrief round={pub.round} />
              </div>
            )}

            {pub.siege &&
              (pub.phase === "roundBriefing" || pub.phase === "active" || pub.phase === "submissionLock") && (
                <SiegeBoard pub={pub.siege} mine={null} code={code} onChange={() => {}} />
              )}

            {(pub.phase === "active" || pub.phase === "submissionLock") && pub.round && (
              <div className="grid items-center gap-6 md:grid-cols-[1fr_1.2fr]">
                <Win
                  title={pub.phase === "active" ? "// time remaining" : "// status"}
                  bodyClass="p-8 text-center"
                >
                  {pub.phase === "active" ? (
                    <>
                      <div className="mx-auto max-w-xs">
                        <Countdown deadline={pub.round.deadline} totalSeconds={pub.settings.roundSeconds} big />
                      </div>
                      <p className="mt-6 font-mono text-5xl font-bold tabular-nums">
                        {pub.round.submittedCount}
                        <span className="text-paper/30">/{pub.round.expectedCount}</span>
                      </p>
                      <p className="mt-1 font-mono text-base uppercase tracking-[0.2em] text-paper/45">submissions in</p>
                    </>
                  ) : (
                    <h2 className="font-display text-5xl font-black text-gold">Locked</h2>
                  )}
                </Win>
                <MissionBrief round={pub.round} />
              </div>
            )}

            {pub.phase === "debrief" && pub.debrief && (
              <div className="mx-auto max-w-4xl">
                <DebriefBlock debrief={pub.debrief} />
              </div>
            )}

            {pub.phase === "shop" && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="font-mono text-base uppercase tracking-[0.3em] text-paper/40">// strategy phase</p>
                  <h1 className="mt-2 font-display text-5xl font-black">Teams commit their buys</h1>
                  <div className="mx-auto mt-4 max-w-xs">
                    <Countdown deadline={pub.phaseDeadline} totalSeconds={pub.settings.shopSeconds} big />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {(["red", "blue"] as const).map((t) => (
                    <ShopBoard
                      key={t}
                      team={t}
                      economy={pub.economy[t]}
                      code={code}
                      votes={pub.shopVotes[t]}
                      leaderName={pub.players.find((p) => p.id === pub.leaders[t])?.name ?? null}
                      meId={null}
                      canVote={false}
                      canBuy={false}
                      onChange={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {pub.phase === "finalResults" && pub.final && <FinalBlock final={pub.final} />}

            {/* Persistent scoreboard during play */}
            {pub.phase !== "finalResults" && (
              <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
                <Win title="// scoreboard" bodyClass="space-y-4 p-6">
                  <ScoreBar red={pub.scores.red} blue={pub.scores.blue} />
                  <CompanyDamageMeter value={pub.companyDamage} />
                </Win>
                <Win title="// squads" bodyClass="p-6">
                  <ScoreboardSquads squads={pub.squads} />
                </Win>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
