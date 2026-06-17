import { insiderActionSchema } from "@/lib/shared/schemas";
import { applyInsiderAction } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { getActor } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// The insider chooses to sabotage (or lay low) for the current round.
// The engine enforces that ONLY the assigned insider may do this.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  const actor = await getActor(code);
  if (actor.role !== "player")
    return fail(403, "forbidden", "Only a player can do that");

  const parsed = await parseBody(req, insiderActionSchema);
  if ("response" in parsed) return parsed.response;

  try {
    registry.mutate(code, (state, pack) =>
      applyInsiderAction(state, pack, actor.playerId, parsed.data.choice, Date.now())
    );
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
