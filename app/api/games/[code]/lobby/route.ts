import { lobbyActionSchema } from "@/lib/shared/schemas";
import { setPlayerTeam, pickRole } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { isHost, getPlayerId } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// Lobby + role-reveal assignment actions for "choose"/"host" modes.
//  - pickTeam / pickRole: a player acts on themselves.
//  - setTeam: the host assigns a player to a team.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const game = registry.getGame(code);
  if (!game) return fail(404, "game_not_found", "No game with that code");

  const parsed = await parseBody(req, lobbyActionSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  try {
    if (input.kind === "setTeam") {
      if (!(await isHost(code)))
        return fail(403, "forbidden", "Only the host can assign teams");
      registry.mutate(code, (state) => setPlayerTeam(state, input.playerId, input.team, Date.now()));
      return ok({ ok: true });
    }

    // Player self-service actions.
    const playerId = await getPlayerId(code);
    if (!playerId) return fail(403, "forbidden", "Join the game first");

    if (input.kind === "pickTeam") {
      if (game.settings.teamMode !== "choose")
        return fail(409, "not_allowed", "Team picking is off for this game");
      registry.mutate(code, (state) => setPlayerTeam(state, playerId, input.team, Date.now()));
      return ok({ ok: true });
    }

    // pickRole
    if (game.settings.roleMode !== "choose")
      return fail(409, "not_allowed", "Role picking is off for this game");
    registry.mutate(code, (state) => pickRole(state, playerId, input.roleKey, Date.now()));
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
