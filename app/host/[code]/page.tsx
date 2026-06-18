"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGameStream, usePlayerView, postAction } from "@/components/hooks";
import { LiveBar, CenterMessage } from "@/components/liveframe";
import { ScoreBar, CoinFlip, Countdown } from "@/components/game";
import {
  MissionBrief,
  DebriefBlock,
  ScoreboardSquads,
  FinalBlock,
  HostModerationPanel,
  ShopBoard,
  CompanyDamageMeter,
} from "@/components/panels";
import { OverrideConsole } from "@/components/override";
import { Button, Toggle } from "@/components/ui";
import type { Phase, PublicState } from "@/lib/shared/types";

function nextAction(pub: PublicState): { label: string; action: "start" | "advance" } | null {
  const last = pub.roundIndex + 1 >= pub.roundCount;
  switch (pub.phase) {
    case "lobby":
      return { label: "Start game", action: "start" };
    case "roleReveal":
      return { label: "Brief Round 1", action: "advance" };
    case "roundBriefing":
      return { label: `Start Round ${pub.round?.number ?? ""}`, action: "advance" };
    case "active":
      return { label: "Lock submissions & score", action: "advance" };
    case "submissionLock":
      return { label: "Show debrief", action: "advance" };
    case "debrief":
      return { label: last ? "Final results" : "Open strategy shop", action: "advance" };
    case "shop":
      return { label: `Start Round ${pub.roundIndex + 2}`, action: "advance" };
    default:
      return null;
  }
}

const PHASE_HINT: Record<Phase, string> = {
  lobby: "Players are joining. Start when everyone's in.",
  roleReveal: "Players see their roles. Give them a moment, then brief the round.",
  roundBriefing: "Coin flip is in. Start the round when the room is ready.",
  active: "Squads are working. Watch submissions roll in, or lock early.",
  submissionLock: "Locked and scored. Reveal the debrief.",
  shop: "Teams discuss and spend. Enter their picks, then start the next round.",
  debrief: "Talk through it, then move on.",
  finalResults: "Game over. Recap the learning.",
};

export default function HostPage() {
  const { code } = useParams<{ code: string }>();
  const { pub, status } = useGameStream(code);
  const { role, moderation } = usePlayerView(code, pub?.rev);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!pub) {
    return <CenterMessage title="Loading dashboard…" />;
  }
  if (role !== "host" && role !== "loading") {
    return (
      <main className="px-5">
        <CenterMessage title="Host access only">
          <Link href="/create" className="text-gold underline">Create a new game →</Link>
        </CenterMessage>
      </main>
    );
  }

  const na = nextAction(pub);
  const canStart = pub.phase !== "lobby" || pub.players.filter((p) => p.status === "active").length >= 2;

  async function act(
    action: "start" | "advance" | "forceLock" | "enableInsider" | "disableInsider"
  ) {
    setBusy(true);
    setError(null);
    try {
      await postAction(`/api/games/${code}/host`, { action });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function addTestPlayers(count: number) {
    try {
      await postAction(`/api/games/${code}/test`, { kind: "addBots", count });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add test players");
    }
  }

  async function lobbySetTeam(playerId: string, team: "red" | "blue") {
    try {
      await postAction(`/api/games/${code}/lobby`, { kind: "setTeam", playerId, team });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not assign team");
    }
  }

  function copyJoin() {
    const url = `${window.location.origin}/join?code=${code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="pb-28">
      <LiveBar
        code={code}
        phase={pub.phase}
        status={status}
        right={
          <Link href={`/projector/${code}`} target="_blank" className="hidden sm:block">
            <Button variant="ghost" size="sm">Projector ↗</Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-5xl px-4 pt-5">
        {/* ───── LOBBY ───── */}
        {pub.phase === "lobby" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="panel flex flex-col items-center justify-center p-8 text-center">
              <p className="eyebrow">Room code, go to /join</p>
              <p className="my-3 font-display text-7xl font-black tracking-[0.15em] text-gold">
                {code}
              </p>
              <Button variant="outline" size="sm" onClick={copyJoin}>
                {copied ? "Copied!" : "Copy join link"}
              </Button>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
                {[
                  ["Players", pub.playerCount],
                  ["Rounds", pub.roundCount],
                  ["Squad size", pub.settings.squadSize],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-white/10 bg-ink-700/40 py-3">
                    <p className="font-display text-2xl font-black tabular-nums">{v}</p>
                    <p className="text-[0.65rem] uppercase tracking-widest text-paper/50">{k}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow">In the lobby</p>
                <span className="font-mono text-xs text-paper/50">{pub.playerCount} joined</span>
              </div>
              {pub.settings.teamMode === "auto" ? (
                <div className="mt-4 flex min-h-[120px] flex-wrap content-start gap-2">
                  {pub.players.length === 0 && (
                    <p className="text-sm text-paper/40">Waiting for players to join…</p>
                  )}
                  {pub.players.map((p) => (
                    <span
                      key={p.id}
                      className="animate-pop rounded-full border border-white/12 bg-ink-700/60 px-3 py-1.5 text-sm"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-4 min-h-[120px] space-y-1.5">
                  {pub.players.length === 0 && (
                    <p className="text-sm text-paper/40">Waiting for players to join…</p>
                  )}
                  {pub.players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-ink-700/40 px-3 py-1.5"
                    >
                      <span className="text-sm">{p.name}</span>
                      <div className="flex gap-1">
                        {(["red", "blue"] as const).map((t) => {
                          const on = p.team === t;
                          const tc = t === "red" ? "bg-red-team text-white" : "bg-blue-team text-white";
                          return (
                            <button
                              key={t}
                              onClick={() => lobbySetTeam(p.id, t)}
                              className={`rounded-md px-2 py-1 font-display text-[0.65rem] font-bold uppercase transition ${
                                on ? tc : "border border-white/15 text-paper/50 hover:bg-white/10"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-paper/45">
                    {pub.settings.teamMode === "choose"
                      ? "Players pick their own side; you can override here."
                      : "Tap Red or Blue to assign each player."}
                  </p>
                </div>
              )}
              <div
                className={`mt-5 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 ${
                  pub.settings.insiderThreat ? "border-red-team/40 bg-red-team/5" : "border-white/10"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-paper/90">Insider Threat</span>
                    <span className="chip border-red-team/40 bg-red-team/10 text-red-team">Hidden role</span>
                  </div>
                  <p className="mt-1 text-xs text-paper/55">
                    Secretly turns one Blue player against their team. Needs 3+ Blue.
                  </p>
                </div>
                <Toggle
                  checked={pub.settings.insiderThreat}
                  disabled={busy}
                  onChange={(v) => act(v ? "enableInsider" : "disableInsider")}
                  label="Insider Threat"
                />
              </div>
              <Button
                onClick={() => act("start")}
                disabled={busy || !canStart}
                size="lg"
                className="mt-4 w-full"
              >
                {canStart ? "Start game" : "Need at least 2 players"}
              </Button>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}

              <div className="mt-4 rounded-xl border border-dashed border-mint/30 bg-mint/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-bold text-mint">Test mode</p>
                    <p className="text-xs text-paper/55">
                      Add bot players so you can run the whole game solo. They auto-answer each round.
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addTestPlayers(6)}>
                    + 6 bots
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addTestPlayers(12)}>
                    + 12 bots
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ───── IN-GAME ───── */
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              {pub.phase === "roundBriefing" && pub.round && (
                <div className="panel p-6">
                  <CoinFlip initiative={pub.round.initiative} round={pub.round.number} bonus={pub.round.bonus} />
                </div>
              )}
              {(pub.phase === "roundBriefing" || pub.phase === "active" || pub.phase === "submissionLock") &&
                pub.round && <MissionBrief round={pub.round} />}

              {pub.phase === "active" && pub.round && (
                <div className="panel p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="eyebrow">Submissions in</p>
                      <p className="font-display text-4xl font-black tabular-nums">
                        {pub.round.submittedCount}
                        <span className="text-paper/40">/{pub.round.expectedCount}</span>
                      </p>
                    </div>
                    <div className="w-40">
                      <Countdown deadline={pub.round.deadline} totalSeconds={pub.settings.roundSeconds} />
                    </div>
                  </div>
                </div>
              )}

              {pub.phase === "debrief" && pub.debrief && <DebriefBlock debrief={pub.debrief} />}
              {pub.phase === "finalResults" && pub.final && <FinalBlock final={pub.final} />}

              {pub.phase === "shop" && (
                <div className="space-y-4">
                  <div className="panel p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="eyebrow">Strategy &amp; economy</p>
                        <h2 className="font-display text-2xl font-black">Teams vote, leaders buy</h2>
                        <p className="mt-1 text-sm text-paper/60">
                          Players upvote on their phones; each team&apos;s leader commits the buys.
                          You just watch the tallies, and can swap a leader below if needed.
                        </p>
                      </div>
                      <div className="w-32 shrink-0">
                        <Countdown deadline={pub.phaseDeadline} totalSeconds={pub.settings.shopSeconds} />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(["red", "blue"] as const).map((t) => (
                        <label key={t} className="flex items-center gap-2 text-xs text-paper/60">
                          <span className={t === "red" ? "text-red-team" : "text-blue-team"}>
                            {t === "red" ? "Red" : "Blue"} leader
                          </span>
                          <select
                            value={pub.leaders[t] ?? ""}
                            onChange={(e) =>
                              postAction(`/api/games/${code}/override`, {
                                kind: "setLeader",
                                team: t,
                                playerId: e.target.value,
                              }).catch(() => {})
                            }
                            className="h-8 flex-1 rounded-lg border border-white/12 bg-ink-800 px-2 text-paper"
                          >
                            <option value="" disabled>
                              none
                            </option>
                            {pub.players
                              .filter((p) => p.team === t && p.status === "active")
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
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

              {pub.phase === "roleReveal" && (
                <CenterMessage title="Roles revealed">
                  <p>Every player can see their role and squad. Brief the round when ready.</p>
                </CenterMessage>
              )}
            </div>

            {/* Right rail: control + scores + roster */}
            <div className="space-y-5">
              <div className="panel p-5">
                <p className="eyebrow">Host control</p>
                <p className="mt-1 mb-3 text-sm text-paper/60">{PHASE_HINT[pub.phase]}</p>
                {na && (
                  <Button onClick={() => act(na.action)} disabled={busy} size="lg" className="w-full">
                    {na.label}
                  </Button>
                )}
                {pub.phase === "active" && (
                  <p className="mt-2 text-center text-xs text-paper/40">
                    Locking early scores everyone&apos;s current answers.
                  </p>
                )}
                {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              </div>

              <div className="panel p-5">
                <ScoreBar red={pub.scores.red} blue={pub.scores.blue} />
                <div className="mt-4">
                  <CompanyDamageMeter value={pub.companyDamage} compact />
                </div>
              </div>

              {moderation && <HostModerationPanel moderation={moderation} />}

              <div className="panel p-5">
                <p className="eyebrow mb-3">Squads</p>
                <ScoreboardSquads squads={pub.squads} />
              </div>

              <OverrideConsole pub={pub} code={code} onChange={() => {}} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
