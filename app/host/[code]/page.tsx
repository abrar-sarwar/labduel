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
import { Win, StatusPill } from "@/components/console";
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
            <Button variant="ghost" size="sm">Projector view</Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-5xl px-4 pt-5">
        {/* ───── LOBBY ───── */}
        {pub.phase === "lobby" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <Win
              title="// session code"
              right={<StatusPill tone="info" pulse>open</StatusPill>}
              bodyClass="flex flex-col items-center justify-center text-center p-6"
            >
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-paper/40">join at /join</p>
              <p className="my-3 font-display text-7xl font-black tracking-[0.15em] text-gold">
                {code}
              </p>
              <Button variant="outline" size="sm" onClick={copyJoin}>
                {copied ? "Copied!" : "Copy join link"}
              </Button>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
                {[
                  ["players", pub.playerCount],
                  ["rounds", pub.roundCount],
                  ["squad", pub.settings.squadSize],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[6px] border border-white/10 bg-white/[0.015] py-3">
                    <p className="font-mono text-2xl font-bold tabular-nums">{v}</p>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-paper/45">{k}</p>
                  </div>
                ))}
              </div>
            </Win>

            <Win
              title="// roster"
              right={<span className="font-mono text-xs tabular-nums text-paper/50">{pub.playerCount} joined</span>}
            >
              {pub.settings.teamMode === "auto" ? (
                <div className="flex min-h-[120px] flex-wrap content-start gap-2">
                  {pub.players.length === 0 && (
                    <p className="font-mono text-sm text-paper/40">// waiting for players…</p>
                  )}
                  {pub.players.map((p) => (
                    <span
                      key={p.id}
                      className="animate-pop rounded-[5px] border border-white/12 bg-white/[0.03] px-2.5 py-1 font-mono text-sm"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="min-h-[120px] space-y-1.5">
                  {pub.players.length === 0 && (
                    <p className="font-mono text-sm text-paper/40">// waiting for players…</p>
                  )}
                  {pub.players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-[6px] border border-white/10 bg-white/[0.015] px-3 py-1.5"
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
                              className={`rounded-[4px] px-2 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.1em] transition ${
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
                  <p className="pt-1 font-mono text-[0.66rem] text-paper/45">
                    {pub.settings.teamMode === "choose"
                      ? "Players pick their own side. You can override here."
                      : "Tap Red or Blue to assign each player."}
                  </p>
                </div>
              )}
              <div
                className={`mt-5 flex items-start justify-between gap-4 rounded-[6px] border px-4 py-3 ${
                  pub.settings.insiderThreat ? "border-red-team/40 bg-red-team/5" : "border-white/10"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-paper/90">Insider Threat</span>
                    <span className="chip border-red-team/40 bg-red-team/10 text-red-team">hidden role</span>
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
              {error && <p className="mt-3 font-mono text-xs text-danger">! {error}</p>}

              <div className="mt-4 rounded-[6px] border border-dashed border-mint/30 bg-mint/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-mint">// test harness</span>
                </div>
                <p className="mt-1 text-xs text-paper/55">
                  Inject bot players to run a full game solo. Bots auto-answer each round.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addTestPlayers(6)}>
                    + 6 bots
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addTestPlayers(12)}>
                    + 12 bots
                  </Button>
                </div>
              </div>
            </Win>
          </div>
        ) : (
          /* ───── IN-GAME ───── */
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              {pub.phase === "roundBriefing" && pub.round && (
                <Win title="// coin flip">
                  <CoinFlip initiative={pub.round.initiative} round={pub.round.number} bonus={pub.round.bonus} />
                </Win>
              )}
              {(pub.phase === "roundBriefing" || pub.phase === "active" || pub.phase === "submissionLock") &&
                pub.round && <MissionBrief round={pub.round} />}

              {pub.phase === "active" && pub.round && (
                <Win
                  title="// submissions"
                  right={<StatusPill tone="ok" pulse>live</StatusPill>}
                >
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-paper/45">received</p>
                      <p className="font-mono text-4xl font-bold tabular-nums">
                        {pub.round.submittedCount}
                        <span className="text-paper/40">/{pub.round.expectedCount}</span>
                      </p>
                    </div>
                    <div className="w-40">
                      <Countdown deadline={pub.round.deadline} totalSeconds={pub.settings.roundSeconds} />
                    </div>
                  </div>
                </Win>
              )}

              {pub.phase === "debrief" && pub.debrief && <DebriefBlock debrief={pub.debrief} />}
              {pub.phase === "finalResults" && pub.final && <FinalBlock final={pub.final} />}

              {pub.phase === "shop" && (
                <div className="space-y-4">
                  <Win
                    title="// strategy & economy"
                    right={
                      <div className="w-28 shrink-0">
                        <Countdown deadline={pub.phaseDeadline} totalSeconds={pub.settings.shopSeconds} />
                      </div>
                    }
                  >
                    <p className="text-sm leading-relaxed text-paper/60">
                      Players upvote buys on their phones. Each team&apos;s leader commits the
                      purchases. Watch the tallies, and reassign a leader below if needed.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(["red", "blue"] as const).map((t) => (
                        <label key={t} className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-paper/60">
                          <span className={t === "red" ? "text-red-team" : "text-blue-team"}>
                            {t === "red" ? "red" : "blue"} lead
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
                            className="h-8 flex-1 rounded-[5px] border border-white/12 bg-ink-800 px-2 font-sans text-paper"
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
                  </Win>
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
            <div className="space-y-4">
              <Win
                title="// host control"
                right={<StatusPill tone="info">{pub.phase}</StatusPill>}
              >
                <p className="mb-3 text-sm leading-relaxed text-paper/60">{PHASE_HINT[pub.phase]}</p>
                {na && (
                  <Button onClick={() => act(na.action)} disabled={busy} size="lg" className="w-full">
                    {na.label}
                  </Button>
                )}
                {pub.phase === "active" && (
                  <p className="mt-2 text-center font-mono text-[0.66rem] text-paper/40">
                    Locking early scores all current answers.
                  </p>
                )}
                {error && <p className="mt-3 font-mono text-xs text-danger">! {error}</p>}
              </Win>

              <Win title="// scoreboard">
                <ScoreBar red={pub.scores.red} blue={pub.scores.blue} />
                <div className="mt-4">
                  <CompanyDamageMeter value={pub.companyDamage} compact />
                </div>
              </Win>

              {moderation && <HostModerationPanel moderation={moderation} />}

              <Win title="// squads">
                <ScoreboardSquads squads={pub.squads} />
              </Win>

              <OverrideConsole pub={pub} code={code} onChange={() => {}} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
