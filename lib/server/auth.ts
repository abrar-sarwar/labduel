// Cookie-based identity. Identity is a session token, never the display name.
// A person can be host of one game and a player in another simultaneously, so
// cookies are namespaced per room code.

import { cookies } from "next/headers";
import { registry } from "./registry";

const MAX_AGE = 60 * 60 * 8; // 8 hours

function hostCookie(code: string): string {
  return `labduel_host_${code.toUpperCase()}`;
}
function playerCookie(code: string): string {
  return `labduel_player_${code.toUpperCase()}`;
}

export type Actor =
  | { role: "host" }
  | { role: "player"; playerId: string }
  | { role: "none" };

export async function getActor(code: string): Promise<Actor> {
  const game = registry.getGame(code);
  if (!game) return { role: "none" };
  const store = await cookies();

  const host = store.get(hostCookie(code))?.value;
  if (host && host === game.hostToken) return { role: "host" };

  const ptok = store.get(playerCookie(code))?.value;
  if (ptok) {
    const player = game.players.find((p) => p.token === ptok);
    if (player) return { role: "player", playerId: player.id };
  }
  return { role: "none" };
}

// Per-route identity checks. These are independent, so a single browser can hold
// both a host session and a player session for the same room (handy for solo
// testing and demos): host routes check the host cookie, player routes check the
// player cookie, and neither blocks the other.

export async function isHost(code: string): Promise<boolean> {
  const game = registry.getGame(code);
  if (!game) return false;
  const store = await cookies();
  return store.get(hostCookie(code))?.value === game.hostToken;
}

export async function getPlayerId(code: string): Promise<string | null> {
  const game = registry.getGame(code);
  if (!game) return null;
  const store = await cookies();
  const ptok = store.get(playerCookie(code))?.value;
  if (!ptok) return null;
  return game.players.find((p) => p.token === ptok)?.id ?? null;
}

export async function setHostCookie(code: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(hostCookie(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function setPlayerCookie(code: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(playerCookie(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}
