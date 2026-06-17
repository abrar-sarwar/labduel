import { testActionSchema } from "@/lib/shared/schemas";
import { addBots } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { isHost } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// Test/demo helpers so a host can run the whole game solo. Host-only.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");
  if (!(await isHost(code)))
    return fail(403, "forbidden", "Only the host can add test players");

  const parsed = await parseBody(req, testActionSchema);
  if ("response" in parsed) return parsed.response;

  try {
    registry.mutate(code, (state) => addBots(state, parsed.data.count, Date.now()));
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
