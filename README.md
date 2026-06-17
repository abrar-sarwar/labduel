# LabDuel

A cybersecurity learning platform built around interactive cyber battles. The
first mode, **LabDuel Live**, is a host-led, red-vs-blue classroom game:
"Kahoot meets tabletop cyber incident response," with Clash-Royale-style
competitive energy. Red strikes, Blue defends, every round.

This repo is **Slice 1**: a complete, playable LabDuel Live skeleton (create →
join → lobby → coin-flip rounds → live scoring → debrief → results) with two safe
scenario rounds (phishing, MFA). Economy, Insider Threat mode, the full 9-round
pack, and the future **Quest** (solo RPG) and **Studio** (creator tools) pillars
are designed-for but not yet built. See
[`docs/superpowers/specs`](docs/superpowers/specs) for the design.

## The three pillars

- **LabDuel Live**, host-led classroom red-vs-blue battles. _(this slice)_
- **LabDuel Quest**, solo, turn-based cyber RPG. _(later)_
- **LabDuel Studio**, creator/instructor tools for authoring content. _(later)_

## Stack

Next.js (App Router) · TypeScript · Tailwind · pure server-owned game engine ·
Zod-validated actions · SSE realtime · Vitest + an HTTP smoke test. Realtime and
persistence sit behind an adapter seam so a Supabase (Postgres + Realtime) backend
drops in later without touching the engine or UI.

## Architecture rule (non-negotiable)

**The server owns the game.** The browser only renders state and sends actions; it
never computes scores, roles, initiative, or winners. Public state and per-player
private data travel on separate channels, task answers and (future) hidden-role
data never reach clients that shouldn't see them.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # engine unit tests (Vitest)
npm run build        # production build
node scripts/smoke.mjs   # end-to-end HTTP smoke test (server must be running)
```

### Try it

1. Open `/create` to host a game → you land on the host dashboard with a room code.
2. Open `/join?code=CODE` in other tabs/phones to join as players.
3. Open `/projector/CODE` on a shared screen.
4. Start the game from the host dashboard and advance through the phases.
