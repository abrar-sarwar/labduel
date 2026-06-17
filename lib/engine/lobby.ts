// Lobby / role-reveal assignment actions for the "choose" and "host" modes.
// Pure; route layer authorizes who may call which.

import type { GameState, Team } from "../shared/types";
import { getRole } from "../shared/roles";
import { GameError } from "./round";

function bump(state: GameState, now: number): GameState {
  return { ...state, rev: state.rev + 1, updatedAt: now };
}

/** Set a player's team in the lobby (used by player self-pick and host assign). */
export function setPlayerTeam(
  state: GameState,
  playerId: string,
  team: Team,
  now: number
): GameState {
  if (state.phase !== "lobby")
    throw new GameError("bad_phase", "Teams can only be picked in the lobby");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("no_player", "Player not found");
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, team, squadId: null, roleKey: null } : p
  );
  return bump({ ...state, players }, now);
}

/** A player claims a role for their team during Role Reveal (roleMode "choose"). */
export function pickRole(
  state: GameState,
  playerId: string,
  roleKey: string,
  now: number
): GameState {
  if (state.phase !== "roleReveal")
    throw new GameError("bad_phase", "Roles can only be claimed at role reveal");
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("no_player", "Player not found");
  if (!player.team) throw new GameError("no_team", "You have no team yet");
  const role = getRole(roleKey);
  if (!role || role.team !== player.team)
    throw new GameError("bad_role", "That role isn't on your team");
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, roleKey } : p
  );
  return bump({ ...state, players }, now);
}
