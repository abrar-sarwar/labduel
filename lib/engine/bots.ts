// Test/demo bots. A host can fill a room with bot players so the whole game can
// be run and watched solo (no need for a roomful of phones). Bots auto-answer
// each round so scores, debriefs, damage and the economy all move realistically.

import type { GameState, Player, Team } from "../shared/types";
import type { ScenarioPack } from "../shared/content-types";
import type { Rng } from "./rng";
import { applySubmission, tasksForPlayer, roundContentFor } from "./round";
import { upgradesForTeam } from "../content/upgrades";

const BOT_NAMES = [
  "Ada", "Linus", "Grace", "Turing", "Hopper", "Nova", "Echo", "Pixel",
  "Vega", "Juno", "Cosmo", "Wren", "Sable", "Flux", "Orion", "Lyra",
  "Kilo", "Mara", "Dex", "Indie", "Ozzie", "Remy", "Sol", "Tao",
];

/** Append `count` bot players to the lobby (they get assigned at start). */
export function addBots(state: GameState, count: number, now: number): GameState {
  const existingBots = state.players.filter((p) => p.isBot).length;
  const bots: Player[] = [];
  for (let i = 0; i < count; i++) {
    const n = existingBots + i;
    const name = BOT_NAMES[n % BOT_NAMES.length] + (n >= BOT_NAMES.length ? ` ${Math.floor(n / BOT_NAMES.length) + 1}` : "");
    bots.push({
      id: `bot_${n}`,
      name,
      token: `bot-token-${n}`,
      team: null,
      squadId: null,
      roleKey: null,
      connected: true,
      status: state.phase === "lobby" ? "active" : "waiting",
      insider: false,
      isBot: true,
      joinedAt: now + i,
    });
  }
  return {
    ...state,
    players: [...state.players, ...bots],
    rev: state.rev + 1,
    updatedAt: now,
  };
}

function wrongOptionId(options: { id: string }[], answerId: string): string {
  const other = options.find((o) => o.id !== answerId);
  return other ? other.id : answerId;
}

/**
 * Every bot answers their assigned tasks for the current active round. ~3 of 4
 * answers are correct so scores look believable. Safe to call once per round.
 */
export function botsAutoSubmit(
  state: GameState,
  pack: ScenarioPack,
  now: number,
  rng: Rng
): GameState {
  if (state.phase !== "active") return state;
  const rc = roundContentFor(pack, state.roundIndex);
  let next = state;

  for (const bot of state.players) {
    if (!bot.isBot || bot.status !== "active") continue;
    for (const task of tasksForPlayer(rc, bot)) {
      const correct = rng() < 0.78;
      let answer: unknown;
      if (task.type === "type") {
        answer = { text: correct ? task.answer : "incorrect entry" };
      } else if (task.type === "match") {
        if (correct) {
          answer = { pairs: { ...task.answer } };
        } else {
          // shuffle the mapping so it's wrong but well-formed
          const lefts = Object.keys(task.answer);
          const rights = lefts.map((k) => task.answer[k]);
          const rotated = rights.map((_, i) => rights[(i + 1) % rights.length]);
          answer = { pairs: Object.fromEntries(lefts.map((k, i) => [k, rotated[i]])) };
        }
      } else {
        answer = { optionId: correct ? task.answerId : wrongOptionId(task.options, task.answerId) };
      }
      try {
        next = applySubmission(next, pack, bot.id, task.id, answer, now);
      } catch {
        /* skip a task that can't be submitted */
      }
    }
  }
  return next;
}

/**
 * Every bot casts 1-2 upvotes for their team's upgrades, so the shop has lively
 * vote tallies for the leader to read. Safe to call once when the shop opens.
 */
export function botsAutoVote(state: GameState, now: number, rng: Rng): GameState {
  if (state.phase !== "shop") return state;
  const shopVotes: Record<Team, Record<string, string[]>> = {
    red: { ...state.shopVotes.red },
    blue: { ...state.shopVotes.blue },
  };

  for (const bot of state.players) {
    if (!bot.isBot || bot.status !== "active" || !bot.team) continue;
    const catalog = upgradesForTeam(bot.team);
    const picks = 1 + Math.floor(rng() * 2); // 1 or 2
    for (let i = 0; i < picks; i++) {
      const up = catalog[Math.floor(rng() * catalog.length)];
      const list = shopVotes[bot.team][up.id] ?? [];
      if (!list.includes(bot.id)) shopVotes[bot.team][up.id] = [...list, bot.id];
    }
  }
  return { ...state, shopVotes, rev: state.rev + 1, updatedAt: now };
}
