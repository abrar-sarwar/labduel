// Role definitions, shared by client and server. Roles are meaningful: each maps
// to the sub-tasks a player receives during a round (via `roleKey` on content).

export type Team = "red" | "blue";

export interface RoleDef {
  key: string;
  team: Team;
  name: string;
  blurb: string;
  /** Single-glyph crest used on role cards (kept icon-light, no external assets). */
  glyph: string;
}

export const BLUE_ROLES: RoleDef[] = [
  {
    key: "defender",
    team: "blue",
    name: "Defender",
    blurb: "Spots the threat and makes the first call on what's malicious.",
    glyph: "shield",
  },
  {
    key: "analyst",
    team: "blue",
    name: "Analyst",
    blurb: "Reads the signals, maps indicators to what they actually mean.",
    glyph: "scope",
  },
  {
    key: "engineer",
    team: "blue",
    name: "Engineer",
    blurb: "Builds the control: detections, configs, and hardening.",
    glyph: "gear",
  },
  {
    key: "responder",
    team: "blue",
    name: "Responder",
    blurb: "Decides the response, contain, report, recover, in the right order.",
    glyph: "pulse",
  },
];

export const RED_ROLES: RoleDef[] = [
  {
    key: "recon",
    team: "red",
    name: "Recon",
    blurb: "Finds the opening, what's exposed and who's a target.",
    glyph: "scope",
  },
  {
    key: "social",
    team: "red",
    name: "Social Engineer",
    blurb: "Crafts the human angle, the pretext that gets a click.",
    glyph: "mask",
  },
  {
    key: "operator",
    team: "red",
    name: "Operator",
    blurb: "Picks the move and the moment to apply pressure.",
    glyph: "bolt",
  },
  {
    key: "strategist",
    team: "red",
    name: "Strategist",
    blurb: "Reads the defense and chooses where it bends.",
    glyph: "grid",
  },
];

export const ALL_ROLES: RoleDef[] = [...BLUE_ROLES, ...RED_ROLES];

export function rolesForTeam(team: Team): RoleDef[] {
  return team === "blue" ? BLUE_ROLES : RED_ROLES;
}

export function getRole(key: string): RoleDef | undefined {
  return ALL_ROLES.find((r) => r.key === key);
}
