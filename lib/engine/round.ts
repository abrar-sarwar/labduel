// Round lifecycle + phase transitions + submission application + final results.
// All pure: (state, pack, now, rng) -> new state. No I/O.

import type {
  GameState,
  Player,
  RoundRuntime,
  Submission,
  Team,
  PublicFinal,
} from "../shared/types";
import type { ScenarioPack, RoundContent, TaskDef } from "../shared/content-types";
import type { Rng } from "./rng";
import { validateAnswer, scoreSubmission } from "./scoring";
import { assignTeamsAndSquads, placeWaitingPlayers } from "./assign";
import { rolesForTeam } from "../shared/roles";
import { getUpgrade } from "../content/upgrades";
import { LANE_IDS } from "../content/lanes";

const SHOP_BASE_INCOME = 300;
const SHOP_WINNER_BONUS = 150;
const DAMAGE_ON_RED_WIN = 15;
const RECOVERY_ON_BLUE_WIN = 8;
// Siege board resolution
const SIEGE_BREACH_DAMAGE = 18;
const SIEGE_RECOVERY = 10;
const SIEGE_POINTS = 60;

export class GameError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "GameError";
  }
}

function flip(rng: Rng): Team {
  return rng() < 0.5 ? "red" : "blue";
}

/**
 * Fill in a role for any active player who still has none (e.g. didn't claim one
 * in roleMode "choose"). Roles are spread round-robin within each squad.
 */
export function fillMissingRoles(state: GameState): GameState {
  const squadIndex = new Map<string, number>();
  const players = state.players.map((p) => {
    if (p.status !== "active" || !p.team || p.roleKey || !p.squadId) return p;
    const roles = rolesForTeam(p.team);
    const i = squadIndex.get(p.squadId) ?? 0;
    squadIndex.set(p.squadId, i + 1);
    return { ...p, roleKey: roles[i % roles.length].key };
  });
  return { ...state, players };
}

export function roundContentFor(
  pack: ScenarioPack,
  roundIndex: number
): RoundContent {
  const rc = pack.rounds[roundIndex];
  if (!rc) throw new GameError("no_content", `No content for round ${roundIndex + 1}`);
  return rc;
}

/** Tasks a given player is responsible for in a round (by side + role). */
export function tasksForPlayer(rc: RoundContent, player: Player): TaskDef[] {
  if (!player.team || !player.roleKey || player.status !== "active") return [];
  return rc.sides[player.team].tasks.filter((t) => t.roleKey === player.roleKey);
}

export function expectedSubmissionCount(
  state: GameState,
  rc: RoundContent
): number {
  return state.players.reduce((n, p) => n + tasksForPlayer(rc, p).length, 0);
}

function withMeta(state: GameState, now: number): GameState {
  return { ...state, rev: state.rev + 1, updatedAt: now };
}

function audit(
  state: GameState,
  actor: string,
  action: string,
  meta?: Record<string, unknown>
): GameState {
  return { ...state, audit: [...state.audit, { at: state.updatedAt, actor, action, meta }] };
}

// ---------------- Start ----------------

export function startGame(
  state: GameState,
  _pack: ScenarioPack,
  now: number,
  rng: Rng
): GameState {
  if (state.phase !== "lobby")
    throw new GameError("bad_phase", "Game has already started");
  const active = state.players.filter((p) => p.status === "active");
  if (active.length < 2)
    throw new GameError("not_enough_players", "Need at least 2 players to start");

  const { players, squads } = assignTeamsAndSquads(state.players, state.settings, rng);

  // With student-choose / host-assign teams, everyone could pile onto one side.
  const redCount = players.filter((p) => p.team === "red" && p.status === "active").length;
  const blueCount = players.filter((p) => p.team === "blue" && p.status === "active").length;
  if (redCount === 0 || blueCount === 0)
    throw new GameError("unbalanced", "Both sides need at least one player. Rebalance teams first.");

  // Insider Threat: secretly elevate one Blue player, only with enough Blue
  // players that it isn't obvious or crippling. Never assigned otherwise.
  let insiderPlayerId: string | null = null;
  let finalPlayers = players;
  if (state.settings.insiderThreat) {
    const blue = players.filter((p) => p.team === "blue" && p.status === "active");
    if (blue.length >= 3) {
      const chosen = blue[Math.floor(rng() * blue.length)];
      insiderPlayerId = chosen.id;
      finalPlayers = players.map((p) =>
        p.id === chosen.id ? { ...p, insider: true } : p
      );
    }
  }

  // Each team gets a randomly chosen leader (host can change it later).
  const pickLeader = (team: Team): string | null => {
    const members = finalPlayers.filter((p) => p.team === team && p.status === "active");
    return members.length ? members[Math.floor(rng() * members.length)].id : null;
  };

  let next: GameState = {
    ...state,
    players: finalPlayers,
    squads,
    insiderPlayerId,
    leaders: { red: pickLeader("red"), blue: pickLeader("blue") },
    phase: "roleReveal",
    roundIndex: 0,
    rounds: [],
  };
  next = audit(next, "host", "start", {
    players: active.length,
    squads: squads.length,
    insider: insiderPlayerId !== null,
  });
  return withMeta(next, now);
}

// ---------------- Insider Threat + Checkmate ----------------

/** How many sabotaged rounds Red needs to unlock Checkmate. Rare by design. */
export function checkmateThreshold(roundCount: number): number {
  return Math.max(2, Math.ceil(roundCount * 0.66));
}

export interface CheckmateState {
  enabled: boolean;
  progress: number;
  threshold: number;
  unlocked: boolean;
}

export function checkmateState(state: GameState): CheckmateState {
  const enabled = state.settings.insiderThreat && state.insiderPlayerId !== null;
  const progress = state.rounds.filter((r) => r.insiderSabotaged).length;
  const threshold = checkmateThreshold(state.settings.roundCount);
  return { enabled, progress, threshold, unlocked: enabled && progress >= threshold };
}

// ---------------- Siege board ----------------

function patchSiege(
  state: GameState,
  patch: Partial<GameState["rounds"][number]["siege"]>,
  now: number
): GameState {
  const round = state.rounds[state.roundIndex];
  if (!round) throw new GameError("no_round", "No round in progress");
  const rounds = state.rounds.slice();
  rounds[state.roundIndex] = { ...round, siege: { ...round.siege, ...patch } };
  return withMeta({ ...state, rounds }, now);
}

/** Red's leader commits one attack lane during the briefing. */
export function commitAttack(
  state: GameState,
  playerId: string,
  laneId: string,
  now: number
): GameState {
  if (state.phase !== "roundBriefing")
    throw new GameError("bad_phase", "You can only commit during the briefing");
  if (state.leaders.red !== playerId)
    throw new GameError("not_leader", "Only the Red leader sets the attack");
  if (!LANE_IDS.includes(laneId as never))
    throw new GameError("bad_lane", "Unknown lane");
  if (state.rounds[state.roundIndex]?.siege.revealed)
    throw new GameError("locked", "The siege is already resolved");
  return patchSiege(state, { attackLane: laneId }, now);
}

/** Blue's leader commits the defended lanes during the briefing. */
export function commitDefense(
  state: GameState,
  playerId: string,
  laneIds: string[],
  now: number
): GameState {
  if (state.phase !== "roundBriefing")
    throw new GameError("bad_phase", "You can only commit during the briefing");
  if (state.leaders.blue !== playerId)
    throw new GameError("not_leader", "Only the Blue leader sets the defenses");
  const unique = Array.from(new Set(laneIds));
  if (unique.some((l) => !LANE_IDS.includes(l as never)))
    throw new GameError("bad_lane", "Unknown lane");
  if (unique.length > state.blueDefenseSlots)
    throw new GameError("too_many", `You can defend at most ${state.blueDefenseSlots} lanes`);
  if (state.rounds[state.roundIndex]?.siege.revealed)
    throw new GameError("locked", "The siege is already resolved");
  return patchSiege(state, { defendedLanes: unique }, now);
}

/** Resolve the siege at round start: breach (Red) or parry (Blue), apply effects. */
export function resolveSiege(state: GameState, rng: Rng): GameState {
  const round = state.rounds[state.roundIndex];
  if (!round || round.siege.revealed) return state;

  // If Red never committed, the attack lands on a random lane.
  const attackLane =
    round.siege.attackLane ?? LANE_IDS[Math.floor(rng() * LANE_IDS.length)];
  const parried = round.siege.defendedLanes.includes(attackLane);
  const outcome: "breach" | "parry" = parried ? "parry" : "breach";

  let companyDamage = state.companyDamage;
  const scores = { ...state.scores };
  if (outcome === "breach") {
    companyDamage = Math.min(100, companyDamage + SIEGE_BREACH_DAMAGE + state.redBreachBonus);
    scores.red += SIEGE_POINTS;
  } else {
    companyDamage = Math.max(0, companyDamage - SIEGE_RECOVERY);
    scores.blue += SIEGE_POINTS;
  }

  const rounds = state.rounds.slice();
  rounds[state.roundIndex] = {
    ...round,
    siege: { ...round.siege, attackLane, revealed: true, outcome },
  };
  return { ...state, rounds, scores, companyDamage };
}

/** Toggle Insider Threat, host only, lobby only. */
export function setInsiderThreat(
  state: GameState,
  enabled: boolean,
  now: number
): GameState {
  if (state.phase !== "lobby")
    throw new GameError("bad_phase", "Insider Threat can only change before the game starts");
  return withMeta(
    { ...state, settings: { ...state.settings, insiderThreat: enabled } },
    now
  );
}

/** The insider chooses to sabotage (or lay low) for the current round. */
export function applyInsiderAction(
  state: GameState,
  pack: ScenarioPack,
  playerId: string,
  choice: "sabotage" | "layLow",
  now: number
): GameState {
  if (state.phase !== "active")
    throw new GameError("not_active", "No insider action available right now");
  if (state.insiderPlayerId !== playerId)
    throw new GameError("not_insider", "You are not the insider");

  const round = state.rounds[state.roundIndex];
  if (!round || round.deadline == null)
    throw new GameError("not_active", "Round is not running");
  if (now > round.deadline)
    throw new GameError("expired", "Time is up for this round");

  const rc = roundContentFor(pack, state.roundIndex);
  if (!rc.insiderObjective)
    throw new GameError("no_objective", "No insider objective this round");

  const rounds = state.rounds.slice();
  rounds[state.roundIndex] = { ...round, insiderSabotaged: choice === "sabotage" };
  return withMeta({ ...state, rounds }, now);
}

// ---------------- Begin a round ----------------

function beginRound(state: GameState, index: number, now: number, rng: Rng): GameState {
  // Fold any late joiners into squads before the new round starts.
  const placed = placeWaitingPlayers(state.players, state.squads, rng);
  state = { ...state, players: placed.players, squads: placed.squads };

  const round: RoundRuntime = {
    number: index + 1,
    initiative: flip(rng),
    startedAt: null,
    deadline: null,
    submissions: [],
    scored: false,
    roundScore: { red: 0, blue: 0 },
    insiderSabotaged: false,
    siege: { attackLane: null, defendedLanes: [], revealed: false, outcome: null },
  };
  const rounds = state.rounds.slice();
  rounds[index] = round;
  return {
    ...state,
    rounds,
    roundIndex: index,
    phase: "roundBriefing",
    phaseDeadline: null,
  };
}

// ---------------- Finalize (score) a round ----------------

function finalizeRound(state: GameState, pack: ScenarioPack): GameState {
  const round = state.rounds[state.roundIndex];
  if (!round || round.scored) return state;
  const roundScore = { red: 0, blue: 0 };
  for (const sub of round.submissions) {
    const player = state.players.find((p) => p.id === sub.playerId);
    if (!player?.team) continue;
    roundScore[player.team] += sub.points;
  }
  // Hidden insider penalty: a sabotaged round quietly weakens Blue's result.
  if (round.insiderSabotaged) {
    const rc = pack.rounds[state.roundIndex];
    const penalty = rc?.insiderObjective?.penalty ?? 0;
    roundScore.blue = Math.max(0, roundScore.blue - penalty);
  }
  const rounds = state.rounds.slice();
  rounds[state.roundIndex] = { ...round, scored: true, roundScore };
  // The next-round score bonus from the shop applies to exactly one round, spend it.
  const economy = {
    red: { ...state.economy.red, nextRoundBonusPct: 0 },
    blue: { ...state.economy.blue, nextRoundBonusPct: 0 },
  };
  return {
    ...state,
    rounds,
    economy,
    scores: {
      red: state.scores.red + roundScore.red,
      blue: state.scores.blue + roundScore.blue,
    },
  };
}

// ---------------- Shop / economy phase ----------------

function beginShop(state: GameState, now: number): GameState {
  const round = state.rounds[state.roundIndex];
  const rs = round?.roundScore ?? { red: 0, blue: 0 };

  // Company breach: rises when Red took the round, recovers a little when Blue did.
  let companyDamage = state.companyDamage;
  if (rs.red > rs.blue) companyDamage = Math.min(100, companyDamage + DAMAGE_ON_RED_WIN);
  else if (rs.blue > rs.red) companyDamage = Math.max(0, companyDamage - RECOVERY_ON_BLUE_WIN);

  // Income: base minus any insurance premium, plus a bonus for the round winner.
  const econ = {
    red: { ...state.economy.red },
    blue: { ...state.economy.blue },
  };
  for (const team of ["red", "blue"] as Team[]) {
    econ[team].money += Math.max(0, SHOP_BASE_INCOME - econ[team].premium);
  }
  if (rs.red > rs.blue) econ.red.money += SHOP_WINNER_BONUS;
  else if (rs.blue > rs.red) econ.blue.money += SHOP_WINNER_BONUS;

  return {
    ...state,
    phase: "shop",
    economy: econ,
    companyDamage,
    shopVotes: { red: {}, blue: {} }, // fresh vote slate each shop
    phaseDeadline: now + state.settings.shopSeconds * 1000,
  };
}

/** A teammate toggles their upvote for an upgrade during the shop. */
export function toggleShopVote(
  state: GameState,
  playerId: string,
  upgradeId: string,
  now: number
): GameState {
  if (state.phase !== "shop") throw new GameError("bad_phase", "The shop is closed");
  const player = state.players.find((p) => p.id === playerId);
  if (!player?.team) throw new GameError("no_team", "You have no team");
  const up = getUpgrade(upgradeId);
  if (!up || up.team !== player.team)
    throw new GameError("no_upgrade", "That upgrade isn't for your team");

  const team = player.team;
  const teamVotes = { ...state.shopVotes[team] };
  const current = teamVotes[upgradeId] ?? [];
  teamVotes[upgradeId] = current.includes(playerId)
    ? current.filter((id) => id !== playerId)
    : [...current, playerId];

  return withMeta({ ...state, shopVotes: { ...state.shopVotes, [team]: teamVotes } }, now);
}

/** Host sets (or changes) a team's leader. The player must be on that team. */
export function setLeader(
  state: GameState,
  team: Team,
  playerId: string,
  now: number
): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.team !== team)
    throw new GameError("bad_leader", "That player isn't on that team");
  return withMeta({ ...state, leaders: { ...state.leaders, [team]: playerId } }, now);
}

/** Purchase during the Shop phase. Committed by the team leader (or host). */
export function buyUpgrade(
  state: GameState,
  team: Team,
  upgradeId: string,
  now: number
): GameState {
  if (state.phase !== "shop")
    throw new GameError("bad_phase", "The shop is closed");
  const up = getUpgrade(upgradeId);
  if (!up || up.team !== team)
    throw new GameError("no_upgrade", "No such upgrade for that team");

  const te = state.economy[team];
  if (te.upgrades.includes(up.id))
    throw new GameError("already_owned", "Already purchased");
  if (te.money < up.cost)
    throw new GameError("insufficient_funds", "Not enough money");

  let money = te.money - up.cost;
  let premium = te.premium;
  let nextRoundBonusPct = te.nextRoundBonusPct;
  let companyDamage = state.companyDamage;
  let blueDefenseSlots = state.blueDefenseSlots;
  let redBreachBonus = state.redBreachBonus;

  switch (up.effect.kind) {
    case "scoreNextRound":
      nextRoundBonusPct += up.effect.pct;
      break;
    case "reduceDamage":
      companyDamage = Math.max(0, companyDamage - up.effect.amount);
      break;
    case "addDamage":
      companyDamage = Math.min(100, companyDamage + up.effect.amount);
      break;
    case "insurance":
      money += up.effect.money;
      premium += up.effect.premium;
      break;
    case "defenseSlot":
      blueDefenseSlots += 1;
      break;
    case "breachBonus":
      redBreachBonus += up.effect.amount;
      break;
  }

  const economy = {
    ...state.economy,
    [team]: { money, premium, nextRoundBonusPct, upgrades: [...te.upgrades, up.id] },
  };
  let next: GameState = { ...state, economy, companyDamage, blueDefenseSlots, redBreachBonus };
  next = audit(next, "host", "buy", { team, upgrade: up.id, cost: up.cost });
  return withMeta(next, now);
}

// ---------------- Advance phase ----------------

export function advance(
  state: GameState,
  pack: ScenarioPack,
  now: number,
  rng: Rng
): GameState {
  let next: GameState;
  switch (state.phase) {
    case "lobby":
      throw new GameError("bad_phase", "Use start to leave the lobby");

    case "roleReveal":
      // Backfill any roles players didn't claim (roleMode "choose").
      next = beginRound(fillMissingRoles(state), 0, now, rng);
      break;

    case "roundBriefing": {
      // Resolve the siege board (reveal) as the round goes live.
      const resolved = resolveSiege(state, rng);
      const round = resolved.rounds[resolved.roundIndex];
      const deadline = now + resolved.settings.roundSeconds * 1000;
      const rounds = resolved.rounds.slice();
      rounds[resolved.roundIndex] = { ...round, startedAt: now, deadline };
      next = { ...resolved, rounds, phase: "active", phaseDeadline: deadline };
      break;
    }

    case "active":
      next = { ...finalizeRound(state, pack), phase: "submissionLock", phaseDeadline: null };
      break;

    case "submissionLock":
      next = { ...state, phase: "debrief" };
      break;

    case "debrief": {
      const nextIndex = state.roundIndex + 1;
      if (nextIndex < state.settings.roundCount && nextIndex < pack.rounds.length) {
        next = beginShop(state, now); // strategy/economy phase before the next round
      } else {
        next = { ...state, phase: "finalResults", phaseDeadline: null };
      }
      break;
    }

    case "shop":
      next = beginRound(state, state.roundIndex + 1, now, rng);
      break;

    case "finalResults":
      return state;

    default:
      return state;
  }
  next = audit(next, "host", "advance", { from: state.phase, to: next.phase });
  return withMeta(next, now);
}

/** Host force-lock: only valid mid-round; behaves like advancing out of active. */
export function forceLock(
  state: GameState,
  pack: ScenarioPack,
  now: number,
  rng: Rng
): GameState {
  if (state.phase !== "active")
    throw new GameError("bad_phase", "Nothing to lock right now");
  return advance(state, pack, now, rng);
}

// ---------------- Submit a task ----------------

export function applySubmission(
  state: GameState,
  pack: ScenarioPack,
  playerId: string,
  taskId: string,
  answer: unknown,
  now: number
): GameState {
  if (state.phase !== "active")
    throw new GameError("not_active", "Submissions are closed");

  const round = state.rounds[state.roundIndex];
  if (!round || round.deadline == null)
    throw new GameError("not_active", "Round is not running");
  if (now > round.deadline)
    throw new GameError("expired", "Time is up for this round");

  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("no_player", "Player not found");

  const rc = roundContentFor(pack, state.roundIndex);
  const allowed = tasksForPlayer(rc, player);
  const task = allowed.find((t) => t.id === taskId);
  if (!task)
    throw new GameError("not_your_task", "That task is not assigned to you");

  const correct = validateAnswer(task, answer);
  const msRemaining = Math.max(0, round.deadline - now);
  const base = scoreSubmission({
    task,
    correct,
    msRemaining,
    roundMs: state.settings.roundSeconds * 1000,
    hasInitiative: round.initiative === player.team,
    initiativeBonus: rc.initiativeBonus,
  });
  // Apply any shop "next round" team bonus.
  const teamBonus = player.team ? state.economy[player.team].nextRoundBonusPct : 0;
  const points = Math.round(base * (1 + teamBonus));

  const submission: Submission = {
    taskId,
    playerId,
    answer,
    correct,
    points,
    submittedAt: now,
  };

  // Overwrite any prior submission for the same player+task.
  const submissions = round.submissions.filter(
    (s) => !(s.playerId === playerId && s.taskId === taskId)
  );
  submissions.push(submission);
  const rounds = state.rounds.slice();
  rounds[state.roundIndex] = { ...round, submissions };

  return withMeta({ ...state, rounds }, now);
}

// ---------------- Final results ----------------

export function computeFinal(state: GameState, pack: ScenarioPack): PublicFinal {
  const { red, blue } = state.scores;
  let winner: Team | "tie" = red === blue ? "tie" : red > blue ? "red" : "blue";

  // Checkmate Protocol: if the insider unlocked it, Red wins regardless of score.
  const cm = checkmateState(state);
  if (cm.unlocked) winner = "red";
  const insiderName = state.insiderPlayerId
    ? state.players.find((p) => p.id === state.insiderPlayerId)?.name ?? null
    : null;
  const checkmate = state.settings.insiderThreat
    ? { enabled: cm.enabled, unlocked: cm.unlocked, insiderName }
    : null;

  // Full company breach also flips the win to Red.
  const breached = state.companyDamage >= 100;
  if (breached) winner = "red";
  const breach = { companyDamage: state.companyDamage, breached };

  const squadScores = state.squads.map((sq) => {
    const score = state.rounds.reduce((sum, round) => {
      return (
        sum +
        round.submissions
          .filter((s) => sq.memberIds.includes(s.playerId))
          .reduce((a, s) => a + s.points, 0)
      );
    }, 0);
    return { name: sq.name, team: sq.team, score };
  });
  const mvpSquad =
    squadScores.length > 0
      ? squadScores.reduce((best, s) => (s.score > best.score ? s : best))
      : null;

  const recap = state.rounds
    .filter((r) => r.scored)
    .map((r) => {
      const rc = pack.rounds[r.number - 1];
      return { round: r.number, title: rc?.title ?? "", takeaway: rc?.debrief.takeaway ?? "" };
    });

  return { winner, scores: { red, blue }, mvpSquad, recap, checkmate, breach };
}
