import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  applyInsiderAction,
  setInsiderThreat,
  checkmateState,
  hostModeration,
  toPublicState,
  toPlayerView,
  seededRng,
  GameError,
} from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";

function makeGame(playerCount: number, insider: boolean): GameState {
  let state = createGameState({
    id: "g1",
    code: "ABCD",
    hostToken: "host-token",
    packId: PACK_01.id,
    settings: { insiderThreat: insider },
    now: 1000,
  });
  for (let i = 0; i < playerCount; i++) {
    state = addPlayer(state, { id: `p${i}`, token: `tok${i}`, name: `P${i}`, now: 1000 + i });
  }
  return state;
}

describe("insider assignment", () => {
  it("assigns exactly one Blue insider when enabled with enough Blue players", () => {
    const state = startGame(makeGame(10, true), PACK_01, 2000, seededRng(3));
    expect(state.insiderPlayerId).not.toBeNull();
    const insiders = state.players.filter((p) => p.insider);
    expect(insiders).toHaveLength(1);
    expect(insiders[0].team).toBe("blue");
    expect(insiders[0].id).toBe(state.insiderPlayerId);
  });

  it("assigns no insider when there are fewer than 3 Blue players", () => {
    const state = startGame(makeGame(4, true), PACK_01, 2000, seededRng(3));
    expect(state.insiderPlayerId).toBeNull();
    expect(state.players.some((p) => p.insider)).toBe(false);
  });

  it("assigns no insider when the toggle is off", () => {
    const state = startGame(makeGame(10, false), PACK_01, 2000, seededRng(3));
    expect(state.insiderPlayerId).toBeNull();
  });

  it("can only be toggled in the lobby", () => {
    let state = makeGame(10, false);
    state = setInsiderThreat(state, true, 1500);
    expect(state.settings.insiderThreat).toBe(true);
    const started = startGame(state, PACK_01, 2000, seededRng(3));
    expect(() => setInsiderThreat(started, false, 2100)).toThrow(GameError);
  });
});

describe("insider hidden-data protection", () => {
  function toActive(seed: number) {
    let state = startGame(makeGame(10, true), PACK_01, 2000, seededRng(seed));
    state = advance(state, PACK_01, 2100, seededRng(seed));
    state = advance(state, PACK_01, 2200, seededRng(seed));
    return state;
  }

  it("never reveals the insider's identity through public state", () => {
    const state = toActive(5);
    const pub = toPublicState(state, PACK_01);
    const json = JSON.stringify(pub);
    // The mode being ON is public (settings.insiderThreat) — that's fine. The
    // insider appears in the roster like everyone else; what must NOT leak is any
    // field marking WHICH player is the insider, plus the objective text.
    expect(pub.players.every((p) => !("insider" in p))).toBe(true);
    expect(json).not.toContain("false positive"); // objective text must not leak
  });

  it("never sends insider objective text to a NON-insider player", () => {
    const state = toActive(5);
    const other = state.players.find((p) => p.id !== state.insiderPlayerId && p.team === "blue")!;
    const view = toPlayerView(state, PACK_01, other.id)!;
    expect(view.insider).toBeNull();
    expect(view.you.isInsider).toBe(false);
    const json = JSON.stringify(view);
    expect(json).not.toContain("false positive"); // the r1 sabotage prompt text
  });

  it("gives the insider their own objective and progress", () => {
    const state = toActive(5);
    const view = toPlayerView(state, PACK_01, state.insiderPlayerId!)!;
    expect(view.you.isInsider).toBe(true);
    expect(view.insider).not.toBeNull();
    expect(view.insider!.objective).not.toBeNull();
    expect(view.insider!.threshold).toBe(2);
  });
});

describe("insider action + checkmate", () => {
  function active(state: GameState, seed: number) {
    state = advance(state, PACK_01, state.updatedAt + 50, seededRng(seed)); // briefing
    state = advance(state, PACK_01, state.updatedAt + 50, seededRng(seed)); // active
    return state;
  }

  it("rejects an insider action from a non-insider", () => {
    let state = active(startGame(makeGame(10, true), PACK_01, 2000, seededRng(7)), 7);
    const other = state.players.find((p) => p.id !== state.insiderPlayerId)!;
    expect(() => applyInsiderAction(state, PACK_01, other.id, "sabotage", state.updatedAt + 10)).toThrow(
      /not the insider/i
    );
  });

  it("sabotage applies a hidden Blue penalty at lock", () => {
    let state = active(startGame(makeGame(10, true), PACK_01, 2000, seededRng(7)), 7);
    const before = checkmateState(state);
    expect(before.progress).toBe(0);
    state = applyInsiderAction(state, PACK_01, state.insiderPlayerId!, "sabotage", state.updatedAt + 10);
    state = advance(state, PACK_01, state.updatedAt + 20, seededRng(7)); // lock + score
    expect(state.rounds[0].roundScore.blue).toBe(0); // no blue points earned, penalty floors at 0
    expect(checkmateState(state).progress).toBe(1);
  });

  // Advance until a target phase (robust to the Shop phase inserted between rounds).
  function advanceUntil(state: GameState, phase: string, seed: number): GameState {
    let guard = 0;
    while (state.phase !== phase && guard++ < 30) {
      state = advance(state, PACK_01, state.updatedAt + 50, seededRng(seed));
    }
    return state;
  }

  it("unlocks Checkmate and flips the win to Red when every round is sabotaged", () => {
    let state = startGame(makeGame(10, true), PACK_01, 2000, seededRng(7));
    for (let r = 0; r < 2; r++) {
      state = advanceUntil(state, "active", 7);
      state = applyInsiderAction(state, PACK_01, state.insiderPlayerId!, "sabotage", state.updatedAt + 10);
      state = advance(state, PACK_01, state.updatedAt + 20, seededRng(7)); // out of active -> lock
    }
    state = advanceUntil(state, "finalResults", 7);
    const pub = toPublicState(state, PACK_01);
    expect(pub.final!.checkmate!.unlocked).toBe(true);
    expect(pub.final!.winner).toBe("red"); // Red wins even at 0–0
    expect(pub.final!.checkmate!.insiderName).toBeTruthy();
  });

  it("does NOT unlock Checkmate if the insider lays low for a round", () => {
    let state = startGame(makeGame(10, true), PACK_01, 2000, seededRng(7));
    const choices: ("sabotage" | "layLow")[] = ["sabotage", "layLow"];
    for (let r = 0; r < 2; r++) {
      state = advanceUntil(state, "active", 7);
      state = applyInsiderAction(state, PACK_01, state.insiderPlayerId!, choices[r], state.updatedAt + 10);
      state = advance(state, PACK_01, state.updatedAt + 20, seededRng(7));
    }
    state = advanceUntil(state, "finalResults", 7);
    const pub = toPublicState(state, PACK_01);
    expect(pub.final!.checkmate!.unlocked).toBe(false);
  });

  it("host moderation reveals the insider and live progress", () => {
    const state = startGame(makeGame(10, true), PACK_01, 2000, seededRng(7));
    const mod = hostModeration(state);
    expect(mod.insiderEnabled).toBe(true);
    expect(mod.insiderPlayerId).toBe(state.insiderPlayerId);
    expect(mod.insiderName).toBeTruthy();
    expect(mod.checkmate.threshold).toBe(2);
  });
});
