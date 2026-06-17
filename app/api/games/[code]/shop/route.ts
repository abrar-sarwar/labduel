import { buyUpgradeSchema } from "@/lib/shared/schemas";
import { buyUpgrade } from "@/lib/engine";
import { registry } from "@/lib/server/registry";
import { isHost } from "@/lib/server/auth";
import { ok, fail, parseBody, errorResponse } from "@/lib/server/http";

// Host enters the team's purchase decision during the Shop phase (MVP: host
// approves the final call; team voting is a later enhancement).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) return fail(404, "game_not_found", "No game with that code");

  if (!(await isHost(code)))
    return fail(403, "forbidden", "Only the host can make purchases");

  const parsed = await parseBody(req, buyUpgradeSchema);
  if ("response" in parsed) return parsed.response;

  try {
    registry.mutate(code, (state) =>
      buyUpgrade(state, parsed.data.team, parsed.data.upgradeId, Date.now())
    );
    return ok({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
