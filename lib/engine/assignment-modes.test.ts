import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  setPlayerTeam,
  pickRole,
  toPublicState,
  toPlayerView,
  seededRng,
  GameError,
} from "./index";
import type { GameState, GameSettings } from "../shared/types";
import { PACK_01 } from "../content/pack-01";

function make(n: number, settings: Partial<GameSettings> = {}): GameState {
  let state = createGameState({ id: "g", code: "ABCD", hostToken: "h", packId: PACK_01.id, settings, now: 1000 });
  for (let i = 0; i < n; i++) state = addPlayer(state, { id: `p${i}`, token: `t${i}`, name: `P${i}`, now: 1000 + i });
  return state;
}

describe("team mode: choose / host", () => {
  it("keeps players' picked teams and balances the rest", () => {
    let state = make(8, { teamMode: "choose" });
    // Three pick red, one picks blue, four unassigned.
    state = setPlayerTeam(state, "p0", "red", 1100);
    state = setPlayerTeam(state, "p1", "red", 1100);
    state = setPlayerTeam(state, "p2", "red", 1100);
    state = setPlayerTeam(state, "p3", "blue", 1100);
    state = startGame(state, PACK_01, 2000, seededRng(1));
    expect(state.players.find((p) => p.id === "p0")!.team).toBe("red");
    expect(state.players.find((p) => p.id === "p3")!.team).toBe("blue");
    const red = state.players.filter((p) => p.team === "red").length;
    const blue = state.players.filter((p) => p.team === "blue").length;
    expect(red + blue).toBe(8);
    expect(Math.abs(red - blue)).toBeLessThanOrEqual(2);
  });

  it("setPlayerTeam only works in the lobby", () => {
    let state = startGame(make(6, { teamMode: "host" }), PACK_01, 2000, seededRng(1));
    expect(() => setPlayerTeam(state, "p0", "red", 3000)).toThrow(GameError);
  });

  it("refuses to start if everyone is on one side", () => {
    let state = make(4, { teamMode: "choose" });
    for (let i = 0; i < 4; i++) state = setPlayerTeam(state, `p${i}`, "red", 1100);
    expect(() => startGame(state, PACK_01, 2000, seededRng(1))).toThrow(/both sides/i);
  });
});

describe("role mode: choose", () => {
  it("leaves roles unassigned at start, then players claim them", () => {
    let state = startGame(make(8, { roleMode: "choose" }), PACK_01, 2000, seededRng(1));
    expect(state.players.every((p) => p.roleKey === null)).toBe(true);
    const blue = state.players.find((p) => p.team === "blue")!;
    state = pickRole(state, blue.id, "analyst", 2100);
    expect(state.players.find((p) => p.id === blue.id)!.roleKey).toBe("analyst");
  });

  it("rejects a role that isn't on the player's team", () => {
    const state = startGame(make(8, { roleMode: "choose" }), PACK_01, 2000, seededRng(1));
    const blue = state.players.find((p) => p.team === "blue")!;
    expect(() => pickRole(state, blue.id, "recon", 2100)).toThrow(/team/i);
  });

  it("backfills unclaimed roles when the round begins", () => {
    let state = startGame(make(8, { roleMode: "choose" }), PACK_01, 2000, seededRng(1));
    state = advance(state, PACK_01, 2100, seededRng(1)); // roleReveal -> briefing, fills roles
    expect(state.players.filter((p) => p.status === "active").every((p) => p.roleKey)).toBe(true);
  });
});

describe("role mode: hidden", () => {
  function active(): GameState {
    let state = startGame(make(8, { roleMode: "hidden" }), PACK_01, 2000, seededRng(2));
    state = advance(state, PACK_01, 2100, seededRng(2));
    state = advance(state, PACK_01, 2200, seededRng(2));
    return state;
  }

  it("never exposes any role through public state", () => {
    const state = active();
    const pub = toPublicState(state, PACK_01);
    expect(pub.players.every((p) => p.roleKey === null)).toBe(true);
  });

  it("shows a player their own role but not teammates' roles", () => {
    const state = active();
    const me = state.players.find((p) => p.team === "blue" && p.roleKey)!;
    const view = toPlayerView(state, PACK_01, me.id)!;
    expect(view.you.role).not.toBeNull(); // I see mine
    const others = view.squad!.members.filter((m) => m.name !== me.name);
    expect(others.every((m) => m.roleName === null)).toBe(true); // not theirs
  });
});
