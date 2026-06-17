"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useGameStream, usePlayerView, postAction } from "@/components/hooks";
import { BLUE_ROLES, RED_ROLES } from "@/lib/shared/roles";
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
  ShopBoard,
  CompanyDamageMeter,
} from "@/components/panels";
import { Button } from "@/components/ui";

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const { pub, status } = useGameStream(code);
  const { role, view, refetch } = usePlayerView(code, pub?.rev, true);

  const lobbyAction = async (body: object) => {
    try {
      await postAction(`/api/games/${code}/lobby`, body);
      refetch();
    } catch {
      /* surfaced via state on next tick */
    }
  };

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
          <CenterMessage title="You're in, next round">
            <p>The game is mid-round. You&apos;ll be placed on a squad when the next round begins.</p>
          </CenterMessage>
        )}

        {/* LOBBY */}
        {pub.phase === "lobby" && !waiting && (
          <>
            {pub.settings.teamMode === "choose" && !you?.team ? (
              <div className="animate-rise text-center">
                <h2 className="font-display text-2xl font-black">Pick your side</h2>
                <p className="mt-1 text-sm text-paper/60">Choose where you&apos;ll fight.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => lobbyAction({ kind: "pickTeam", team: "red" })}
                    className="rounded-xl2 border border-red-team/50 bg-red-team/10 py-8 font-display text-2xl font-black uppercase text-red-team transition hover:bg-red-team/20"
                  >
                    Red
                  </button>
                  <button
                    onClick={() => lobbyAction({ kind: "pickTeam", team: "blue" })}
                    className="rounded-xl2 border border-blue-team/50 bg-blue-team/10 py-8 font-display text-2xl font-black uppercase text-blue-team transition hover:bg-blue-team/20"
                  >
                    Blue
                  </button>
                </div>
              </div>
            ) : (
              <CenterMessage title="You're in the lobby">
                {you?.team ? (
                  <p>
                    You picked <span className={c.text}>{you.team === "red" ? "Red" : "Blue"}</span>.
                    Waiting for the host to start…
                  </p>
                ) : (
                  <p>{pub.playerCount} players ready. Waiting for the host to start…</p>
                )}
                {pub.settings.teamMode === "choose" && you?.team && (
                  <button onClick={() => lobbyAction({ kind: "pickTeam", team: you.team === "red" ? "blue" : "red" })} className="mt-3 text-xs text-paper/50 underline">
                    Switch side
                  </button>
                )}
                <div className="mt-4 inline-flex animate-pulse items-center gap-2 text-gold">
                  <span className="h-2 w-2 rounded-full bg-gold" />
                  <span className="font-mono text-xs uppercase tracking-widest">Standby</span>
                </div>
              </CenterMessage>
            )}
          </>
        )}

        {/* ROLE REVEAL */}
        {pub.phase === "roleReveal" && team && !waiting && (
          <div className="animate-pop">
            {pub.settings.roleMode === "choose" && (
              <div className="mb-5">
                <p className="mb-2 text-center font-mono text-xs uppercase tracking-[0.3em] text-paper/50">
                  Claim your role
                </p>
                <div className="grid gap-2">
                  {(team === "blue" ? BLUE_ROLES : RED_ROLES).map((r) => {
                    const mine = view?.you.role?.key === r.key;
                    return (
                      <button
                        key={r.key}
                        onClick={() => lobbyAction({ kind: "pickRole", roleKey: r.key })}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition",
                          mine ? cn(c.border, c.soft) : "border-white/12 bg-ink-700/40 hover:bg-ink-700"
                        )}
                      >
                        <span className={cn("font-display font-bold", mine && c.text)}>{r.name}</span>
                        <span className="ml-2 text-xs text-paper/55">{r.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {you?.role && (
              <>
                <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.3em] text-paper/50">
                  Your role this round
                </p>
                <RoleCard role={you.role} team={team} />
              </>
            )}
            <p className="mt-4 text-center text-sm text-paper/60">
              Squad <span className={c.text}>{view?.squad?.name}</span>, your tasks
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

        {/* SHOP */}
        {pub.phase === "shop" && team && !waiting && (
          <div className="space-y-4">
            <div className="panel p-5 text-center">
              <p className="eyebrow">Strategy phase</p>
              <h2 className="mt-1 font-display text-2xl font-black">Talk it out with your team</h2>
              <p className="mt-1 text-sm text-paper/60">
                Decide what to buy together, your host enters the call. Countdown:
              </p>
              <div className="mx-auto mt-3 max-w-[180px]">
                <Countdown deadline={pub.phaseDeadline} totalSeconds={pub.settings.shopSeconds} />
              </div>
            </div>
            <div className="panel p-5">
              <CompanyDamageMeter value={pub.companyDamage} />
            </div>
            <ShopBoard team={team} economy={pub.economy[team]} code={code} canBuy={false} onBought={refetch} />
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
