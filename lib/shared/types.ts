// Core LabDuel Live domain types shared between server and client.

import type { Team } from "./roles";
import type { PublicTask } from "./content-types";

export type { Team } from "./roles";

export type Phase =
  | "lobby"
  | "roleReveal"
  | "roundBriefing"
  | "active"
  | "submissionLock"
  | "debrief"
  | "finalResults";

export interface GameSettings {
  roundCount: number;
  /** Target squad size used by auto-balance. */
  squadSize: number;
  /** Round timer in seconds for the Active phase. */
  roundSeconds: number;
  /** Designed-for; always false in Slice 1. */
  insiderThreat: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  roundCount: 2,
  squadSize: 5,
  roundSeconds: 90,
  insiderThreat: false,
};

export interface Player {
  id: string;
  name: string;
  /** SERVER ONLY — never serialized to any client payload. */
  token: string;
  team: Team | null;
  squadId: string | null;
  roleKey: string | null;
  connected: boolean;
  /** "active" once placed; "waiting" for late joiners awaiting next round. */
  status: "active" | "waiting";
  joinedAt: number;
}

export interface Squad {
  id: string;
  team: Team;
  name: string;
  memberIds: string[];
}

export interface Submission {
  taskId: string;
  playerId: string;
  answer: unknown;
  correct: boolean;
  points: number;
  submittedAt: number;
}

export interface RoundRuntime {
  number: number;
  /** Coin-flip winner; acts with the initiative bonus. */
  initiative: Team;
  startedAt: number | null;
  deadline: number | null;
  submissions: Submission[];
  scored: boolean;
  roundScore: { red: number; blue: number };
}

export interface AuditEntry {
  at: number;
  actor: string;
  action: string;
  meta?: Record<string, unknown>;
}

/** Authoritative server-side game record. Never sent to clients as-is. */
export interface GameState {
  id: string;
  code: string;
  /** SERVER ONLY. */
  hostToken: string;
  hostName: string;
  phase: Phase;
  settings: GameSettings;
  packId: string;
  players: Player[];
  squads: Squad[];
  roundIndex: number;
  rounds: RoundRuntime[];
  scores: { red: number; blue: number };
  /** Server-stored deadline for the current timed phase (epoch ms). */
  phaseDeadline: number | null;
  audit: AuditEntry[];
  rev: number;
  createdAt: number;
  updatedAt: number;
}

// ---------- Public projection (broadcast to everyone) ----------

export interface PublicPlayer {
  id: string;
  name: string;
  team: Team | null;
  squadId: string | null;
  roleKey: string | null;
  connected: boolean;
  status: "active" | "waiting";
}

export interface PublicSquad {
  id: string;
  team: Team;
  name: string;
  score: number;
  memberNames: string[];
}

export interface PublicRound {
  number: number;
  title: string;
  concept: string;
  publicBrief: string;
  initiative: Team;
  bonus: number;
  deadline: number | null;
  /** counts of submissions in, for the host/projector "waiting on" display */
  submittedCount: number;
  expectedCount: number;
}

export interface PublicDebrief {
  round: number;
  title: string;
  summary: string;
  red: string;
  blue: string;
  takeaway: string;
  roundScore: { red: number; blue: number };
}

export interface PublicFinal {
  winner: Team | "tie";
  scores: { red: number; blue: number };
  mvpSquad: { name: string; team: Team; score: number } | null;
  recap: { round: number; title: string; takeaway: string }[];
}

export interface PublicState {
  code: string;
  phase: Phase;
  hostName: string;
  roundIndex: number;
  roundCount: number;
  settings: GameSettings;
  scores: { red: number; blue: number };
  players: PublicPlayer[];
  squads: PublicSquad[];
  round: PublicRound | null;
  debrief: PublicDebrief | null;
  final: PublicFinal | null;
  playerCount: number;
  connectedCount: number;
  waitingCount: number;
  rev: number;
  updatedAt: number;
}

// ---------- Private projection (per authenticated player) ----------

export interface PlayerTaskView {
  task: PublicTask;
  submitted: boolean;
  correct: boolean | null;
  points: number;
}

export interface PlayerView {
  you: {
    id: string;
    name: string;
    team: Team | null;
    squadId: string | null;
    role: { key: string; name: string; blurb: string; glyph: string } | null;
    status: "active" | "waiting";
  };
  phase: Phase;
  round: {
    number: number;
    title: string;
    framing: string;
    deadline: number | null;
  } | null;
  tasks: PlayerTaskView[];
  squad: {
    name: string;
    members: { name: string; roleName: string | null; done: boolean }[];
  } | null;
  /** Mirror of the public debrief so the player view can show it inline. */
  debrief: PublicDebrief | null;
}
