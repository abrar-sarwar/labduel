// Zod schemas — every inbound action is validated against one of these before
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
  .regex(/^[A-Z0-9]{4,6}$/, "Room codes are 4–6 letters/numbers");

export const createGameSchema = z.object({
  hostName: displayNameSchema.optional(),
  roundCount: z.number().int().min(1).max(9).optional(),
  squadSize: z.number().int().min(3).max(6).optional(),
  roundSeconds: z.number().int().min(30).max(300).optional(),
  insiderThreat: z.boolean().optional(),
});

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

export const submitTaskSchema = z.object({
  taskId: z.string().min(1),
  answer: z.union([
    classifyAnswerSchema,
    fillBlankAnswerSchema,
    matchAnswerSchema,
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

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;
export type HostActionInput = z.infer<typeof hostActionSchema>;
export type InsiderActionInput = z.infer<typeof insiderActionSchema>;
