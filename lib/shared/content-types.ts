// Scenario content model — data only, kept separate from the engine.
// Every task is simulated and safe: no copy-pasteable exploit content.

import type { Team } from "./roles";

export type TaskType = "classify" | "fillBlank" | "match";

export interface TaskOption {
  id: string;
  label: string;
  hint?: string;
}

interface TaskBase {
  id: string;
  /** Which role in the squad receives this sub-task. */
  roleKey: string;
  type: TaskType;
  prompt: string;
  /** The cybersecurity concept this task teaches (shown in debrief). */
  concept: string;
  points: number;
}

export interface ClassifyTask extends TaskBase {
  type: "classify";
  options: TaskOption[];
  /** PRIVATE — server only. Stripped before any client payload. */
  answerId: string;
}

export interface FillBlankTask extends TaskBase {
  type: "fillBlank";
  /** Template containing a single "___" placeholder. */
  template: string;
  options: TaskOption[];
  /** PRIVATE — server only. */
  answerId: string;
}

export interface MatchTask extends TaskBase {
  type: "match";
  left: TaskOption[];
  right: TaskOption[];
  /** PRIVATE — server only. Map of leftId -> correct rightId. */
  answer: Record<string, string>;
}

export type TaskDef = ClassifyTask | FillBlankTask | MatchTask;

export interface SideMission {
  /** Short framing line for this side this round. */
  framing: string;
  tasks: TaskDef[];
}

export interface RoundContent {
  number: number;
  id: string;
  title: string;
  concept: string;
  /** Multiplier applied to the coin-flip winner's round score. */
  initiativeBonus: number;
  brief: {
    public: string;
    red: string;
    blue: string;
  };
  sides: Record<Team, SideMission>;
  debrief: {
    summary: string;
    red: string;
    blue: string;
    takeaway: string;
  };
}

export interface ScenarioPack {
  id: string;
  title: string;
  summary: string;
  rounds: RoundContent[];
}

// ---- Public (answer-stripped) projections sent to clients ----

export type PublicTask =
  | (Omit<ClassifyTask, "answerId">)
  | (Omit<FillBlankTask, "answerId">)
  | (Omit<MatchTask, "answer">);

export function toPublicTask(task: TaskDef): PublicTask {
  if (task.type === "match") {
    const { answer: _a, ...rest } = task;
    return rest;
  }
  const { answerId: _id, ...rest } = task;
  return rest;
}
