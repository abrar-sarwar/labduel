import { describe, it, expect } from "vitest";
import { PACK_01 } from "./pack-01";
import { BLUE_ROLES, RED_ROLES } from "../shared/roles";
import type { Team } from "../shared/roles";

const ROLE_KEYS: Record<Team, string[]> = {
  blue: BLUE_ROLES.map((r) => r.key),
  red: RED_ROLES.map((r) => r.key),
};

describe("scenario pack integrity", () => {
  it("has 9 sequentially numbered rounds", () => {
    expect(PACK_01.rounds).toHaveLength(9);
    PACK_01.rounds.forEach((r, i) => expect(r.number).toBe(i + 1));
  });

  it("has globally unique task ids", () => {
    const ids = PACK_01.rounds.flatMap((r) =>
      (["red", "blue"] as Team[]).flatMap((t) => r.sides[t].tasks.map((task) => task.id))
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every role on every side, with valid role keys", () => {
    for (const round of PACK_01.rounds) {
      for (const team of ["red", "blue"] as Team[]) {
        const keys = round.sides[team].tasks.map((t) => t.roleKey).sort();
        expect(keys).toEqual([...ROLE_KEYS[team]].sort());
      }
    }
  });

  it("has answers that reference valid options for every task", () => {
    for (const round of PACK_01.rounds) {
      for (const team of ["red", "blue"] as Team[]) {
        for (const task of round.sides[team].tasks) {
          if (task.type === "classify") {
            expect(task.options.map((o) => o.id)).toContain(task.answerId);
          } else if (task.type === "fillBlank") {
            expect(task.template).toContain("___");
            expect(task.options.map((o) => o.id)).toContain(task.answerId);
          } else if (task.type === "type") {
            expect(task.answer.trim().length).toBeGreaterThan(0);
            if (task.reference) expect(task.reference.length).toBeGreaterThan(0);
          } else {
            const leftIds = task.left.map((l) => l.id);
            const rightIds = task.right.map((r) => r.id);
            expect(Object.keys(task.answer).sort()).toEqual([...leftIds].sort());
            for (const rid of Object.values(task.answer)) {
              expect(rightIds).toContain(rid);
            }
          }
          expect(task.points).toBeGreaterThan(0);
          expect(task.prompt.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("ships a complete debrief and brief for every round", () => {
    for (const round of PACK_01.rounds) {
      expect(round.brief.public.length).toBeGreaterThan(0);
      expect(round.debrief.summary.length).toBeGreaterThan(0);
      expect(round.debrief.takeaway.length).toBeGreaterThan(0);
    }
  });

  it("gives every round a safe insider objective", () => {
    for (const round of PACK_01.rounds) {
      expect(round.insiderObjective).toBeDefined();
      expect(round.insiderObjective!.prompt.length).toBeGreaterThan(0);
      expect(round.insiderObjective!.penalty).toBeGreaterThan(0);
    }
  });
});
