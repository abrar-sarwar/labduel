import { registry } from "@/lib/server/registry";
import { getActor } from "@/lib/server/auth";
import { toPlayerView } from "@/lib/engine";
import { ok, fail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Returns the caller's role and, for players, their PRIVATE view (own tasks only).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const game = registry.getGame(code);
  if (!game) return fail(404, "game_not_found", "No game with that code");

  const actor = await getActor(code);
  if (actor.role === "host") return ok({ role: "host" });
  if (actor.role === "player") {
    const view = toPlayerView(game, registry.packFor(game), actor.playerId);
    return ok({ role: "player", view });
  }
  return ok({ role: "none" });
}
