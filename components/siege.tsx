"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PublicSiege, PlayerSiege } from "@/lib/shared/types";
import { LANES, getLane } from "@/lib/content/lanes";
import { RoleGlyph } from "./icons";
import { postAction } from "./hooks";

/**
 * The castle / siege board. Pre-reveal: the team leader commits a lane (Red
 * attacks one, Blue defends up to its slots); teammates watch their own pick;
 * opponents see only commit progress. Post-reveal: the matchup + outcome.
 */
export function SiegeBoard({
  pub,
  mine,
  code,
  onChange,
}: {
  pub: PublicSiege;
  mine: PlayerSiege | null;
  code: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const revealed = pub.revealed;
  const isRedLeader = !!mine && mine.team === "red" && mine.isLeader && !revealed;
  const isBlueLeader = !!mine && mine.team === "blue" && mine.isLeader && !revealed;

  const myAttack = mine?.myAttack ?? null;
  const myDefense = mine?.myDefense ?? [];

  async function send(body: object) {
    setBusy(true);
    setErr(null);
    try {
      await postAction(`/api/games/${code}/siege`, body);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function pickAttack(id: string) {
    if (!isRedLeader || busy) return;
    send({ kind: "attack", laneId: id });
  }
  function toggleDefense(id: string) {
    if (!isBlueLeader || busy) return;
    const has = myDefense.includes(id);
    const next = has ? myDefense.filter((l) => l !== id) : [...myDefense, id];
    if (!has && next.length > (mine?.defenseSlots ?? 2)) return; // slot cap
    send({ kind: "defense", laneIds: next });
  }

  return (
    <div className="win">
      <header className="win-bar">
        <span className="win-title">// siege board</span>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-paper/40">
          {revealed
            ? pub.outcome === "breach"
              ? "breach"
              : "parried"
            : `red ${pub.redCommitted ? "set" : "..."} · blue ${pub.blueDefendedCount}/${pub.defenseSlots}`}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-5">
        {LANES.map((lane) => {
          const attacked = revealed && pub.attackLane === lane.id;
          const defended = revealed && pub.defendedLanes.includes(lane.id);
          const meAttack = !revealed && myAttack === lane.id;
          const meDefend = !revealed && myDefense.includes(lane.id);
          const interactive = isRedLeader || isBlueLeader;

          return (
            <button
              key={lane.id}
              disabled={!interactive}
              onClick={() => (isRedLeader ? pickAttack(lane.id) : toggleDefense(lane.id))}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[7px] border p-2.5 text-center transition",
                interactive ? "cursor-pointer hover:bg-white/5" : "cursor-default",
                attacked && "border-red-team bg-red-team/15",
                defended && !attacked && "border-blue-team bg-blue-team/15",
                meAttack && "border-red-team bg-red-team/15",
                meDefend && "border-blue-team bg-blue-team/15",
                !attacked && !defended && !meAttack && !meDefend && "border-white/10 bg-white/[0.02]"
              )}
            >
              <RoleGlyph glyph={lane.glyph} className="h-5 w-5 text-paper/70" />
              <span className="font-mono text-[0.62rem] uppercase leading-tight tracking-wide text-paper/75">
                {lane.name}
              </span>
              {attacked && (
                <span className="font-mono text-[0.55rem] uppercase tracking-widest text-red-team">
                  {pub.outcome === "parry" ? "held" : "breached"}
                </span>
              )}
              {defended && !attacked && (
                <span className="font-mono text-[0.55rem] uppercase tracking-widest text-blue-team">
                  defended
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* leader instructions / status */}
      <div className="border-t border-white/8 px-3 py-2 text-xs text-paper/55">
        {revealed ? (
          <SiegeExplain attackLane={pub.attackLane} outcome={pub.outcome} />
        ) : isRedLeader ? (
          <span>Pick one lane to attack. Hidden from Blue until the round starts.</span>
        ) : isBlueLeader ? (
          <span>
            Defend up to {mine?.defenseSlots} lanes ({myDefense.length} chosen). Guess where Red strikes.
          </span>
        ) : mine ? (
          <span>
            Your leader is committing the {mine.team === "red" ? "attack" : "defense"}. Talk it out.
          </span>
        ) : (
          <span>Leaders are committing their moves...</span>
        )}
        {err && <span className="ml-2 text-danger">{err}</span>}
      </div>
    </div>
  );
}

function SiegeExplain({
  attackLane,
  outcome,
}: {
  attackLane: string | null;
  outcome: "breach" | "parry" | null;
}) {
  const lane = attackLane ? getLane(attackLane) : null;
  if (!lane) return null;
  return (
    <div className="space-y-1">
      <p className={cn("font-display text-sm font-bold", outcome === "breach" ? "text-red-team" : "text-blue-team")}>
        {outcome === "breach"
          ? `Breach at ${lane.name}, undefended.`
          : `Parried at ${lane.name}, Blue held the line.`}
      </p>
      <p className="text-paper/65">
        <span className="text-red-team">Red:</span> {lane.attack}
      </p>
      <p className="text-paper/65">
        <span className="text-blue-team">Blue:</span> {lane.defense}
      </p>
    </div>
  );
}
