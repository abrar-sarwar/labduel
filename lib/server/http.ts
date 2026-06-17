import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { GameError } from "../engine";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as object, init);
}

export function fail(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Parse + validate a request body against a Zod schema. */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: fail(400, "bad_json", "Request body must be valid JSON") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = (result.error as ZodError).issues[0];
    return { response: fail(400, "invalid", first?.message ?? "Invalid request") };
  }
  return { data: result.data };
}

/** Map a thrown error to a clean HTTP response. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof GameError) return fail(400, e.code, e.message);
  if (e instanceof Error && e.message === "game_not_found")
    return fail(404, "game_not_found", "That game no longer exists");
  return fail(500, "server_error", "Something went wrong");
}
