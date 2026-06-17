// Pure projections from authoritative GameState into the public broadcast and the
// per-player private view. This is the security seam: the public projection NEVER
// contains tokens, task answers, or per-player private data.

import type {
  GameState,
  PublicState,
  PublicSquad,
  PublicRound,
  PublicDebrief,
  PlayerView,
  PlayerTaskView,
  InsiderView,
  HostModeration,
  Phase,
} from "../shared/types";
import type { ScenarioPack } from "../shared/content-types";
import { toPublicTask } from "../shared/content-types";
import { getRole } from "../shared/roles";
import {
  roundContentFor,
  tasksForPlayer,
  expectedSubmissionCount,
  computeFinal,
  checkmateState,
} from "./round";

const SHOW_ROUND: Phase[] = ["roundBriefing", "active", "submissionLock"];
const SHOW_TASKS: Phase[] = ["active", "submissionLock", "debrief"];
// Phases where the insider may have a live objective panel.
const INSIDER_ACTIVE: Phase[] = ["roundBriefing", "active", "submissionLock", "debrief"];

function squadScores(state: GameState): Map<string, number> {
  const totals = new Map<string, number>();
  const playerSquad = new Map(state.players.map((p) => [p.id, p.squadId]));
  for (const round of state.rounds) {
    for (const sub of round.submissions) {
      const sqId = playerSquad.get(sub.playerId);
      if (!sqId) continue;
      totals.set(sqId, (totals.get(sqId) ?? 0) + sub.points);
    }
  }
  return totals;
}

export function toPublicState(state: GameState, pack: ScenarioPack): PublicState {
  const scores = squadScores(state);
  const nameById = new Map(state.players.map((p) => [p.id, p.name]));

  const publicSquads: PublicSquad[] = state.squads.map((sq) => ({
    id: sq.id,
    team: sq.team,
    name: sq.name,
    score: scores.get(sq.id) ?? 0,
    memberNames: sq.memberIds.map((id) => nameById.get(id) ?? "?"),
  }));

  let round: PublicRound | null = null;
  let debrief: PublicDebrief | null = null;

  const runtime = state.rounds[state.roundIndex];
  if (runtime && SHOW_ROUND.includes(state.phase)) {
    const rc = roundContentFor(pack, state.roundIndex);
    round = {
      number: runtime.number,
      title: rc.title,
      concept: rc.concept,
      publicBrief: rc.brief.public,
      initiative: runtime.initiative,
      bonus: rc.initiativeBonus,
      deadline: runtime.deadline,
      submittedCount: runtime.submissions.length,
      expectedCount: expectedSubmissionCount(state, rc),
    };
  }
  if (runtime && state.phase === "debrief") {
    const rc = roundContentFor(pack, state.roundIndex);
    debrief = {
      round: runtime.number,
      title: rc.title,
      summary: rc.debrief.summary,
      red: rc.debrief.red,
      blue: rc.debrief.blue,
      takeaway: rc.debrief.takeaway,
      roundScore: runtime.roundScore,
    };
  }

  const final = state.phase === "finalResults" ? computeFinal(state, pack) : null;

  return {
    code: state.code,
    phase: state.phase,
    hostName: state.hostName,
    roundIndex: state.roundIndex,
    roundCount: state.settings.roundCount,
    settings: state.settings,
    scores: state.scores,
    economy: state.economy,
    companyDamage: state.companyDamage,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      squadId: p.squadId,
      roleKey: p.roleKey,
      connected: p.connected,
      status: p.status,
    })),
    squads: publicSquads,
    round,
    debrief,
    final,
    phaseDeadline: state.phaseDeadline,
    playerCount: state.players.length,
    connectedCount: state.players.filter((p) => p.connected).length,
    waitingCount: state.players.filter((p) => p.status === "waiting").length,
    rev: state.rev,
    updatedAt: state.updatedAt,
  };
}

export function toPlayerView(
  state: GameState,
  pack: ScenarioPack,
  playerId: string
): PlayerView | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;

  const role = player.roleKey ? getRole(player.roleKey) : null;
  const runtime = state.rounds[state.roundIndex];

  let round: PlayerView["round"] = null;
  let tasks: PlayerTaskView[] = [];

  if (runtime && player.team && SHOW_ROUND.includes(state.phase) && player.status === "active") {
    const rc = roundContentFor(pack, state.roundIndex);
    round = {
      number: runtime.number,
      title: rc.title,
      framing: rc.sides[player.team].framing,
      deadline: runtime.deadline,
    };
  }

  if (runtime && SHOW_TASKS.includes(state.phase) && player.status === "active") {
    const rc = roundContentFor(pack, state.roundIndex);
    const myTasks = tasksForPlayer(rc, player);
    tasks = myTasks.map((t) => {
      const sub = runtime.submissions.find(
        (s) => s.playerId === playerId && s.taskId === t.id
      );
      const reveal = state.phase !== "active"; // hide correctness until locked
      return {
        task: toPublicTask(t),
        submitted: !!sub,
        correct: sub && reveal ? sub.correct : null,
        points: sub && reveal ? sub.points : 0,
      };
    });
  }

  let squad: PlayerView["squad"] = null;
  if (player.squadId) {
    const sq = state.squads.find((s) => s.id === player.squadId);
    if (sq) {
      const rc = SHOW_TASKS.includes(state.phase) || SHOW_ROUND.includes(state.phase)
        ? safeRound(pack, state.roundIndex)
        : null;
      squad = {
        name: sq.name,
        members: sq.memberIds.map((id) => {
          const m = state.players.find((p) => p.id === id);
          const mRole = m?.roleKey ? getRole(m.roleKey) : null;
          let done = false;
          if (m && rc && runtime) {
            const need = tasksForPlayer(rc, m);
            done =
              need.length > 0 &&
              need.every((t) =>
                runtime.submissions.some(
                  (s) => s.playerId === m.id && s.taskId === t.id
                )
              );
          }
          return { name: m?.name ?? "?", roleName: mRole?.name ?? null, done };
        }),
      };
    }
  }

  let debrief: PublicDebrief | null = null;
  if (runtime && state.phase === "debrief") {
    const rc = roundContentFor(pack, state.roundIndex);
    debrief = {
      round: runtime.number,
      title: rc.title,
      summary: rc.debrief.summary,
      red: rc.debrief.red,
      blue: rc.debrief.blue,
      takeaway: rc.debrief.takeaway,
      roundScore: runtime.roundScore,
    };
  }

  // Insider payload — ONLY ever built for the insider's own view.
  let insider: InsiderView | null = null;
  if (player.insider && state.insiderPlayerId === player.id) {
    const cm = checkmateState(state);
    let objective: InsiderView["objective"] = null;
    if (runtime && INSIDER_ACTIVE.includes(state.phase)) {
      const rc = safeRound(pack, state.roundIndex);
      if (rc?.insiderObjective) {
        objective = {
          prompt: rc.insiderObjective.prompt,
          concept: rc.insiderObjective.concept,
          doLabel: rc.insiderObjective.doLabel,
          layLabel: rc.insiderObjective.layLabel,
        };
      }
    }
    insider = {
      objective,
      sabotagedThisRound: runtime?.insiderSabotaged ?? false,
      progress: cm.progress,
      threshold: cm.threshold,
    };
  }

  return {
    you: {
      id: player.id,
      name: player.name,
      team: player.team,
      squadId: player.squadId,
      role: role
        ? { key: role.key, name: role.name, blurb: role.blurb, glyph: role.glyph }
        : null,
      status: player.status,
      // Only ever true in the insider's OWN view (this projection is per-player).
      isInsider: player.insider && state.insiderPlayerId === player.id,
    },
    phase: state.phase,
    round,
    tasks,
    squad,
    debrief,
    insider,
  };
}

/** Host-only moderation view: insider identity + live Checkmate progress. */
export function hostModeration(state: GameState): HostModeration {
  const cm = checkmateState(state);
  const insiderName = state.insiderPlayerId
    ? state.players.find((p) => p.id === state.insiderPlayerId)?.name ?? null
    : null;
  return {
    insiderEnabled: state.settings.insiderThreat,
    insiderPlayerId: state.insiderPlayerId,
    insiderName,
    checkmate: { progress: cm.progress, threshold: cm.threshold, unlocked: cm.unlocked },
    rounds: state.rounds.map((r) => ({ round: r.number, sabotaged: r.insiderSabotaged })),
  };
}

function safeRound(pack: ScenarioPack, index: number) {
  try {
    return roundContentFor(pack, index);
  } catch {
    return null;
  }
}
