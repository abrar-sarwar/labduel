import { registry } from "@/lib/server/registry";
import { ok, fail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const state = registry.publicState(code);
  if (!state) return fail(404, "game_not_found", "No game with that code");
  return ok(state);
}
