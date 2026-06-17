import { registry } from "@/lib/server/registry";
import { getActor } from "@/lib/server/auth";
import { setConnected } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-Sent Events stream of public game state. (This is the EventBus seam;
// a Supabase Realtime adapter would replace it without touching clients.)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!registry.has(code)) {
    return new Response("game_not_found", { status: 404 });
  }
  const actor = await getActor(code);
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const markConnected = (connected: boolean) => {
    if (actor.role !== "player") return;
    try {
      registry.mutate(code, (s) =>
        setConnected(s, actor.playerId, connected, Date.now())
      );
    } catch {
      /* game may be gone */
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* controller closed */
        }
      };
      const initial = registry.publicState(code);
      if (initial) send(initial);
      unsubscribe = registry.subscribe(code, send);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);
      markConnected(true);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
      markConnected(false);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
