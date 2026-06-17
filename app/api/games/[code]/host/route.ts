import { hostActionSchema } from "@/lib/shared/schemas";
import { startGame, advance, forceLock } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { getActor } from "@/lib/server/auth";
import { secureRng } from "@/lib/server/rng";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  const actor = await getActor(code);
  if (actor.role !== "host")
    return fail(403, "forbidden", "Only the host can do that");

  const parsed = await parseBody(req, hostActionSchema);
  if ("response" in parsed) return parsed.response;

  try {
    const now = Date.now();
    const next = registry.mutate(code, (state, pack) => {
      switch (parsed.data.action) {
        case "start":
          return startGame(state, pack, now, secureRng);
        case "advance":
          return advance(state, pack, now, secureRng);
        case "forceLock":
          return forceLock(state, pack, now, secureRng);
        default:
          return state;
      }
    });
    return ok({ phase: next.phase });
  } catch (e) {
    return errorResponse(e);
  }
}
