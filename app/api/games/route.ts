import { createGameSchema } from "@/lib/shared/schemas";
import { createGameState } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { makeRoomCode, makeToken, makeId } from "@/lib/server/ids";
import { setHostCookie } from "@/lib/server/auth";
import { DEFAULT_PACK_ID } from "@/lib/content/pack-01";
import { ok, parseBody, errorResponse } from "@/lib/server/http";

export async function POST(req: Request) {
  const parsed = await parseBody(req, createGameSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  try {
    let code = makeRoomCode();
    let guard = 0;
    while (registry.has(code) && guard++ < 50) code = makeRoomCode();

    const hostToken = makeToken();
    const state = createGameState({
      id: makeId("game"),
      code,
      hostToken,
      hostName: input.hostName,
      packId: DEFAULT_PACK_ID,
      settings: {
        roundCount: input.roundCount,
        squadSize: input.squadSize,
        roundSeconds: input.roundSeconds,
      },
      now: Date.now(),
    });
    registry.create(state);
    await setHostCookie(code, hostToken);
    return ok({ code });
  } catch (e) {
    return errorResponse(e);
  }
}
