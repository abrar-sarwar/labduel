"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useGameStream, usePlayerView } from "@/components/hooks";
import { LiveBar, CenterMessage } from "@/components/liveframe";
import {
  RoleCard,
  CoinFlip,
  Countdown,
  TeamTag,
  teamClasses,
} from "@/components/game";
import { TaskCard } from "@/components/tasks";
import {
  DebriefBlock,
  FinalBlock,
  InsiderPanel,
  InsiderRevealCard,
} from "@/components/panels";
import { Button } from "@/components/ui";

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const { pub, status } = useGameStream(code);
  const { role, view, refetch } = usePlayerView(code, pub?.rev);

  if (!pub) {
    return (
      <main>
        <CenterMessage title="Joining the room…">
          <p>Hang tight.</p>
        </CenterMessage>
      </main>
    );
  }

  if (role === "host") {
    return (
      <main className="px-5">
        <CenterMessage title="You're the host here">
          <Link href={`/host/${code}`} className="text-gold underline">
            Go to your host dashboard →
          </Link>
        </CenterMessage>
      </main>
    );
  }

  if (role === "none") {
    return (
      <main className="px-5">
        <CenterMessage title="You're not in this game">
          <Link href={`/join?code=${code}`} className="text-gold underline">
            Join with code {code} →
          </Link>
        </CenterMessage>
      </main>
    );
  }

  const you = view?.you;
  const team = you?.team ?? null;
  const c = teamClasses(team);
  const waiting = you?.status === "waiting";

  return (
    <main className="pb-28">
      <LiveBar
        code={code}
        phase={pub.phase}
        status={status}
        right={team && <TeamTag team={team} />}
      />

      <div className="mx-auto max-w-2xl px-4 pt-5">
        {/* Identity strip */}
        {you && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2.5">
            <span className="font-display font-bold">{you.name}</span>
            <span className="flex items-center gap-2 text-sm text-paper/60">
              {view?.squad?.name && <span className={c.text}>{view.squad.name}</span>}
              {you.role && <span>· {you.role.name}</span>}
            </span>
          </div>
        )}

        {waiting && (
          <CenterMessage title="You're in — next round">
            <p>The game is mid-round. You&apos;ll be placed on a squad when the next round begins.</p>
          </CenterMessage>
        )}

        {/* LOBBY */}
        {pub.phase === "lobby" && !waiting && (
          <CenterMessage title="You're in the lobby">
            <p>{pub.playerCount} players ready. Waiting for the host to start…</p>
            <div className="mt-4 inline-flex animate-pulse items-center gap-2 text-gold">
              <span className="h-2 w-2 rounded-full bg-gold" />
              <span className="font-mono text-xs uppercase tracking-widest">Standby</span>
            </div>
          </CenterMessage>
        )}

        {/* ROLE REVEAL */}
        {pub.phase === "roleReveal" && you?.role && team && !waiting && (
          <div className="animate-pop">
            <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.3em] text-paper/50">
              Your role this round
            </p>
            <RoleCard role={you.role} team={team} />
            <p className="mt-4 text-center text-sm text-paper/60">
              Squad <span className={c.text}>{view?.squad?.name}</span> — your tasks
              connect with your teammates&apos;. Get ready.
            </p>
            {view?.you.isInsider && (
              <div className="mt-5">
                <InsiderRevealCard />
              </div>
            )}
          </div>
        )}

        {/* BRIEFING */}
        {pub.phase === "roundBriefing" && pub.round && !waiting && (
          <div className="space-y-6">
            <CoinFlip
              initiative={pub.round.initiative}
              round={pub.round.number}
              bonus={pub.round.bonus}
            />
            <div className="panel p-5 text-center">
              <p className="eyebrow">Round {pub.round.number} · {pub.round.title}</p>
              {view?.round?.framing && (
                <p className="mt-2 font-display text-lg font-bold">{view.round.framing}</p>
              )}
              <p className="mt-3 text-sm text-paper/70">{pub.round.publicBrief}</p>
            </div>
          </div>
        )}

        {/* ACTIVE */}
        {pub.phase === "active" && pub.round && !waiting && (
          <div className="space-y-4">
            <div className="panel sticky top-[60px] z-10 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow truncate">{view?.round?.framing}</p>
                  <p className="font-display text-lg font-black">{pub.round.title}</p>
                </div>
                <div className="w-32 shrink-0">
                  <Countdown deadline={pub.round.deadline} totalSeconds={pub.settings.roundSeconds} />
                </div>
              </div>
            </div>
            {view?.insider && (
              <InsiderPanel insider={view.insider} code={code} active onActed={refetch} />
            )}
            {view?.tasks?.length ? (
              view.tasks.map((t) => (
                <TaskCard
                  key={t.task.id}
                  item={t}
                  code={code}
                  team={team!}
                  locked={false}
                  onSubmitted={refetch}
                />
              ))
            ) : (
              <p className="text-center text-paper/50">No tasks assigned this round.</p>
            )}
          </div>
        )}

        {/* LOCKED */}
        {pub.phase === "submissionLock" && !waiting && (
          <div className="space-y-4">
            <CenterMessage title="Time! Submissions locked">
              <p>Scoring now…</p>
            </CenterMessage>
            {view?.insider && (
              <InsiderPanel insider={view.insider} code={code} active={false} onActed={refetch} />
            )}
            {view?.tasks?.map((t) => (
              <TaskCard key={t.task.id} item={t} code={code} team={team!} locked onSubmitted={refetch} />
            ))}
          </div>
        )}

        {/* DEBRIEF */}
        {pub.phase === "debrief" && view?.debrief && (
          <div className="space-y-5">
            <DebriefBlock debrief={view.debrief} />
            {view.tasks?.length > 0 && (
              <div className="space-y-3">
                <p className="eyebrow text-center">Your results</p>
                {view.tasks.map((t) => (
                  <TaskCard key={t.task.id} item={t} code={code} team={team!} locked onSubmitted={refetch} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* FINAL */}
        {pub.phase === "finalResults" && pub.final && (
          <div className="space-y-6">
            <FinalBlock final={pub.final} />
            <div className="text-center">
              <Link href="/">
                <Button variant="outline">Back to home</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
