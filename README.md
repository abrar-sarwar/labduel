# LabDuel

A cybersecurity learning platform built around interactive cyber battles. The
first mode, **LabDuel Live**, is a host-led red-vs-blue classroom game: "Kahoot
meets a tabletop incident response," with Clash-Royale-style competitive energy.
Red strikes, Blue defends, every round.

A host creates a room, students join with a short code from any phone or laptop,
and the whole room plays a multi-round cyber incident together: pick teams and
roles, fight over a castle/siege board, complete simulated tasks, spend a team
budget, and watch a company's breach meter climb or hold.

## What's in here

LabDuel Live is feature-complete for a real club session:

- **Live rooms** with short codes, a lobby, late-joiners, and reconnect-on-refresh.
- **Teams, squads, and roles** with three assignment modes each (auto / players
  choose / host assigns for teams; visible-random / hidden / players-choose for roles).
- **9-round scenario pack** (phishing → MFA → secrets → web input → detection →
  injection/auth bypass → containment → evasion → full incident). All content is
  simulated and safe, no copy-pasteable exploits.
- **Coin-flip initiative** and a **Siege Board** each round: Red's leader attacks
  one of five lanes (Perimeter, Identity, Cloud, Endpoints, People); Blue's leader
  defends a limited set; reveal shows breach or parry and explains the matchup.
- **Tasks**: classify, match, fill-in, and type-the-command, distributed by role so
  squads collaborate.
- **Insider Threat + Checkmate Protocol** (optional): one secret Blue saboteur who
  can flip the win for Red. Hidden-role data never leaks to other clients.
- **Economy / shop**: shared team budgets, teammates vote and the **team leader**
  commits the buys (the host does not), a company-damage breach meter, and insurance.
- **Host override console**: reassign teams/squads/roles and place late joiners
  without restarting.
- **Test bots**: fill a room with one click so you can run a whole game solo; bots
  answer, vote, and commit siege moves.
- Eight views: landing, create, join, lobby, host dashboard, player, projector,
  results, in a security-operations-console style.

The future pillars, **LabDuel Quest** (solo turn-based RPG) and **LabDuel Studio**
(content authoring), are designed-for but not built. See
[`docs/superpowers/specs`](docs/superpowers/specs) for the full design.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · a pure, server-owned game engine
· Zod-validated actions · Server-Sent Events for realtime · Vitest unit tests + HTTP
smoke tests. State is in-memory behind an adapter seam, so a Supabase
(Postgres + Realtime) backend can drop in later without touching the engine or UI.

**Architecture rule:** the server owns the game. The browser only renders state and
sends actions; it never computes scores, roles, initiative, or winners. Public
state and per-player private data travel on separate channels, so task answers and
hidden-role data never reach clients that shouldn't see them.

## Requirements

- **Node.js 18.18+** (developed on Node 22/25) and npm.
- No database, accounts, or API keys needed for local play, it runs entirely
  in-memory. (Note: because state is in memory, restarting the dev server clears
  any in-progress games.)

## Setup

```bash
git clone https://github.com/abrar-sarwar/labduel.git
cd labduel
npm install
npm run dev
```

Open http://localhost:3000.

To let phones/laptops on the same Wi-Fi join, bind to all interfaces and use your
machine's LAN IP:

```bash
npm run dev -- -H 0.0.0.0 -p 3000
# then on other devices: http://<your-LAN-IP>:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (hot reload) |
| `npm run build` | Production build |
| `npm start` | Run the production build (`next start`) |
| `npm test` | Engine + content unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next.js lint |
| `node scripts/smoke-*.mjs` | End-to-end HTTP tests (need a running server) |

The smoke tests run against a server on `BASE` (default `http://localhost:3000`):

```bash
npm run build && npm start &        # or: npm run dev
BASE=http://localhost:3000 node scripts/smoke.mjs          # core flow
#   smoke-siege / smoke-shop / smoke-insider / smoke-modes / smoke-override / smoke-full
```

> Tip: `next dev` and `next start` share the `.next` folder. If you switch between
> them and the server returns 404/500 for API routes, run `rm -rf .next` and restart.

## How to run a game

1. **Create** a game at `/create` (pick rounds, squad size, team/role modes, and
   optionally toggle Insider Threat). You land on the **host dashboard** with a room code.
2. **Players join** at `/join` with the code from their own devices.
3. Open the **projector** view at `/projector/CODE` on a shared screen.
4. **Start** from the host dashboard and use the host controls to advance through
   each phase: role assignment → briefing + coin flip + siege board → live round →
   lock → debrief → strategy shop → next round → final results.

### Testing it solo (no roomful of people)

- On the host dashboard lobby there is a **Test mode** box, click **+6 bots** (or
  +12). They join as players and auto-play (answer tasks, vote in the shop, commit
  siege moves), so you can run an entire game by yourself.
- A single browser holds one host session and one player session, so to also see
  the **player** view, open `/join` in another tab and join. To drive a team's
  shop/siege as a player, make yourself that team's leader from the host shop panel.
- For multiple distinct players on one machine, use separate browsers or incognito
  windows.

## Project structure

```
app/                  Next.js routes (views + /api route handlers)
components/           React UI (console design system, game widgets, siege board)
lib/engine/           Pure game engine (assignment, rounds, scoring, siege,
                      economy, insider, overrides) + Vitest tests
lib/content/          Scenario pack, upgrades, and siege lanes (data only)
lib/server/           In-memory registry (store + SSE bus), cookie auth, ids
lib/shared/           Types + Zod schemas shared by client and server
scripts/              HTTP smoke tests
docs/superpowers/specs Design spec
```
