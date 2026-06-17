"use client";

import { useParams } from "next/navigation";
import { useGameStream } from "@/components/hooks";
import { Logo } from "@/components/ui";
import { ScoreBar, CoinFlip, Countdown, ConnIndicator, PhasePill } from "@/components/game";
import { MissionBrief, DebriefBlock, ScoreboardSquads, FinalBlock } from "@/components/panels";
import { LabDuelMark } from "@/components/icons";

export default function ProjectorPage() {
  const { code } = useParams<{ code: string }>();
  const { pub, status } = useGameStream(code);

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-white/8 px-8 py-5">
        <Logo size="lg" />
        <div className="flex items-center gap-3">
          {pub && <PhasePill phase={pub.phase} />}
          <ConnIndicator status={status} />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-10">
        {!pub && <p className="text-center text-2xl text-paper/50">Connecting…</p>}

        {/* LOBBY — giant code */}
        {pub?.phase === "lobby" && (
          <div className="flex flex-col items-center text-center">
            <p className="eyebrow text-base">Join the battle at the join screen — code</p>
            <p className="my-6 font-display text-[10rem] font-black leading-none tracking-[0.1em] text-gold">
              {code}
            </p>
            <div className="flex items-center gap-3 text-2xl text-paper/70">
              <LabDuelMark className="h-8 w-8 text-gold" />
              <span>{pub.playerCount} players in the lobby</span>
            </div>
            <div className="mt-8 flex max-w-4xl flex-wrap justify-center gap-2.5">
              {pub.players.map((p) => (
                <span
                  key={p.id}
                  className="animate-pop rounded-full border border-white/12 bg-ink-700/60 px-4 py-2 text-lg"
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
                <h1 className="font-display text-6xl font-black">Roles assigned</h1>
                <p className="mt-3 text-2xl text-paper/60">Squads, lock in. The first round is coming.</p>
              </div>
            )}

            {pub.phase === "roundBriefing" && pub.round && (
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div className="panel p-10">
                  <CoinFlip initiative={pub.round.initiative} round={pub.round.number} bonus={pub.round.bonus} />
                </div>
                <MissionBrief round={pub.round} />
              </div>
            )}

            {(pub.phase === "active" || pub.phase === "submissionLock") && pub.round && (
              <div className="grid items-center gap-8 md:grid-cols-[1fr_1.2fr]">
                <div className="panel p-8 text-center">
                  {pub.phase === "active" ? (
                    <>
                      <p className="eyebrow text-base">Time remaining</p>
                      <div className="mx-auto mt-3 max-w-xs">
                        <Countdown deadline={pub.round.deadline} totalSeconds={pub.settings.roundSeconds} big />
                      </div>
                      <p className="mt-6 font-display text-5xl font-black tabular-nums">
                        {pub.round.submittedCount}
                        <span className="text-paper/30">/{pub.round.expectedCount}</span>
                      </p>
                      <p className="eyebrow mt-1 text-base">Submissions in</p>
                    </>
                  ) : (
                    <h2 className="font-display text-5xl font-black text-gold">Locked!</h2>
                  )}
                </div>
                <MissionBrief round={pub.round} />
              </div>
            )}

            {pub.phase === "debrief" && pub.debrief && (
              <div className="mx-auto max-w-4xl">
                <DebriefBlock debrief={pub.debrief} />
              </div>
            )}

            {pub.phase === "finalResults" && pub.final && <FinalBlock final={pub.final} />}

            {/* Persistent scoreboard during play */}
            {pub.phase !== "finalResults" && (
              <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
                <div className="panel p-6">
                  <ScoreBar red={pub.scores.red} blue={pub.scores.blue} />
                </div>
                <div className="panel p-6">
                  <ScoreboardSquads squads={pub.squads} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
