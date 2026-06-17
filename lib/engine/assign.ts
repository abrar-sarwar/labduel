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
