"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicState, PlayerView } from "@/lib/shared/types";

export type ConnStatus = "connecting" | "live" | "reconnecting";

/** Subscribe to the public game state over SSE, with auto-reconnect indication. */
export function useGameStream(code: string) {
  const [pub, setPub] = useState<PublicState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");

  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;

    const connect = () => {
      es = new EventSource(`/api/games/${code}/stream`);
      es.onmessage = (e) => {
        try {
          setPub(JSON.parse(e.data) as PublicState);
          setStatus("live");
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        if (closed) return;
        setStatus("reconnecting");
        // EventSource reconnects on its own; this just surfaces the state.
      };
    };
    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, [code]);

  return { pub, status };
}

export type SessionRole = "host" | "player" | "none" | "loading";

/** Fetch the caller's private view; re-fetch whenever the public `rev` advances. */
export function usePlayerView(code: string, rev: number | undefined) {
  const [role, setRole] = useState<SessionRole>("loading");
  const [view, setView] = useState<PlayerView | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${code}/me`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRole(data.role as SessionRole);
      setView(data.view ?? null);
    } catch {
      /* transient */
    }
  }, [code]);

  useEffect(() => {
    refetch();
  }, [refetch, rev]);

  return { role, view, refetch };
}

/** Live countdown to a deadline (epoch ms). Stable layout, updates 4x/sec. */
export function useCountdown(deadline: number | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (deadline == null) return;
    raf.current = setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (raf.current) clearInterval(raf.current);
    };
  }, [deadline]);

  if (deadline == null) return { msLeft: null, label: "--:--", fraction: 0 };
  const msLeft = Math.max(0, deadline - now);
  const totalSec = Math.ceil(msLeft / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;
  return { msLeft, label, fraction: msLeft > 0 ? 1 : 0 };
}

/** POST a JSON action to the API; returns parsed data or throws with a message. */
export async function postAction<T = unknown>(
  url: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Request failed");
  }
  return data as T;
}
