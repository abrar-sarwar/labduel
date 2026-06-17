// Upgrade catalog — static content, safe for client import (no secrets).
// Red upgrades are framed responsibly and conceptually; no real attack tooling.

import type { Team } from "../shared/roles";

export type UpgradeEffect =
  | { kind: "scoreNextRound"; pct: number }
  | { kind: "reduceDamage"; amount: number }
  | { kind: "addDamage"; amount: number }
  | { kind: "insurance"; money: number; premium: number };

export interface Upgrade {
  id: string;
  team: Team;
  name: string;
  cost: number;
  blurb: string;
  /** What it teaches — shown as a tooltip-style line. */
  concept: string;
  effect: UpgradeEffect;
}

export const BLUE_UPGRADES: Upgrade[] = [
  {
    id: "mfa",
    team: "blue",
    name: "MFA Rollout",
    cost: 320,
    blurb: "+10% to your squad's points next round.",
    concept: "Multi-factor auth blunts stolen-credential attacks.",
    effect: { kind: "scoreNextRound", pct: 0.1 },
  },
  {
    id: "edr",
    team: "blue",
    name: "Endpoint Detection",
    cost: 360,
    blurb: "+12% to your squad's points next round.",
    concept: "EDR spots malicious behavior on devices early.",
    effect: { kind: "scoreNextRound", pct: 0.12 },
  },
  {
    id: "logging",
    team: "blue",
    name: "Better Logging",
    cost: 240,
    blurb: "+7% to your squad's points next round.",
    concept: "You can't detect what you don't log.",
    effect: { kind: "scoreNextRound", pct: 0.07 },
  },
  {
    id: "training",
    team: "blue",
    name: "Awareness Training",
    cost: 200,
    blurb: "+6% to your squad's points next round.",
    concept: "Trained people are a control, not just a target.",
    effect: { kind: "scoreNextRound", pct: 0.06 },
  },
  {
    id: "backups",
    team: "blue",
    name: "Backups & Recovery",
    cost: 300,
    blurb: "Reduce company damage by 25 now.",
    concept: "Tested backups turn a breach into an inconvenience.",
    effect: { kind: "reduceDamage", amount: 25 },
  },
  {
    id: "insurance",
    team: "blue",
    name: "Cyber Insurance",
    cost: 120,
    blurb: "+450 now, but premiums cut future income by 110.",
    concept: "Insurance funds recovery — it doesn't erase the incident.",
    effect: { kind: "insurance", money: 450, premium: 110 },
  },
];

export const RED_UPGRADES: Upgrade[] = [
  {
    id: "recon",
    team: "red",
    name: "Recon Intel",
    cost: 320,
    blurb: "+10% to your squad's points next round.",
    concept: "Good recon makes every later step easier.",
    effect: { kind: "scoreNextRound", pct: 0.1 },
  },
  {
    id: "evasion",
    team: "red",
    name: "Simulated Evasion",
    cost: 360,
    blurb: "+12% to your squad's points next round.",
    concept: "Evasion buys attackers time before detection.",
    effect: { kind: "scoreNextRound", pct: 0.12 },
  },
  {
    id: "timing",
    team: "red",
    name: "Timing Window",
    cost: 240,
    blurb: "+7% to your squad's points next round.",
    concept: "Striking during low-coverage windows raises success.",
    effect: { kind: "scoreNextRound", pct: 0.07 },
  },
  {
    id: "social",
    team: "red",
    name: "Social Pressure",
    cost: 200,
    blurb: "+6% to your squad's points next round.",
    concept: "Urgency and authority push people to skip checks.",
    effect: { kind: "scoreNextRound", pct: 0.06 },
  },
  {
    id: "breach",
    team: "red",
    name: "Press the Breach",
    cost: 300,
    blurb: "Increase company damage by 20 now.",
    concept: "Unchecked footholds deepen into real breaches.",
    effect: { kind: "addDamage", amount: 20 },
  },
  {
    id: "warchest",
    team: "red",
    name: "War Chest",
    cost: 120,
    blurb: "+450 now, but funders take 110 from future income.",
    concept: "Outside funding fuels a comeback — with strings attached.",
    effect: { kind: "insurance", money: 450, premium: 110 },
  },
];

export const UPGRADES: Upgrade[] = [...BLUE_UPGRADES, ...RED_UPGRADES];

export function upgradesForTeam(team: Team): Upgrade[] {
  return team === "blue" ? BLUE_UPGRADES : RED_UPGRADES;
}

export function getUpgrade(id: string): Upgrade | undefined {
  return UPGRADES.find((u) => u.id === id);
}
