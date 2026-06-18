import { describe, it, expect } from "vitest";
import { validateAnswer, normalizeText } from "./scoring";
import { PACK_01 } from "../content/pack-01";
import type { TypeTask } from "../shared/content-types";
import { toPublicTask } from "../shared/content-types";

const typeTask = PACK_01.rounds[0].sides.blue.tasks.find((t) => t.type === "type") as TypeTask;

describe("typing tasks", () => {
  it("the pack has a type task with an answer", () => {
    expect(typeTask).toBeTruthy();
    expect(typeTask.answer.length).toBeGreaterThan(0);
  });

  it("matches the expected text, forgiving case and extra spaces", () => {
    expect(validateAnswer(typeTask, { text: typeTask.answer })).toBe(true);
    expect(validateAnswer(typeTask, { text: `  ${typeTask.answer.toUpperCase()}  ` })).toBe(true);
    expect(validateAnswer(typeTask, { text: typeTask.answer.replace(/ /g, "   ") })).toBe(true);
  });

  it("rejects wrong text and non-string answers", () => {
    expect(validateAnswer(typeTask, { text: "something else" })).toBe(false);
    expect(validateAnswer(typeTask, { optionId: "a" })).toBe(false);
    expect(validateAnswer(typeTask, {})).toBe(false);
  });

  it("never exposes the answer in the public projection", () => {
    const pub = toPublicTask(typeTask);
    expect(JSON.stringify(pub)).not.toContain(`"answer"`);
  });

  it("normalizeText collapses whitespace and case", () => {
    expect(normalizeText("  Hello   World ")).toBe("hello world");
  });
});
