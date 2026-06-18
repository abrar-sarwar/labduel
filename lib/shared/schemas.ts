// Zod schemas, every inbound action is validated against one of these before
// the engine ever sees it.

import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(20, "Keep it under 20 characters");

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,6}$/, "Room codes are 4-6 letters/numbers");

export const createGameSchema = z.object({
  hostName: displayNameSchema.optional(),
  roundCount: z.number().int().min(1).max(9).optional(),
  squadSize: z.number().int().min(3).max(6).optional(),
  roundSeconds: z.number().int().min(30).max(300).optional(),
  teamMode: z.enum(["auto", "choose", "host"]).optional(),
  roleMode: z.enum(["random", "hidden", "choose"]).optional(),
  insiderThreat: z.boolean().optional(),
});

// Lobby / role-reveal actions.
export const lobbyActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pickTeam"), team: z.enum(["red", "blue"]) }),
  z.object({ kind: z.literal("pickRole"), roleKey: z.string().min(1) }),
  z.object({ kind: z.literal("setTeam"), playerId: z.string().min(1), team: z.enum(["red", "blue"]) }),
]);

export const joinGameSchema = z.object({
  code: roomCodeSchema,
  name: displayNameSchema,
});

// Answer payloads, by task type.
export const classifyAnswerSchema = z.object({ optionId: z.string().min(1) });
export const fillBlankAnswerSchema = z.object({ optionId: z.string().min(1) });
export const matchAnswerSchema = z.object({
  pairs: z.record(z.string(), z.string()),
});
export const typeAnswerSchema = z.object({ text: z.string().min(1).max(300) });

export const submitTaskSchema = z.object({
  taskId: z.string().min(1),
  answer: z.union([
    classifyAnswerSchema,
    fillBlankAnswerSchema,
    matchAnswerSchema,
    typeAnswerSchema,
  ]),
});

// Host actions (no extra payload beyond auth).
export const hostActionSchema = z.object({
  action: z.enum([
    "start",
    "advance",
    "forceLock",
    "enableInsider",
    "disableInsider",
  ]),
});

// Insider (player) action.
export const insiderActionSchema = z.object({
  choice: z.enum(["sabotage", "layLow"]),
});

// Shop actions: teammates vote, the leader (or host) commits the buy.
export const shopActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("vote"), upgradeId: z.string().min(1) }),
  z.object({ kind: z.literal("buy"), team: z.enum(["red", "blue"]), upgradeId: z.string().min(1) }),
]);

// Test/demo helpers (host-authorized).
export const testActionSchema = z.object({
  kind: z.literal("addBots"),
  count: z.number().int().min(1).max(40),
});

// Host override console (host-authorized).
export const overrideSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reassign"),
    playerId: z.string().min(1),
    team: z.enum(["red", "blue"]).optional(),
    squadId: z.string().min(1).optional(),
    roleKey: z.string().min(1).optional(),
  }),
  z.object({
    kind: z.literal("assignWaiting"),
    playerId: z.string().min(1),
    team: z.enum(["red", "blue"]),
    squadId: z.string().min(1).optional(),
    roleKey: z.string().min(1).optional(),
    joinNow: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("setLeader"),
    team: z.enum(["red", "blue"]),
    playerId: z.string().min(1),
  }),
]);

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;
export type HostActionInput = z.infer<typeof hostActionSchema>;
export type InsiderActionInput = z.infer<typeof insiderActionSchema>;
