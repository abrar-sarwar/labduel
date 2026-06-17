import { displayNameSchema } from "@/lib/shared/schemas";
import { z } from "zod";
import { addPlayer } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { makeToken, makeId } from "@/lib/server/ids";
import { setPlayerCookie, getActor } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

const bodySchema = z.object({ name: displayNameSchema });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  const parsed = await parseBody(req, bodySchema);
  if ("response" in parsed) return parsed.response;

  try {
    // If this browser already holds a valid player session, treat as reconnect.
    const actor = await getActor(code);
    if (actor.role === "player") {
      return ok({ playerId: actor.playerId, reconnected: true });
    }
    if (actor.role === "host") {
      return fail(409, "is_host", "You are the host of this game");
    }

    const token = makeToken();
    const playerId = makeId("player");
    registry.mutate(code, (state) =>
      addPlayer(state, { id: playerId, token, name: parsed.data.name, now: Date.now() })
    );
    await setPlayerCookie(code, token);
    return ok({ playerId });
  } catch (e) {
    return errorResponse(e);
  }
}
