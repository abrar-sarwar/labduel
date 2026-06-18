import { shopActionSchema } from "@/lib/shared/schemas";
import { buyUpgrade, toggleShopVote } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { getPlayerId } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// Teammates vote for upgrades; ONLY the team's leader commits the purchase.
// The host does not buy, teams own their own strategy.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const game = registry.getGame(code);
  if (!game) return fail(404, "game_not_found", "No game with that code");

  const parsed = await parseBody(req, shopActionSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  const playerId = await getPlayerId(code);

  try {
    if (input.kind === "vote") {
      if (!playerId) return fail(403, "forbidden", "Join the game to vote");
      registry.mutate(code, (state) => toggleShopVote(state, playerId, input.upgradeId, Date.now()));
      return ok({ ok: true });
    }

    // buy: only the team's leader may commit.
    const isLeader = playerId != null && game.leaders[input.team] === playerId;
    if (!isLeader)
      return fail(403, "forbidden", "Only the team leader can buy");

    registry.mutate(code, (state) => buyUpgrade(state, input.team, input.upgradeId, Date.now()));
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
