import { submitTaskSchema } from "@/lib/shared/schemas";
import { applySubmission } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { getPlayerId } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  const playerId = await getPlayerId(code);
  if (!playerId)
    return fail(403, "forbidden", "Only a player in this game can submit");

  const parsed = await parseBody(req, submitTaskSchema);
  if ("response" in parsed) return parsed.response;

  try {
    registry.mutate(code, (state, pack) =>
      // The engine enforces that the task belongs to THIS player's role+side.
      applySubmission(
        state,
        pack,
        playerId,
        parsed.data.taskId,
        parsed.data.answer,
        Date.now()
      )
    );
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
