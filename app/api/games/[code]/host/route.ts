import { hostActionSchema } from "@/lib/shared/schemas";
import { startGame, advance, forceLock, setInsiderThreat, botsAutoSubmit, botsAutoVote } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { isHost } from "@/lib/server/auth";
import { secureRng } from "@/lib/server/rng";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  if (!(await isHost(code)))
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
        case "enableInsider":
          return setInsiderThreat(state, true, now);
        case "disableInsider":
          return setInsiderThreat(state, false, now);
        default:
          return state;
      }
    });
    // Let test bots play themselves: answer when a round goes live, and cast
    // shop upvotes when the shop opens, so tallies look real.
    if (next.players.some((p) => p.isBot)) {
      if (next.phase === "active") {
        registry.mutate(code, (state, pack) => botsAutoSubmit(state, pack, Date.now(), secureRng));
      } else if (next.phase === "shop") {
        registry.mutate(code, (state) => botsAutoVote(state, Date.now(), secureRng));
      }
    }
    return ok({ phase: next.phase });
  } catch (e) {
    return errorResponse(e);
  }
}
