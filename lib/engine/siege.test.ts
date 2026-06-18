import { describe, it, expect } from "vitest";
import {
  createGameState,
  addPlayer,
  startGame,
  advance,
  commitAttack,
  commitDefense,
  toPublicState,
  toPlayerView,
  seededRng,
  GameError,
} from "./index";
import type { GameState } from "../shared/types";
import { PACK_01 } from "../content/pack-01";
import { LANE_IDS } from "../content/lanes";

function briefing(n = 10, seed = 3): GameState {
  let s = createGameState({ id: "g", code: "ABCD", hostToken: "h", packId: PACK_01.id, now: 1000 });
  for (let i = 0; i < n; i++) s = addPlayer(s, { id: `p${i}`, token: `t${i}`, name: `P${i}`, now: 1000 + i });
  s = startGame(s, PACK_01, 2000, seededRng(seed));
  return advance(s, PACK_01, 2100, seededRng(seed)); // roleReveal -> roundBriefing
}
const redLeader = (s: GameState) => s.leaders.red!;
const blueLeader = (s: GameState) => s.leaders.blue!;

describe("siege board", () => {
  it("starts each round with an empty, unrevealed siege", () => {
    const s = briefing();
    expect(s.rounds[0].siege).toMatchObject({ attackLane: null, defendedLanes: [], revealed: false });
  });

  it("only the right team's leader can commit", () => {
    const s = briefing();
    const someoneElse = s.players.find((p) => p.id !== redLeader(s) && p.id !== blueLeader(s))!;
    expect(() => commitAttack(s, someoneElse.id, "cloud", 2200)).toThrow(/leader/i);
    expect(() => commitAttack(s, blueLeader(s), "cloud", 2200)).toThrow(/leader/i);
    expect(() => commitDefense(s, redLeader(s), ["cloud"], 2200)).toThrow(/leader/i);
  });

  it("enforces the defense slot limit", () => {
    const s = briefing(); // default 2 slots
    expect(() => commitDefense(s, blueLeader(s), LANE_IDS.slice(0, 3), 2200)).toThrow(/at most/i);
    const ok = commitDefense(s, blueLeader(s), LANE_IDS.slice(0, 2), 2200);
    expect(ok.rounds[0].siege.defendedLanes).toHaveLength(2);
  });

  it("rejects unknown lanes", () => {
    const s = briefing();
    expect(() => commitAttack(s, redLeader(s), "moat", 2200)).toThrow(/lane/i);
  });

  it("breaches an undefended lane: company damage up, Red scores", () => {
    let s = briefing();
    s = commitAttack(s, redLeader(s), "cloud", 2200);
    s = commitDefense(s, blueLeader(s), ["identity", "people"], 2200);
    const dmgBefore = s.companyDamage;
    s = advance(s, PACK_01, 2300, seededRng(3)); // -> active, resolves siege
    expect(s.rounds[0].siege.outcome).toBe("breach");
    expect(s.companyDamage).toBeGreaterThan(dmgBefore);
    expect(s.scores.red).toBeGreaterThan(0);
  });

  it("parries a defended lane: Blue scores, no breach", () => {
    let s = briefing();
    s = commitAttack(s, redLeader(s), "cloud", 2200);
    s = commitDefense(s, blueLeader(s), ["cloud", "identity"], 2200);
    s = advance(s, PACK_01, 2300, seededRng(3));
    expect(s.rounds[0].siege.outcome).toBe("parry");
    expect(s.scores.blue).toBeGreaterThan(0);
  });

  it("hides each side's commit publicly until reveal, but shows your own team", () => {
    let s = briefing();
    s = commitAttack(s, redLeader(s), "cloud", 2200);
    s = commitDefense(s, blueLeader(s), ["identity"], 2200);

    const pub = toPublicState(s, PACK_01);
    expect(pub.siege!.revealed).toBe(false);
    expect(pub.siege!.attackLane).toBeNull(); // hidden pre-reveal
    expect(pub.siege!.redCommitted).toBe(true);
    expect(pub.siege!.blueDefendedCount).toBe(1);
    expect(JSON.stringify(pub.siege)).not.toContain("cloud");

    const redView = toPlayerView(s, PACK_01, redLeader(s))!;
    expect(redView.siege!.myAttack).toBe("cloud"); // own team sees its pick
    const blueView = toPlayerView(s, PACK_01, blueLeader(s))!;
    expect(blueView.siege!.myAttack).toBeNull(); // blue can't see red's attack
    expect(blueView.siege!.myDefense).toEqual(["identity"]);

    // after reveal it's public
    s = advance(s, PACK_01, 2300, seededRng(3));
    const pub2 = toPublicState(s, PACK_01);
    expect(pub2.siege!.revealed).toBe(true);
    expect(pub2.siege!.attackLane).toBe("cloud");
  });
});
