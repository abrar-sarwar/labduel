// Pure constructors for game state. ID/token/code generation is injected so these
// stay deterministic and testable; the server passes crypto-backed values.

import type { GameState, GameSettings, Player } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";
import { GameError } from "./round";

export interface CreateGameParams {
  id: string;
  code: string;
  hostToken: string;
  hostName?: string;
  packId: string;
  settings?: Partial<GameSettings>;
  now: number;
}

export function createGameState(params: CreateGameParams): GameState {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...params.settings };
  return {
    id: params.id,
    code: params.code,
    hostToken: params.hostToken,
    hostName: params.hostName?.trim() || "Host",
    phase: "lobby",
    settings,
    packId: params.packId,
    players: [],
    squads: [],
    roundIndex: 0,
    rounds: [],
    scores: { red: 0, blue: 0 },
    phaseDeadline: null,
    audit: [],
    rev: 1,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

export interface AddPlayerParams {
  id: string;
  token: string;
  name: string;
  now: number;
}

export function addPlayer(state: GameState, p: AddPlayerParams): GameState {
  const name = p.name.trim();
  if (!name) throw new GameError("bad_name", "Enter a name");

  // Late joiners (after lobby) land in a waiting holding state.
  const status: Player["status"] = state.phase === "lobby" ? "active" : "waiting";

  const player: Player = {
    id: p.id,
    name,
    token: p.token,
    team: null,
    squadId: null,
    roleKey: null,
    connected: true,
    status,
    joinedAt: p.now,
  };

  return {
    ...state,
    players: [...state.players, player],
    audit: [...state.audit, { at: p.now, actor: player.id, action: "join", meta: { status } }],
    rev: state.rev + 1,
    updatedAt: p.now,
  };
}

export function setConnected(
  state: GameState,
  playerId: string,
  connected: boolean,
  now: number
): GameState {
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, connected } : p
  );
  return { ...state, players, rev: state.rev + 1, updatedAt: now };
}
