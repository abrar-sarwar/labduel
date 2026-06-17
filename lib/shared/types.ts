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
  /**
   * SERVER ONLY — never serialized to public state or to OTHER players' payloads.
   * True for the one Blue player secretly playing as the Insider Threat.
   */
  insider: boolean;
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
  /** SERVER ONLY — whether the Insider chose to sabotage this round. */
  insiderSabotaged: boolean;
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
  /** SERVER ONLY — id of the Insider player, or null. Never projected publicly. */
  insiderPlayerId: string | null;
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
  /**
   * Insider/Checkmate reveal — populated ONLY at final results (game over), so
   * disclosing the insider's identity here is intentional and safe.
   */
  checkmate: { enabled: boolean; unlocked: boolean; insiderName: string | null } | null;
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

/**
 * Insider-only private payload. Present ONLY in the insider player's own view;
 * null for everyone else (and absent from public state entirely).
 */
export interface InsiderView {
  /** The current round's secret objective, when one is available. */
  objective: {
    prompt: string;
    concept: string;
    doLabel: string;
    layLabel: string;
  } | null;
  /** Whether the insider has chosen to sabotage the current round. */
  sabotagedThisRound: boolean;
  /** Hidden Checkmate progress (only the insider and host can see this). */
  progress: number;
  threshold: number;
}

export interface PlayerView {
  you: {
    id: string;
    name: string;
    team: Team | null;
    squadId: string | null;
    role: { key: string; name: string; blurb: string; glyph: string } | null;
    status: "active" | "waiting";
    /** Only ever true in the insider's OWN view. */
    isInsider: boolean;
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
  /** Non-null ONLY for the insider. */
  insider: InsiderView | null;
}

/** Host-only moderation payload (returned only to the authenticated host). */
export interface HostModeration {
  insiderEnabled: boolean;
  insiderPlayerId: string | null;
  insiderName: string | null;
  checkmate: { progress: number; threshold: number; unlocked: boolean };
  rounds: { round: number; sabotaged: boolean }[];
}
