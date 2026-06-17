// Auto-balance: split players into Red/Blue, chunk each side into squads of the
// target size, and assign roles round-robin. Pure given an Rng.

import type { Player, Squad, Team, GameSettings } from "../shared/types";
import { rolesForTeam } from "../shared/roles";
import { shuffle, type Rng } from "./rng";

const RED_SQUAD_NAMES = ["Vandal", "Ember", "Cinder", "Reaver", "Spectre", "Talon"];
const BLUE_SQUAD_NAMES = ["Aegis", "Bastion", "Citadel", "Sentinel", "Warden", "Bulwark"];

function squadName(team: Team, index: number): string {
  const names = team === "red" ? RED_SQUAD_NAMES : BLUE_SQUAD_NAMES;
  return names[index] ?? `${team === "red" ? "Red" : "Blue"} ${index + 1}`;
}

/** Number of squads for `count` players at target `size`, balancing sizes. */
function squadCount(count: number, size: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round(count / size));
}

function chunkEven<T>(items: T[], groups: number): T[][] {
  if (groups <= 0) return [];
  const out: T[][] = Array.from({ length: groups }, () => []);
  items.forEach((item, i) => out[i % groups].push(item));
  return out;
}

export interface AssignmentResult {
  players: Player[];
  squads: Squad[];
}

/**
 * Assign all `active`/`waiting` players to teams, squads and roles.
 * Returns new player objects (immutably) and the squad list.
 */
export function assignTeamsAndSquads(
  players: Player[],
  settings: GameSettings,
  rng: Rng
): AssignmentResult {
  const pool = shuffle(
    players.filter((p) => p.status === "active"),
    rng
  );

  // Alternate assignment keeps team sizes within one of each other.
  const red: Player[] = [];
  const blue: Player[] = [];
  pool.forEach((p, i) => (i % 2 === 0 ? red : blue).push(p));

  const squads: Squad[] = [];
  const updatedById = new Map<string, Player>();

  for (const team of ["red", "blue"] as Team[]) {
    const members = team === "red" ? red : blue;
    const roles = rolesForTeam(team);
    const groups = squadCount(members.length, settings.squadSize);
    const chunks = chunkEven(members, groups);

    chunks.forEach((chunk, gi) => {
      const squadId = `sq_${team}_${gi}`;
      squads.push({
        id: squadId,
        team,
        name: squadName(team, gi),
        memberIds: chunk.map((p) => p.id),
      });
      chunk.forEach((p, ri) => {
        updatedById.set(p.id, {
          ...p,
          team,
          squadId,
          roleKey: roles[ri % roles.length].key,
          status: "active",
        });
      });
    });
  }

  const updatedPlayers = players.map((p) => updatedById.get(p.id) ?? p);
  return { players: updatedPlayers, squads };
}

/**
 * Place any `waiting` (late-joiner) players into existing squads, balancing onto
 * the smaller team and the smallest squad. Pure given an Rng. Called at round
 * boundaries so late joiners enter on the next round, never mid-round.
 */
export function placeWaitingPlayers(
  players: Player[],
  squads: Squad[],
  rng: Rng
): AssignmentResult {
  const waiting = shuffle(
    players.filter((p) => p.status === "waiting"),
    rng
  );
  if (waiting.length === 0 || squads.length === 0) return { players, squads };

  // mutable working copies
  const squadList = squads.map((s) => ({ ...s, memberIds: s.memberIds.slice() }));
  const teamSize = (team: Team) =>
    squadList
      .filter((s) => s.team === team)
      .reduce((n, s) => n + s.memberIds.length, 0);
  const updatedById = new Map<string, Player>();

  for (const p of waiting) {
    // Honor a host's pre-assignment (team + squad already chosen): just activate
    // them in place. Otherwise auto-balance onto the smaller team's smallest squad.
    const preassigned =
      p.team != null &&
      p.squadId != null &&
      squadList.some((s) => s.id === p.squadId && s.team === p.team);

    const team: Team = preassigned
      ? (p.team as Team)
      : teamSize("red") <= teamSize("blue")
        ? "red"
        : "blue";
    const roles = rolesForTeam(team);
    const target = preassigned
      ? squadList.find((s) => s.id === p.squadId)!
      : squadList
          .filter((s) => s.team === team)
          .sort((a, b) => a.memberIds.length - b.memberIds.length)[0];
    if (!target) continue;
    const roleKey =
      preassigned && p.roleKey ? p.roleKey : roles[target.memberIds.length % roles.length].key;
    if (!target.memberIds.includes(p.id)) target.memberIds.push(p.id);
    updatedById.set(p.id, {
      ...p,
      team,
      squadId: target.id,
      roleKey,
      status: "active",
    });
  }

  return {
    players: players.map((p) => updatedById.get(p.id) ?? p),
    squads: squadList,
  };
}
