import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  applySubmission,
  buyUpgrade,
  toPublicState,
  seededRng,
  GameError,
} from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";
import type { ClassifyTask } from "../shared/content-types";

function makeGame(n: number): GameState {
  let state = createGameState({ id: "g1", code: "ABCD", hostToken: "h", packId: PACK_01.id, now: 1000 });
  for (let i = 0; i < n; i++) {
    state = addPlayer(state, { id: `p${i}`, token: `t${i}`, name: `P${i}`, now: 1000 + i });
  }
  return state;
}

function advanceUntil(state: GameState, phase: string, seed = 1): GameState {
  let g = 0;
  while (state.phase !== phase && g++ < 30) {
    state = advance(state, PACK_01, state.updatedAt + 50, seededRng(seed));
  }
  return state;
}

describe("economy + shop", () => {
  it("starts each team with the starting budget and no damage", () => {
    const state = makeGame(8);
    expect(state.economy.red.money).toBe(600);
    expect(state.economy.blue.money).toBe(600);
    expect(state.companyDamage).toBe(0);
  });

  it("inserts a Shop phase between rounds and grants income", () => {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(1));
    state = advanceUntil(state, "shop", 1);
    expect(state.phase).toBe("shop");
    // base income of 500 (no premium yet) added to the starting 600
    expect(state.economy.red.money).toBeGreaterThanOrEqual(1100);
    expect(state.economy.blue.money).toBeGreaterThanOrEqual(1100);
  });

  it("rejects buying outside the shop phase", () => {
    const state = startGame(makeGame(8), PACK_01, 2000, seededRng(1));
    expect(() => buyUpgrade(state, "blue", "mfa", 2100)).toThrow(GameError);
  });

  it("buys an upgrade, deducts money, and records ownership", () => {
    let state = advanceUntil(startGame(makeGame(8), PACK_01, 2000, seededRng(1)), "shop", 1);
    const before = state.economy.blue.money;
    state = buyUpgrade(state, "blue", "mfa", state.updatedAt + 10);
    expect(state.economy.blue.money).toBe(before - 320);
    expect(state.economy.blue.upgrades).toContain("mfa");
    expect(state.economy.blue.nextRoundBonusPct).toBeCloseTo(0.1);
  });

  it("blocks buying the same upgrade twice and over-spending", () => {
    let state = advanceUntil(startGame(makeGame(8), PACK_01, 2000, seededRng(1)), "shop", 1);
    state = buyUpgrade(state, "blue", "mfa", state.updatedAt + 10);
    expect(() => buyUpgrade(state, "blue", "mfa", state.updatedAt + 20)).toThrow(/already/i);
    // drain the budget then try an expensive item
    state = buyUpgrade(state, "blue", "edr", state.updatedAt + 30); // 360
    state = buyUpgrade(state, "blue", "backups", state.updatedAt + 40); // 300
    // remaining ~ 1100 - 320 - 360 - 300 = 120; logging costs 240
    expect(() => buyUpgrade(state, "blue", "logging", state.updatedAt + 50)).toThrow(/not enough/i);
  });

  it("applies the next-round score bonus to that team only, then clears it", () => {
    let state = advanceUntil(startGame(makeGame(8), PACK_01, 2000, seededRng(1)), "shop", 1);
    state = buyUpgrade(state, "blue", "edr", state.updatedAt + 10); // +12%
    state = advanceUntil(state, "active", 1); // round 2 active
    const blue = state.players.find((p) => p.team === "blue" && p.roleKey === "defender")!;
    const task = PACK_01.rounds[1].sides.blue.tasks.find((t) => t.roleKey === "defender") as ClassifyTask;
    state = applySubmission(state, PACK_01, blue.id, task.id, { optionId: task.answerId }, state.rounds[1].deadline! - 1000);
    const sub = state.rounds[1].submissions.find((s) => s.playerId === blue.id)!;
    // base 100 (+tiny speed), * 1.12 bonus -> clearly above 110
    expect(sub.points).toBeGreaterThanOrEqual(112);
    state = advance(state, PACK_01, state.rounds[1].deadline! + 1, seededRng(1)); // lock -> clears bonus
    expect(state.economy.blue.nextRoundBonusPct).toBe(0);
  });

  it("insurance grants money now but adds a premium that lowers later income", () => {
    let state = advanceUntil(startGame(makeGame(8), PACK_01, 2000, seededRng(1)), "shop", 1);
    const before = state.economy.red.money;
    state = buyUpgrade(state, "red", "warchest", state.updatedAt + 10); // cost 120, +450, premium 110
    expect(state.economy.red.money).toBe(before - 120 + 450);
    expect(state.economy.red.premium).toBe(110);
  });

  it("Red 'Press the Breach' raises company damage immediately", () => {
    let state = advanceUntil(startGame(makeGame(8), PACK_01, 2000, seededRng(1)), "shop", 1);
    const before = state.companyDamage;
    state = buyUpgrade(state, "red", "breach", state.updatedAt + 10);
    expect(state.companyDamage).toBe(before + 20);
  });

  it("a full company breach (>=100) flips the final win to Red", () => {
    let state = advanceUntil(startGame(makeGame(8), PACK_01, 2000, seededRng(1)), "shop", 1);
    // Push the breach meter to the brink, then tip it over with an offensive buy.
    state = {
      ...state,
      companyDamage: 95,
      economy: { ...state.economy, red: { ...state.economy.red, money: 9999 } },
    };
    state = buyUpgrade(state, "red", "breach", state.updatedAt + 10); // +20 -> capped at 100
    expect(state.companyDamage).toBe(100);
    state = advanceUntil(state, "finalResults", 1);
    const pub = toPublicState(state, PACK_01);
    expect(pub.final!.breach.breached).toBe(true);
    expect(pub.final!.winner).toBe("red");
  });
});
