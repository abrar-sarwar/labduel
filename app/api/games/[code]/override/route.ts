import { overrideSchema } from "@/lib/shared/schemas";
import { reassignPlayer, assignWaiting, setLeader } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { isHost } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// Host override console: manual team/squad/role reassignment and late-joiner
// placement. Host-only.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  if (!(await isHost(code)))
    return fail(403, "forbidden", "Only the host can override assignments");

  const parsed = await parseBody(req, overrideSchema);
  if ("response" in parsed) return parsed.response;
  const input = parsed.data;

  try {
    registry.mutate(code, (state) => {
      const now = Date.now();
      if (input.kind === "reassign") {
        return reassignPlayer(
          state,
          input.playerId,
          { team: input.team, squadId: input.squadId, roleKey: input.roleKey },
          now
        );
      }
      if (input.kind === "setLeader") {
        return setLeader(state, input.team, input.playerId, now);
      }
      return assignWaiting(
        state,
        input.playerId,
        { team: input.team, squadId: input.squadId, roleKey: input.roleKey, joinNow: input.joinNow },
        now
      );
    });
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
