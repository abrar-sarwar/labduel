import { describe, it, expect } from "vitest";
import { createGameState, addBots, startGame, advance, botsAutoSubmit, botsAutoVote, seededRng } from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";

describe("test bots", () => {
  it("adds bot players that get assigned at start", () => {
    let state = createGameState({ id: "g", code: "ABCD", hostToken: "h", packId: PACK_01.id, now: 1000 });
    state = addBots(state, 8, 1000);
    expect(state.players.filter((p) => p.isBot)).toHaveLength(8);
    state = startGame(state, PACK_01, 2000, seededRng(1));
    expect(state.players.every((p) => p.team && p.squadId)).toBe(true);
  });

  it("auto-answers the active round so scores move", () => {
    let state = createGameState({ id: "g", code: "ABCD", hostToken: "h", packId: PACK_01.id, now: 1000 });
    state = addBots(state, 8, 1000);
    state = startGame(state, PACK_01, 2000, seededRng(1));
    state = advance(state, PACK_01, 2100, seededRng(1)); // briefing
    state = advance(state, PACK_01, 2200, seededRng(1)); // active
    state = botsAutoSubmit(state, PACK_01, 2250, seededRng(1));
    expect(state.rounds[0].submissions.length).toBeGreaterThan(0);
    state = advance(state, PACK_01, 2300, seededRng(1)); // lock + score
    expect(state.scores.red + state.scores.blue).toBeGreaterThan(0);
  });

  it("casts shop upvotes so the leader has tallies to read", () => {
    let state: GameState = createGameState({ id: "g", code: "ABCD", hostToken: "h", packId: PACK_01.id, now: 1000 });
    state = addBots(state, 8, 1000);
    state = startGame(state, PACK_01, 2000, seededRng(1));
    let g = 0;
    while (state.phase !== "shop" && g++ < 20) state = advance(state, PACK_01, state.updatedAt + 50, seededRng(1));
    state = botsAutoVote(state, state.updatedAt + 10, seededRng(1));
    const totalVotes =
      Object.values(state.shopVotes.red).flat().length + Object.values(state.shopVotes.blue).flat().length;
    expect(totalVotes).toBeGreaterThan(0);
  });
});
