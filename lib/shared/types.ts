// Core Parely-It Live domain types shared between server and client.

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
  | "shop"
  | "finalResults";

/** How players end up on Red/Blue. */
export type TeamMode = "auto" | "choose" | "host";
/**
 * How roles are handed out:
 *  - "random": visible random roles (everyone sees everyone's role)
 *  - "hidden": random roles, but each player sees only their OWN role
 *  - "choose": players claim a role during Role Reveal
 */
export type RoleMode = "random" | "hidden" | "choose";

export interface GameSettings {
  roundCount: number;
  /** Target squad size used by auto-balance. */
  squadSize: number;
  /** Round timer in seconds for the Active phase. */
  roundSeconds: number;
  /** Discussion timer (seconds) for the between-rounds Shop phase. */
  shopSeconds: number;
  teamMode: TeamMode;
  roleMode: RoleMode;
  insiderThreat: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  roundCount: 2,
  squadSize: 5,
  roundSeconds: 90,
  shopSeconds: 75,
  teamMode: "auto",
  roleMode: "random",
  insiderThreat: false,
};

/** Shared per-team budget + owned upgrades. All public. */
export interface TeamEconomy {
  money: number;
  upgrades: string[];
  /** Income reduction carried from insurance purchases. */
  premium: number;
  /** Task-points bonus (fraction) applied during the NEXT active round only. */
  nextRoundBonusPct: number;
}

export type Economy = Record<Team, TeamEconomy>;

export const STARTING_ECONOMY: () => Economy = () => ({
  red: { money: 8, upgrades: [], premium: 0, nextRoundBonusPct: 0 },
  blue: { money: 8, upgrades: [], premium: 0, nextRoundBonusPct: 0 },
});

export interface Player {
  id: string;
  name: string;
  /** SERVER ONLY, never serialized to any client payload. */
  token: string;
  team: Team | null;
  squadId: string | null;
  roleKey: string | null;
  connected: boolean;
  /** "active" once placed; "waiting" for late joiners awaiting next round. */
  status: "active" | "waiting";
  /**
   * SERVER ONLY, never serialized to public state or to OTHER players' payloads.
   * True for the one Blue player secretly playing as the Insider Threat.
   */
  insider: boolean;
  /** Test/demo player driven by the server (auto-answers each round). */
  isBot: boolean;
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
  /** SERVER ONLY, whether the Insider chose to sabotage this round. */
  insiderSabotaged: boolean;
  /** Siege board state for this round. */
  siege: RoundSiege;
}

export interface RoundSiege {
  /** Lane Red commits to attack (set during briefing). */
  attackLane: string | null;
  /** Lanes Blue commits to defend. */
  defendedLanes: string[];
  revealed: boolean;
  outcome: "breach" | "parry" | null;
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
  /** SERVER ONLY, id of the Insider player, or null. Never projected publicly. */
  insiderPlayerId: string | null;
  /** The player who commits each team's shop purchases. */
  leaders: Record<Team, string | null>;
  /** Shop upvotes: team -> upgradeId -> voter player ids. Reset each shop. */
  shopVotes: Record<Team, Record<string, string[]>>;
  roundIndex: number;
  rounds: RoundRuntime[];
  scores: { red: number; blue: number };
  economy: Economy;
  /** Company breach meter (0-100). 100 = full breach → Red wins. */
  companyDamage: number;
  /** How many lanes Blue may defend on the siege board (grows via the shop). */
  blueDefenseSlots: number;
  /** Extra company damage Red deals on a breach (grows via the shop). */
  redBreachBonus: number;
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
  isBot: boolean;
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
   * Insider/Checkmate reveal, populated ONLY at final results (game over), so
   * disclosing the insider's identity here is intentional and safe.
   */
  checkmate: { enabled: boolean; unlocked: boolean; insiderName: string | null } | null;
  /** Company breach outcome. `breached` (>=100) flips the win to Red. */
  breach: { companyDamage: number; breached: boolean };
}

/**
 * Siege board, public. Pre-reveal, only commit PROGRESS is shown (never which
 * lanes), so the matchup stays a mind-game until the round starts.
 */
export interface PublicSiege {
  revealed: boolean;
  defenseSlots: number;
  redCommitted: boolean;
  blueDefendedCount: number;
  attackLane: string | null;
  defendedLanes: string[];
  outcome: "breach" | "parry" | null;
}

export interface PublicState {
  code: string;
  phase: Phase;
  hostName: string;
  roundIndex: number;
  roundCount: number;
  settings: GameSettings;
  scores: { red: number; blue: number };
  economy: Economy;
  companyDamage: number;
  /** Each team's leader (commits purchases), or null. */
  leaders: Record<Team, string | null>;
  /** Shop upvotes: team -> upgradeId -> voter player ids. */
  shopVotes: Record<Team, Record<string, string[]>>;
  players: PublicPlayer[];
  squads: PublicSquad[];
  round: PublicRound | null;
  debrief: PublicDebrief | null;
  final: PublicFinal | null;
  /** Siege board state, null outside of round phases. */
  siege: PublicSiege | null;
  /** Deadline for the current timed phase (e.g. the Shop discussion timer). */
  phaseDeadline: number | null;
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
  /** This player's team-only siege view (own commit + leader controls). */
  siege: PlayerSiege | null;
}

export interface PlayerSiege {
  team: Team;
  isLeader: boolean;
  defenseSlots: number;
  /** Your own team's commit (visible to your team only, pre-reveal). */
  myAttack: string | null; // red
  myDefense: string[]; // blue
  revealed: boolean;
  outcome: "breach" | "parry" | null;
  attackLane: string | null; // populated on reveal
  defendedLanes: string[]; // populated on reveal
}

/** Host-only moderation payload (returned only to the authenticated host). */
export interface HostModeration {
  insiderEnabled: boolean;
  insiderPlayerId: string | null;
  insiderName: string | null;
  checkmate: { progress: number; threshold: number; unlocked: boolean };
  rounds: { round: number; sabotaged: boolean }[];
}
