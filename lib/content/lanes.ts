// The castle / siege board: the company's attack surface as five positions.
// Red commits one lane to attack; Blue commits which lanes to defend. Static,
// safe content (client may import it). The reveal explains the matchup.

export type LaneId = "perimeter" | "identity" | "cloud" | "endpoint" | "people";

export interface Lane {
  id: LaneId;
  name: string;
  glyph: string; // maps to RoleGlyph
  /** Where Red gets in if this lane is undefended. */
  attack: string;
  /** How Blue holds this lane. */
  defense: string;
}

export const LANES: Lane[] = [
  {
    id: "perimeter",
    name: "Perimeter / Web",
    glyph: "grid",
    attack: "Public web apps and exposed services. A weak input or stale service is the front door.",
    defense: "Input validation, patching, and a WAF keep the front door from swinging open.",
  },
  {
    id: "identity",
    name: "Identity",
    glyph: "shield",
    attack: "Logins and accounts. Reused or phished passwords walk right in.",
    defense: "MFA, lockouts, and impossible-travel alerts make stolen passwords useless.",
  },
  {
    id: "cloud",
    name: "Cloud",
    glyph: "scope",
    attack: "Misconfigured storage and over-broad IAM. One public bucket leaks everything.",
    defense: "Least-privilege IAM, private buckets, and config scanning close the gaps.",
  },
  {
    id: "endpoint",
    name: "Endpoints",
    glyph: "pulse",
    attack: "Laptops and servers. Malware or a risky download gives a foothold.",
    defense: "EDR and patching catch the behavior before it spreads.",
  },
  {
    id: "people",
    name: "People",
    glyph: "mask",
    attack: "Staff and the help desk. A believable pretext beats any firewall.",
    defense: "Training, reporting culture, and verification blunt social engineering.",
  },
];

export function getLane(id: string): Lane | undefined {
  return LANES.find((l) => l.id === id);
}

export const LANE_IDS: LaneId[] = LANES.map((l) => l.id);
