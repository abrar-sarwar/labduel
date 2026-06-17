"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PublicState, PublicPlayer, PublicSquad, Team } from "@/lib/shared/types";
import { BLUE_ROLES, RED_ROLES, getRole } from "@/lib/shared/roles";
import { teamClasses, teamLabel } from "./game";
import { postAction } from "./hooks";

const rolesFor = (t: Team) => (t === "blue" ? BLUE_ROLES : RED_ROLES);

function PlayerEditor({
  player,
  squads,
  code,
  mode,
  onDone,
  onCancel,
}: {
  player: PublicPlayer;
  squads: PublicSquad[];
  code: string;
  mode: "waiting" | "reassign";
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [team, setTeam] = useState<Team>(player.team ?? "blue");
  const squadsForTeam = squads.filter((s) => s.team === team);
  const [squadId, setSquadId] = useState<string>(
    (player.squadId && squads.find((s) => s.id === player.squadId && s.team === team)?.id) ||
      squadsForTeam[0]?.id ||
      ""
  );
  const [roleKey, setRoleKey] = useState<string>(
    player.roleKey && getRole(player.roleKey)?.team === team ? player.roleKey : rolesFor(team)[0].key
  );
  const [joinNow, setJoinNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function switchTeam(t: Team) {
    setTeam(t);
    const sq = squads.filter((s) => s.team === t);
    setSquadId(sq[0]?.id ?? "");
    setRoleKey(rolesFor(t)[0].key);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const body =
        mode === "waiting"
          ? { kind: "assignWaiting", playerId: player.id, team, squadId, roleKey, joinNow }
          : { kind: "reassign", playerId: player.id, team, squadId, roleKey };
      await postAction(`/api/games/${code}/override`, body);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const c = teamClasses(team);
  return (
    <div className="rounded-lg border border-white/10 bg-ink-700/50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold">{player.name}</span>
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-paper/40 hover:text-paper">
            ✕
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["red", "blue"] as Team[]).map((t) => {
          const tc = teamClasses(t);
          return (
            <button
              key={t}
              onClick={() => switchTeam(t)}
              className={cn(
                "rounded-lg border py-1.5 font-display text-xs font-bold uppercase transition",
                team === t ? cn(tc.bg, "border-transparent text-ink") : "border-white/15 text-paper/70 hover:bg-white/10"
              )}
            >
              {teamLabel(t)}
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={squadId}
          onChange={(e) => setSquadId(e.target.value)}
          className="h-9 rounded-lg border border-white/12 bg-ink-800 px-2 text-sm text-paper"
        >
          {squadsForTeam.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.memberNames.length})
            </option>
          ))}
        </select>
        <select
          value={roleKey}
          onChange={(e) => setRoleKey(e.target.value)}
          className="h-9 rounded-lg border border-white/12 bg-ink-800 px-2 text-sm text-paper"
        >
          {rolesFor(team).map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {mode === "waiting" && (
        <label className="mt-2 flex items-center gap-2 text-xs text-paper/70">
          <input type="checkbox" checked={joinNow} onChange={(e) => setJoinNow(e.target.checked)} />
          Join the current round now (otherwise next round)
        </label>
      )}

      {err && <p className="mt-2 text-xs text-danger">{err}</p>}

      <button
        onClick={save}
        disabled={busy || !squadId}
        className={cn(
          "strike mt-2 h-9 w-full rounded-lg font-display text-xs font-bold uppercase tracking-wide text-ink transition disabled:opacity-40",
          c.bg
        )}
      >
        {busy ? "…" : mode === "waiting" ? "Place player" : "Save changes"}
      </button>
    </div>
  );
}

function ActiveRow({
  player,
  squads,
  code,
  onChange,
}: {
  player: PublicPlayer;
  squads: PublicSquad[];
  code: string;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const c = teamClasses(player.team);
  const squad = squads.find((s) => s.id === player.squadId);
  const role = player.roleKey ? getRole(player.roleKey) : null;

  if (editing) {
    return (
      <PlayerEditor
        player={player}
        squads={squads}
        code={code}
        mode="reassign"
        onDone={() => {
          setEditing(false);
          onChange();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-ink-700/30 px-3 py-2">
      <div className="min-w-0">
        <span className="font-display text-sm font-bold">{player.name}</span>
        <span className="ml-2 text-xs text-paper/50">
          <span className={c.text}>{squad?.name ?? "-"}</span>
          {role && ` · ${role.name}`}
        </span>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-md border border-white/15 px-2 py-1 text-[0.7rem] uppercase tracking-wide text-paper/70 hover:bg-white/10"
      >
        Edit
      </button>
    </div>
  );
}

export function OverrideConsole({
  pub,
  code,
  onChange,
}: {
  pub: PublicState;
  code: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const waiting = pub.players.filter((p) => p.status === "waiting");
  const active = pub.players.filter((p) => p.status === "active" && p.team);
  const red = active.filter((p) => p.team === "red");
  const blue = active.filter((p) => p.team === "blue");

  return (
    <div className={cn("panel p-5", waiting.length > 0 && "border-warn/40")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <span className="eyebrow">Roster &amp; overrides</span>
        <span className="flex items-center gap-2 text-xs text-paper/50">
          {waiting.length > 0 && (
            <span className="rounded-full bg-warn/20 px-2 py-0.5 font-mono uppercase tracking-widest text-warn">
              {waiting.length} to place
            </span>
          )}
          <span>{open ? "Hide ▲" : "Manage ▼"}</span>
        </span>
      </button>

      {/* Late joiners always surface, even when collapsed. */}
      {waiting.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-display text-sm font-bold uppercase text-warn">Needs placement</p>
          <div className="space-y-2">
            {waiting.map((p) => (
              <PlayerEditor key={p.id} player={p} squads={pub.squads} code={code} mode="waiting" onDone={onChange} />
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {([["red", red], ["blue", blue]] as [Team, PublicPlayer[]][]).map(([team, list]) => {
            const c = teamClasses(team);
            return (
              <div key={team}>
                <p className={cn("mb-2 font-display text-xs font-bold uppercase", c.text)}>
                  {teamLabel(team)} · {list.length}
                </p>
                <div className="space-y-1.5">
                  {list.map((p) => (
                    <ActiveRow key={p.id} player={p} squads={pub.squads} code={code} onChange={onChange} />
                  ))}
                  {list.length === 0 && <p className="text-xs text-paper/40">No players</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
