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

export class GameError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "GameError";
  }
}

function flip(rng: Rng): Team {
  return rng() < 0.5 ? "red" : "blue";
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

  // Insider Threat: secretly elevate one Blue player — only with enough Blue
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

  let next: GameState = {
    ...state,
    players: finalPlayers,
    squads,
    insiderPlayerId,
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

/** Toggle Insider Threat — host only, lobby only. */
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
  return {
    ...state,
    rounds,
    scores: {
      red: state.scores.red + roundScore.red,
      blue: state.scores.blue + roundScore.blue,
    },
  };
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
      next = beginRound(state, 0, now, rng);
      break;

    case "roundBriefing": {
      const round = state.rounds[state.roundIndex];
      const deadline = now + state.settings.roundSeconds * 1000;
      const rounds = state.rounds.slice();
      rounds[state.roundIndex] = { ...round, startedAt: now, deadline };
      next = { ...state, rounds, phase: "active", phaseDeadline: deadline };
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
        next = beginRound(state, nextIndex, now, rng);
      } else {
        next = { ...state, phase: "finalResults", phaseDeadline: null };
      }
      break;
    }

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
  const points = scoreSubmission({
    task,
    correct,
    msRemaining,
    roundMs: state.settings.roundSeconds * 1000,
    hasInitiative: round.initiative === player.team,
    initiativeBonus: rc.initiativeBonus,
  });

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

  return { winner, scores: { red, blue }, mvpSquad, recap, checkmate };
}
