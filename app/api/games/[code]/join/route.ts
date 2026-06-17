import { displayNameSchema } from "@/lib/shared/schemas";
import { z } from "zod";
import { addPlayer } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { makeToken, makeId } from "@/lib/server/ids";
import { setPlayerCookie, getPlayerId } from "@/lib/server/auth";
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
    // Already holding a player session? Treat it as a reconnect. A host can also
    // join as a player from the same browser, which makes solo testing painless.
    const existing = await getPlayerId(code);
    if (existing) {
      return ok({ playerId: existing, reconnected: true });
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
