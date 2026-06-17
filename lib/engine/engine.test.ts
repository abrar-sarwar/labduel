import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  forceLock,
  applySubmission,
  scoreSubmission,
  validateAnswer,
  seededRng,
  GameError,
} from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";
import type { ClassifyTask, MatchTask } from "../shared/content-types";

function makeGame(playerCount: number): GameState {
  let state = createGameState({
    id: "g1",
    code: "ABCD",
    hostToken: "host-token",
    packId: PACK_01.id,
    now: 1000,
  });
  for (let i = 0; i < playerCount; i++) {
    state = addPlayer(state, {
      id: `p${i}`,
      token: `tok${i}`,
      name: `Player ${i}`,
      now: 1000 + i,
    });
  }
  return state;
}

describe("assignment", () => {
  it("splits players into red and blue with balanced sizes", () => {
    let state = makeGame(20);
    state = startGame(state, PACK_01, 2000, seededRng(1));
    const red = state.players.filter((p) => p.team === "red");
    const blue = state.players.filter((p) => p.team === "blue");
    expect(red.length + blue.length).toBe(20);
    expect(Math.abs(red.length - blue.length)).toBeLessThanOrEqual(1);
  });

  it("places every active player into a squad and a role", () => {
    let state = makeGame(18);
    state = startGame(state, PACK_01, 2000, seededRng(7));
    for (const p of state.players) {
      expect(p.team).not.toBeNull();
      expect(p.squadId).not.toBeNull();
      expect(p.roleKey).not.toBeNull();
    }
    expect(state.squads.length).toBeGreaterThan(0);
  });

  it("refuses to start with fewer than 2 players", () => {
    const state = makeGame(1);
    expect(() => startGame(state, PACK_01, 2000, seededRng(1))).toThrow(GameError);
  });
});

describe("coin flip initiative", () => {
  it("is deterministic for a given seed", () => {
    let a = startGame(makeGame(6), PACK_01, 2000, seededRng(42));
    a = advance(a, PACK_01, 2100, seededRng(42)); // roleReveal -> briefing (flips)
    let b = startGame(makeGame(6), PACK_01, 2000, seededRng(42));
    b = advance(b, PACK_01, 2100, seededRng(42));
    expect(a.rounds[0].initiative).toBe(b.rounds[0].initiative);
    expect(["red", "blue"]).toContain(a.rounds[0].initiative);
  });
});

describe("scoring (accuracy-first)", () => {
  const task = PACK_01.rounds[0].sides.blue.tasks[0]; // classify, 100 pts
  const roundMs = 90_000;

  it("gives zero for a wrong answer no matter how fast", () => {
    const pts = scoreSubmission({
      task,
      correct: false,
      msRemaining: roundMs,
      roundMs,
      hasInitiative: true,
      initiativeBonus: 1.25,
    });
    expect(pts).toBe(0);
  });

  it("a correct slow answer beats a wrong fast answer", () => {
    const slowRight = scoreSubmission({
      task,
      correct: true,
      msRemaining: 0,
      roundMs,
      hasInitiative: false,
      initiativeBonus: 1.25,
    });
    const fastWrong = scoreSubmission({
      task,
      correct: false,
      msRemaining: roundMs,
      roundMs,
      hasInitiative: true,
      initiativeBonus: 1.25,
    });
    expect(slowRight).toBeGreaterThan(fastWrong);
    expect(slowRight).toBe(100);
  });

  it("adds a capped speed bonus and applies initiative multiplier", () => {
    const fastWithInitiative = scoreSubmission({
      task,
      correct: true,
      msRemaining: roundMs, // instant
      roundMs,
      hasInitiative: true,
      initiativeBonus: 1.25,
    });
    // base 100 + 25% speed = 125, * 1.25 initiative = 156.25 -> 156
    expect(fastWithInitiative).toBe(156);
  });
});

describe("answer validation", () => {
  it("validates classify answers", () => {
    const t = PACK_01.rounds[0].sides.blue.tasks[0] as ClassifyTask;
    expect(validateAnswer(t, { optionId: t.answerId })).toBe(true);
    expect(validateAnswer(t, { optionId: "wrong" })).toBe(false);
    expect(validateAnswer(t, {})).toBe(false);
    expect(validateAnswer(t, "b")).toBe(false);
  });

  it("validates match answers fully (all pairs required)", () => {
    const t = PACK_01.rounds[0].sides.blue.tasks[1] as MatchTask;
    expect(validateAnswer(t, { pairs: { ...t.answer } })).toBe(true);
    const broken = { ...t.answer };
    const firstKey = Object.keys(broken)[0];
    broken[firstKey] = "nonsense";
    expect(validateAnswer(t, { pairs: broken })).toBe(false);
    const partial = { ...t.answer };
    delete (partial as Record<string, string>)[firstKey];
    expect(validateAnswer(t, { pairs: partial })).toBe(false);
  });
});

describe("full round flow", () => {
  function runToActive() {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(3));
    state = advance(state, PACK_01, 2100, seededRng(3)); // roleReveal -> briefing
    state = advance(state, PACK_01, 2200, seededRng(3)); // briefing -> active
    return state;
  }

  it("walks the phase machine in order", () => {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(3));
    expect(state.phase).toBe("roleReveal");
    state = advance(state, PACK_01, 2100, seededRng(3));
    expect(state.phase).toBe("roundBriefing");
    state = advance(state, PACK_01, 2200, seededRng(3));
    expect(state.phase).toBe("active");
    expect(state.phaseDeadline).toBe(2200 + 90_000);
    state = advance(state, PACK_01, 2300, seededRng(3));
    expect(state.phase).toBe("submissionLock");
    state = advance(state, PACK_01, 2400, seededRng(3));
    expect(state.phase).toBe("debrief");
    state = advance(state, PACK_01, 2500, seededRng(3)); // -> round 2 briefing
    expect(state.phase).toBe("roundBriefing");
    expect(state.roundIndex).toBe(1);
  });

  it("ends in finalResults after the configured rounds", () => {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(3));
    // 2 rounds: roleReveal -> (briefing,active,lock,debrief) x2 -> final
    const order = [
      "roundBriefing", "active", "submissionLock", "debrief",
      "roundBriefing", "active", "submissionLock", "debrief",
      "finalResults",
    ];
    let t = 2100;
    for (const expected of order) {
      state = advance(state, PACK_01, (t += 100), seededRng(3));
      expect(state.phase).toBe(expected);
    }
  });

  it("scores correct submissions into the team total at lock", () => {
    let state = runToActive();
    const blue = state.players.find((p) => p.team === "blue" && p.roleKey === "defender")!;
    const task = PACK_01.rounds[0].sides.blue.tasks.find((t) => t.roleKey === "defender") as ClassifyTask;
    state = applySubmission(state, PACK_01, blue.id, task.id, { optionId: task.answerId }, 2250);
    state = forceLock(state, PACK_01, 2260, seededRng(3));
    expect(state.scores.blue).toBeGreaterThan(0);
    expect(state.rounds[0].scored).toBe(true);
  });
});

describe("submission guards", () => {
  function active() {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(5));
    state = advance(state, PACK_01, 2100, seededRng(5));
    state = advance(state, PACK_01, 2200, seededRng(5));
    return state;
  }

  it("rejects submissions after the deadline", () => {
    const state = active();
    const p = state.players.find((x) => x.roleKey === "defender" && x.team === "blue")!;
    const task = PACK_01.rounds[0].sides.blue.tasks[0] as ClassifyTask;
    expect(() =>
      applySubmission(state, PACK_01, p.id, task.id, { optionId: task.answerId }, 2200 + 90_001)
    ).toThrow(/time is up/i);
  });

  it("rejects a task that isn't assigned to the player's role", () => {
    const state = active();
    const blueDefender = state.players.find((x) => x.roleKey === "defender" && x.team === "blue")!;
    const responderTask = PACK_01.rounds[0].sides.blue.tasks.find((t) => t.roleKey === "responder")!;
    expect(() =>
      applySubmission(state, PACK_01, blueDefender.id, responderTask.id, { optionId: "a" }, 2250)
    ).toThrow(/not assigned/i);
  });

  it("rejects a player submitting a task from the other team", () => {
    const state = active();
    const blue = state.players.find((x) => x.team === "blue")!;
    const redTask = PACK_01.rounds[0].sides.red.tasks[0];
    expect(() =>
      applySubmission(state, PACK_01, blue.id, redTask.id, { optionId: "a" }, 2250)
    ).toThrow(GameError);
  });

  it("rejects submissions when not in the active phase", () => {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(5)); // roleReveal
    const p = state.players[0];
    expect(() =>
      applySubmission(state, PACK_01, p.id, "r1-b-defender", { optionId: "a" }, 2050)
    ).toThrow(/closed/i);
  });

  it("lets a player overwrite their own earlier answer", () => {
    let state = active();
    const p = state.players.find((x) => x.roleKey === "defender" && x.team === "blue")!;
    const task = PACK_01.rounds[0].sides.blue.tasks[0] as ClassifyTask;
    state = applySubmission(state, PACK_01, p.id, task.id, { optionId: "a" }, 2250);
    state = applySubmission(state, PACK_01, p.id, task.id, { optionId: task.answerId }, 2260);
    const subs = state.rounds[0].submissions.filter((s) => s.playerId === p.id && s.taskId === task.id);
    expect(subs.length).toBe(1);
    expect(subs[0].correct).toBe(true);
  });
});

describe("final results", () => {
  it("declares the higher-scoring side the winner", () => {
    let state = startGame(makeGame(8), PACK_01, 2000, seededRng(9));
    state = advance(state, PACK_01, 2100, seededRng(9)); // briefing r1
    state = advance(state, PACK_01, 2200, seededRng(9)); // active r1
    // every blue player answers their classify/fill tasks correctly
    for (const p of state.players.filter((x) => x.team === "blue")) {
      const tasks = PACK_01.rounds[0].sides.blue.tasks.filter((t) => t.roleKey === p.roleKey);
      for (const t of tasks) {
        if (t.type === "classify" || t.type === "fillBlank") {
          state = applySubmission(state, PACK_01, p.id, t.id, { optionId: t.answerId }, 2250);
        }
      }
    }
    // advance to the end
    let t = 2300;
    while (state.phase !== "finalResults") {
      state = advance(state, PACK_01, (t += 100), seededRng(9));
    }
    expect(state.scores.blue).toBeGreaterThan(0);
    expect(state.phase).toBe("finalResults");
  });
});
