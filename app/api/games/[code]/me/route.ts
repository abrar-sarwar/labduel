import { registry } from "@/lib/server/registry";
import { isHost, getPlayerId } from "@/lib/server/auth";
import { toPlayerView, hostModeration } from "@/lib/engine";
import { ok, fail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// Returns the caller's role and, for players, their PRIVATE view (own tasks only).
// `?as=player` forces the player identity even if this browser is also the host,
// so the host can preview the player view in another tab (great for solo testing).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const game = registry.getGame(code);
  if (!game) return fail(404, "game_not_found", "No game with that code");

  const asPlayer = new URL(req.url).searchParams.get("as") === "player";
  const playerId = await getPlayerId(code);

  if (!asPlayer && (await isHost(code))) {
    // Host-only moderation: insider identity + live Checkmate progress.
    return ok({ role: "host", moderation: hostModeration(game) });
  }
  if (playerId) {
    const view = toPlayerView(game, registry.packFor(game), playerId);
    return ok({ role: "player", view });
  }
  return ok({ role: "none" });
}
