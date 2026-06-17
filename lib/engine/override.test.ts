import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  reassignPlayer,
  assignWaiting,
  seededRng,
  GameError,
} from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";

function makeStarted(n: number, seed = 3): GameState {
  let state = createGameState({ id: "g1", code: "ABCD", hostToken: "h", packId: PACK_01.id, now: 1000 });
  for (let i = 0; i < n; i++) {
    state = addPlayer(state, { id: `p${i}`, token: `t${i}`, name: `P${i}`, now: 1000 + i });
  }
  return startGame(state, PACK_01, 2000, seededRng(seed));
}

function squadOf(state: GameState, playerId: string) {
  return state.squads.find((s) => s.memberIds.includes(playerId));
}

describe("reassignPlayer", () => {
  it("moves a player to a new team, a squad on that team, and a valid role", () => {
    let state = makeStarted(12);
    const p = state.players.find((x) => x.team === "red")!;
    const blueSquad = state.squads.find((s) => s.team === "blue")!;
    state = reassignPlayer(state, p.id, { team: "blue", squadId: blueSquad.id, roleKey: "analyst" }, 3000);
    const moved = state.players.find((x) => x.id === p.id)!;
    expect(moved.team).toBe("blue");
    expect(moved.squadId).toBe(blueSquad.id);
    expect(moved.roleKey).toBe("analyst");
  });

  it("removes the player from their old squad and adds them to exactly one new squad", () => {
    let state = makeStarted(12);
    const p = state.players.find((x) => x.team === "red")!;
    const oldSquadId = p.squadId!;
    const blueSquad = state.squads.find((s) => s.team === "blue")!;
    state = reassignPlayer(state, p.id, { team: "blue", squadId: blueSquad.id }, 3000);
    const memberships = state.squads.filter((s) => s.memberIds.includes(p.id));
    expect(memberships).toHaveLength(1);
    expect(memberships[0].id).toBe(blueSquad.id);
    expect(state.squads.find((s) => s.id === oldSquadId)!.memberIds).not.toContain(p.id);
  });

  it("rejects a role that doesn't belong to the team", () => {
    const state = makeStarted(12);
    const blue = state.players.find((x) => x.team === "blue")!;
    expect(() => reassignPlayer(state, blue.id, { roleKey: "recon" }, 3000)).toThrow(/team/i);
  });

  it("rejects a squad that isn't on the target team", () => {
    const state = makeStarted(12);
    const red = state.players.find((x) => x.team === "red")!;
    const blueSquad = state.squads.find((s) => s.team === "blue")!;
    expect(() => reassignPlayer(state, red.id, { team: "red", squadId: blueSquad.id }, 3000)).toThrow(GameError);
  });

  it("dissolves the insider secret if they're moved off Blue", () => {
    let state = createGameState({ id: "g1", code: "ABCD", hostToken: "h", packId: PACK_01.id, settings: { insiderThreat: true }, now: 1000 });
    for (let i = 0; i < 10; i++) state = addPlayer(state, { id: `p${i}`, token: `t${i}`, name: `P${i}`, now: 1000 + i });
    state = startGame(state, PACK_01, 2000, seededRng(3));
    const insiderId = state.insiderPlayerId!;
    const redSquad = state.squads.find((s) => s.team === "red")!;
    state = reassignPlayer(state, insiderId, { team: "red", squadId: redSquad.id }, 3000);
    expect(state.insiderPlayerId).toBeNull();
    expect(state.players.find((p) => p.id === insiderId)!.insider).toBe(false);
  });
});

describe("assignWaiting (late joiners)", () => {
  function withLateJoiner(seed = 3) {
    let state = makeStarted(8, seed);
    // advance into a live round so late joiners are mid-game
    state = advance(state, PACK_01, 2100, seededRng(seed)); // briefing
    state = advance(state, PACK_01, 2200, seededRng(seed)); // active
    state = addPlayer(state, { id: "late", token: "lt", name: "Late", now: 2300 });
    return state;
  }

  it("late joiner starts in a waiting state", () => {
    const state = withLateJoiner();
    expect(state.players.find((p) => p.id === "late")!.status).toBe("waiting");
  });

  it("holds the late joiner for next round by default during a live round", () => {
    let state = withLateJoiner();
    state = assignWaiting(state, "late", { team: "blue" }, 2400);
    const late = state.players.find((p) => p.id === "late")!;
    expect(late.team).toBe("blue");
    expect(late.status).toBe("waiting"); // deferred — not seated this round
    expect(squadOf(state, "late")).toBeUndefined();
  });

  it("joins the current round immediately when joinNow is set", () => {
    let state = withLateJoiner();
    state = assignWaiting(state, "late", { team: "red", joinNow: true }, 2400);
    const late = state.players.find((p) => p.id === "late")!;
    expect(late.status).toBe("active");
    expect(late.team).toBe("red");
    expect(squadOf(state, "late")!.team).toBe("red");
  });

  it("a deferred late joiner is activated and seated at the next round", () => {
    let state = withLateJoiner();
    state = assignWaiting(state, "late", { team: "blue", roleKey: "responder" }, 2400);
    // lock -> debrief -> shop -> next briefing (beginRound activates waiting players)
    let guard = 0;
    while (state.phase !== "roundBriefing" || state.roundIndex !== 1) {
      state = advance(state, PACK_01, state.updatedAt + 50, seededRng(3));
      if (guard++ > 20) break;
    }
    const late = state.players.find((p) => p.id === "late")!;
    expect(late.status).toBe("active");
    expect(late.team).toBe("blue");
    expect(late.roleKey).toBe("responder");
    expect(squadOf(state, "late")).toBeDefined();
  });

  it("refuses to assign a player who isn't waiting", () => {
    const state = makeStarted(8);
    const active = state.players[0];
    expect(() => assignWaiting(state, active.id, { team: "blue" }, 3000)).toThrow(/already placed/i);
  });
});
