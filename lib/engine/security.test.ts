import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  applySubmission,
  toPublicState,
  toPlayerView,
  seededRng,
} from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";

function makeGame(playerCount: number): GameState {
  let state = createGameState({
    id: "g1",
    code: "ABCD",
    hostToken: "host-token",
    packId: PACK_01.id,
    now: 1000,
  });
  for (let i = 0; i < playerCount; i++) {
    state = addPlayer(state, { id: `p${i}`, token: `tok${i}`, name: `P${i}`, now: 1000 + i });
  }
  return state;
}

function toActive(seed: number): GameState {
  let state = startGame(makeGame(10), PACK_01, 2000, seededRng(seed));
  state = advance(state, PACK_01, 2100, seededRng(seed));
  state = advance(state, PACK_01, 2200, seededRng(seed));
  return state;
}

describe("hidden data never leaks through the public projection", () => {
  it("public state contains no host token, player tokens, or audit", () => {
    const state = toActive(11);
    const json = JSON.stringify(toPublicState(state, PACK_01));
    expect(json).not.toContain("host-token");
    expect(json).not.toContain("tok0");
    expect(json).not.toMatch(/"token"/);
  });

  it("public state contains no task answers", () => {
    const state = toActive(11);
    const json = JSON.stringify(toPublicState(state, PACK_01));
    // The known correct option ids / answer maps must not appear.
    expect(json).not.toMatch(/"answerId"/);
    expect(json).not.toMatch(/"answer"\s*:/);
  });
});

describe("player view discloses only the player's own private data", () => {
  it("a player only receives tasks for their own role and side", () => {
    const state = toActive(13);
    const player = state.players.find((p) => p.team === "blue" && p.roleKey === "analyst")!;
    const view = toPlayerView(state, PACK_01, player.id)!;
    for (const t of view.tasks) {
      expect(t.task.roleKey).toBe("analyst");
    }
    // none of the red side's task ids appear
    const json = JSON.stringify(view.tasks);
    expect(json).not.toContain("r1-r-");
  });

  it("player tasks never include the answer key", () => {
    const state = toActive(13);
    const player = state.players[0];
    const view = toPlayerView(state, PACK_01, player.id)!;
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/"answerId"/);
    expect(json).not.toMatch(/"answer"\s*:/);
  });

  it("does not reveal correctness while the round is still active", () => {
    let state = toActive(13);
    const p = state.players.find((x) => x.team === "blue" && x.roleKey === "defender")!;
    const task = PACK_01.rounds[0].sides.blue.tasks.find((t) => t.roleKey === "defender")!;
    state = applySubmission(state, PACK_01, p.id, task.id, { optionId: "a" }, 2250);
    const view = toPlayerView(state, PACK_01, p.id)!;
    const tv = view.tasks.find((t) => t.task.id === task.id)!;
    expect(tv.submitted).toBe(true);
    expect(tv.correct).toBeNull(); // hidden until lock
  });
});

describe("late joiners", () => {
  it("land in a waiting state after the game has started", () => {
    let state = startGame(makeGame(6), PACK_01, 2000, seededRng(1));
    state = addPlayer(state, { id: "late", token: "lt", name: "Late", now: 2500 });
    const late = state.players.find((p) => p.id === "late")!;
    expect(late.status).toBe("waiting");
    expect(late.team).toBeNull();
    // and the public projection reports them as waiting, not on a team
    const pub = toPublicState(state, PACK_01);
    expect(pub.waitingCount).toBe(1);
  });
});
