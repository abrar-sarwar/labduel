// Answer validation + scoring. Accuracy-first: a wrong answer scores zero, no
// matter how fast. Speed only adds a capped bonus on top of a correct answer,
// and the coin-flip winner's side gets the round's initiative multiplier.

import type { TaskDef } from "../shared/content-types";

const SPEED_BONUS_FRACTION = 0.25; // up to +25% of base for instant correct answers

/** Forgiving normalization for typed answers: trim, collapse spaces, lowercase. */
export function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateAnswer(task: TaskDef, answer: unknown): boolean {
  if (answer == null || typeof answer !== "object") return false;
  const a = answer as Record<string, unknown>;

  switch (task.type) {
    case "classify":
    case "fillBlank":
      return typeof a.optionId === "string" && a.optionId === task.answerId;
    case "type":
      return typeof a.text === "string" && normalizeText(a.text) === normalizeText(task.answer);
    case "match": {
      const pairs = a.pairs;
      if (pairs == null || typeof pairs !== "object") return false;
      const given = pairs as Record<string, unknown>;
      const keys = Object.keys(task.answer);
      if (Object.keys(given).length !== keys.length) return false;
      return keys.every((k) => given[k] === task.answer[k]);
    }
    default:
      return false;
  }
}

export interface ScoreParams {
  task: TaskDef;
  correct: boolean;
  /** Milliseconds left on the round clock when submitted (>= 0). */
  msRemaining: number;
  roundMs: number;
  /** Whether this player's side won the coin flip this round. */
  hasInitiative: boolean;
  /** Initiative multiplier from round content (e.g. 1.25). */
  initiativeBonus: number;
}

export function scoreSubmission(params: ScoreParams): number {
  const { task, correct, msRemaining, roundMs, hasInitiative, initiativeBonus } =
    params;
  if (!correct) return 0;

  const base = task.points;
  const timeFraction =
    roundMs > 0 ? Math.max(0, Math.min(1, msRemaining / roundMs)) : 0;
  const speed = base * SPEED_BONUS_FRACTION * timeFraction;
  const subtotal = base + speed;
  const withInitiative = hasInitiative ? subtotal * initiativeBonus : subtotal;
  return Math.round(withInitiative);
}
