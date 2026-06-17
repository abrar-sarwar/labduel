// In-memory authoritative game registry + realtime fan-out.
//
// This is the Slice 1 implementation of the GameStore + EventBus seam. The whole
// app talks to it only through `mutate` / `getGame` / `subscribe`, so a Supabase
// adapter (Postgres source-of-truth + Realtime broadcast) can replace it later
// without touching engine, routes, or UI.
//
// State lives on globalThis so it survives Next.js dev hot-reloads and is shared
// across route invocations within the single server process.

import type { GameState, PublicState } from "../shared/types";
import type { ScenarioPack } from "../shared/content-types";
import { getPack } from "../content/pack-01";
import { toPublicState } from "../engine";

type Listener = (state: PublicState) => void;

class GameRegistry {
  private games = new Map<string, GameState>();
  private listeners = new Map<string, Set<Listener>>();

  has(code: string): boolean {
    return this.games.has(code.toUpperCase());
  }

  getGame(code: string): GameState | undefined {
    return this.games.get(code.toUpperCase());
  }

  packFor(state: GameState): ScenarioPack {
    return getPack(state.packId);
  }

  create(state: GameState): GameState {
    this.games.set(state.code.toUpperCase(), state);
    return state;
  }

  /** Apply a pure transition, persist the result, and broadcast public state. */
  mutate(code: string, fn: (state: GameState, pack: ScenarioPack) => GameState): GameState {
    const key = code.toUpperCase();
    const current = this.games.get(key);
    if (!current) throw new Error("game_not_found");
    const pack = this.packFor(current);
    const next = fn(current, pack);
    this.games.set(key, next);
    this.broadcast(next);
    return next;
  }

  publicState(code: string): PublicState | undefined {
    const state = this.getGame(code);
    if (!state) return undefined;
    return toPublicState(state, this.packFor(state));
  }

  subscribe(code: string, listener: Listener): () => void {
    const key = code.toUpperCase();
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  private broadcast(state: GameState): void {
    const set = this.listeners.get(state.code.toUpperCase());
    if (!set || set.size === 0) return;
    const pub = toPublicState(state, this.packFor(state));
    for (const listener of set) {
      try {
        listener(pub);
      } catch {
        /* a dead SSE connection shouldn't break the broadcast */
      }
    }
  }
}

const globalForRegistry = globalThis as unknown as { __labduelRegistry?: GameRegistry };

export const registry: GameRegistry =
  globalForRegistry.__labduelRegistry ?? (globalForRegistry.__labduelRegistry = new GameRegistry());
