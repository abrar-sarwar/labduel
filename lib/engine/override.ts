// Host override console — manual team/squad/role reassignment and late-joiner
// placement, so a host can fix messy real-room situations without restarting.
// All pure; host authorization is enforced at the route layer.

import type { GameState, Player, Squad, Team } from "../shared/types";
import { getRole, rolesForTeam } from "../shared/roles";
import { GameError } from "./round";

function bump(state: GameState, now: number): GameState {
  return { ...state, rev: state.rev + 1, updatedAt: now };
}

function audit(state: GameState, action: string, meta: Record<string, unknown>): GameState {
  return { ...state, audit: [...state.audit, { at: state.updatedAt, actor: "host", action, meta }] };
}

/** Remove a player from every squad, then add to one target squad (delta-only). */
function reseat(squads: Squad[], playerId: string, targetSquadId: string | null): Squad[] {
  return squads.map((s) => {
    const without = s.memberIds.filter((id) => id !== playerId);
    if (s.id === targetSquadId && !without.includes(playerId)) {
      return { ...s, memberIds: [...without, playerId] };
    }
    return without.length === s.memberIds.length ? s : { ...s, memberIds: without };
  });
}

function smallestSquad(squads: Squad[], team: Team): Squad | undefined {
  return squads
    .filter((s) => s.team === team)
    .sort((a, b) => a.memberIds.length - b.memberIds.length)[0];
}

function validateRole(roleKey: string, team: Team): void {
  const role = getRole(roleKey);
  if (!role || role.team !== team)
    throw new GameError("bad_role", "That role doesn't belong to that team");
}

export interface ReassignPatch {
  team?: Team;
  squadId?: string;
  roleKey?: string;
}

/** Move an already-placed player to a different team / squad / role. */
export function reassignPlayer(
  state: GameState,
  playerId: string,
  patch: ReassignPatch,
  now: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("no_player", "Player not found");

  const team = patch.team ?? player.team;
  if (!team) throw new GameError("no_team", "Pick a team for this player");

  // Squad: explicit, else keep current if it's on the team, else smallest on team.
  let squadId = patch.squadId ?? null;
  if (!squadId) {
    const current = state.squads.find((s) => s.id === player.squadId);
    squadId = current && current.team === team ? current.id : smallestSquad(state.squads, team)?.id ?? null;
  }
  const squad = state.squads.find((s) => s.id === squadId);
  if (!squad) throw new GameError("no_squad", "No squad available on that team");
  if (squad.team !== team) throw new GameError("bad_squad", "That squad isn't on that team");

  // Role: explicit, else keep if valid for team, else first role of the team.
  let roleKey = patch.roleKey ?? null;
  if (!roleKey) {
    roleKey = player.roleKey && getRole(player.roleKey)?.team === team ? player.roleKey : rolesForTeam(team)[0].key;
  }
  validateRole(roleKey, team);

  // The insider must be Blue — moving them to Red dissolves the secret role.
  const losesInsider = player.insider && team !== "blue";

  const players = state.players.map((p) =>
    p.id === playerId
      ? { ...p, team, squadId: squad.id, roleKey, status: "active" as const, insider: losesInsider ? false : p.insider }
      : p
  );
  let next: GameState = {
    ...state,
    players,
    squads: reseat(state.squads, playerId, squad.id),
    insiderPlayerId: losesInsider ? null : state.insiderPlayerId,
  };
  next = audit(next, "reassign", { playerId, team, squadId: squad.id, roleKey });
  return bump(next, now);
}

export interface AssignWaitingOpts {
  team: Team;
  squadId?: string;
  roleKey?: string;
  /** Join the current round immediately; otherwise wait for the next round. */
  joinNow?: boolean;
}

/** Place a late joiner (a `waiting` player) onto a team/squad/role. */
export function assignWaiting(
  state: GameState,
  playerId: string,
  opts: AssignWaitingOpts,
  now: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("no_player", "Player not found");
  if (player.status !== "waiting")
    throw new GameError("not_waiting", "That player is already placed");

  const squad =
    (opts.squadId && state.squads.find((s) => s.id === opts.squadId)) ||
    smallestSquad(state.squads, opts.team);
  if (!squad) throw new GameError("no_squad", "No squad available on that team");
  if (squad.team !== opts.team) throw new GameError("bad_squad", "That squad isn't on that team");

  const roleKey =
    opts.roleKey ?? rolesForTeam(opts.team)[squad.memberIds.length % rolesForTeam(opts.team).length].key;
  validateRole(roleKey, opts.team);

  // If a round is live and the host didn't say "join now", hold them for the next
  // round (status stays "waiting"; placeWaitingPlayers activates them at beginRound).
  const roundLive = state.phase === "active" || state.phase === "submissionLock";
  const joinNow = opts.joinNow === true || !roundLive;

  const players = state.players.map((p) =>
    p.id === playerId
      ? { ...p, team: opts.team, squadId: squad.id, roleKey, status: joinNow ? ("active" as const) : ("waiting" as const) }
      : p
  );
  // Only seat them in the squad if they're joining now; otherwise beginRound seats them.
  const squads = joinNow ? reseat(state.squads, playerId, squad.id) : state.squads;

  let next: GameState = { ...state, players, squads };
  next = audit(next, "assignWaiting", { playerId, team: opts.team, squadId: squad.id, roleKey, joinNow });
  return bump(next, now);
}
