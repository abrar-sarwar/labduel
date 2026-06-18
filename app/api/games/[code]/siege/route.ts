import { siegeActionSchema } from "@/lib/shared/schemas";
import { commitAttack, commitDefense } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { getPlayerId } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// Team leaders commit their siege-board picks during the briefing. The engine
// enforces that only the right team's leader may commit, and only pre-reveal.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  const playerId = await getPlayerId(code);
  if (!playerId) return fail(403, "forbidden", "Join the game first");

  const parsed = await parseBody(req, siegeActionSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  try {
    registry.mutate(code, (state) =>
      input.kind === "attack"
        ? commitAttack(state, playerId, input.laneId, Date.now())
        : commitDefense(state, playerId, input.laneIds, Date.now())
    );
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
