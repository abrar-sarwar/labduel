# LabDuel — Slice 1 Design ("Playable Skeleton")

**Date:** 2026-06-17
**Status:** Approved — building.

## Product context

LabDuel is a cybersecurity learning platform built around interactive cyber
battles. The first mode is a live, classroom-friendly, red-vs-blue game: "Kahoot
meets tabletop cyber incident response," with competitive, Clash-Royale-style
energy. Red strikes, Blue defends; every round is action and reaction. First
audience: a cybersecurity club running it live with 50+ students.

The platform has three pillars: **LabDuel Live** (host-led classroom mode — the
MVP), **LabDuel Quest** (solo turn-based cyber RPG, later), and **LabDuel Studio**
(creator/instructor tools for authoring scenarios, quests, and packs, later). Only
LabDuel Live is in scope for Slice 1; the architecture, naming, and structured,
versionable content model leave room for Quest and Studio without rework. The full
master prompt (`labduel-master-prompt.md`) is the long-term north star.

## Slice 1 goal

A live host can run a real **2-round** Red-vs-Blue game with ~50 students on their
phones, end to end, and it feels like a game. Everything else (economy, insider
mode, all 9 rounds, characters) layers on later without architectural rework.

## Stack

- **Next.js (App Router) + TypeScript**, **Tailwind + shadcn/ui**, deploy on Vercel.
- **Realtime + persistence behind adapter interfaces.** Slice 1 ships an
  in-process implementation (in-memory authoritative store + SSE broadcast) so the
  app runs locally with zero external accounts — ideal for a club laptop / dev. A
  **Supabase adapter** (Postgres source-of-truth + Supabase Realtime) is the
  documented production swap and changes no engine or UI code.
- **Zod** validates every inbound action. **Vitest** for the engine. **Playwright**
  for the host+players live flow.
- **Game engine** = a pure, server-only TypeScript module. The browser only renders
  state and sends actions — it never computes scores, roles, initiative, or winners.

## Authority & data-flow model (non-negotiable)

Every action (`createGame`, `join`, `submit`, `advancePhase`, `forceLock`, …):
server route → Zod-validate → authorize actor by session token/role → run pure
engine → persist new state → broadcast the **public** state slice.

- **Public channel** (everyone): room code, phase, timer deadline, coin-flip result,
  public mission brief, Red/Blue scores, squad standings, debrief text.
- **Private fetch** (per player, authenticated by session token): that player's own
  task assignment and submission state. Nothing player-specific rides the public
  channel. This is the exact seam the future Insider Threat mode plugs into — it
  changes nothing about the architecture.
- **Identity = per-player session token** (httpOnly cookie), never the display name.
  Refresh / reconnect restores team, squad, role, and submission state.
- **Host-only actions** (start, advance phase, force-lock, override) require the host
  token. Players may submit only for their own assigned task.

## State machine (Slice 1 phases)

`Lobby → RoleReveal → RoundBriefing → Active → SubmissionLock → Debrief`
(loop RoundBriefing→Debrief ×2) `→ FinalResults`

- Coin flip animates on `RoundBriefing → Active`; the winner gets a small
  server-computed **initiative bonus** (a round score multiplier).
- Timers = a **server-stored deadline timestamp**. Clients count down to it; the
  server rejects submissions past it. No always-on timer process required.

## Round mechanic — simultaneous + initiative bonus

Both sides work their squad tasks concurrently (no idle students). The coin-flip
winner gets an initiative score multiplier for that round. The action→reaction
story is told through shared scenario state and the debrief
("Blue deployed MFA → Red's credential-stuffing was blunted — here's why").

## Squad collaboration (no single captain)

- Server auto-balances players into Red/Blue, then into **squads of ~4–6**, and
  assigns each player a role.
- Each round, a squad gets one **squad mission** = a few **connected sub-tasks**,
  distributed by role. Example — Blue squad, Round 1 (phishing): Defender classifies
  the phish · Analyst matches an indicator to a category · Engineer fills the blank
  in the report/detection step · Responder picks the correct first action.
- **Squad score = points from correct sub-tasks; squad succeeds past a correctness
  threshold. Squad scores roll up into the team score.** Small squads simply have
  fewer sub-tasks; a missing role never penalizes.
- Task input types in Slice 1: **classify / multiple-choice**, **match**, and
  **fill-in-from-options** — all simulated, all safe (no copy-pasteable exploit
  content). Red content teaches how attacks work conceptually; Blue teaches
  detection, prevention, response, and tradeoffs.

## Scoring (accuracy-first)

`roundPoints = Σ correct sub-tasks × base, plus a small speed bonus applied only
when correct (scales with time remaining, capped), all × the round's initiative
multiplier for the side that won the flip.` Fast-and-wrong never beats
slow-and-right. All formulas live in the tested engine.

## The 8 views (all present, minimal form)

Landing/explainer · Create game (host) · Join game (student) · Lobby · **Host
dashboard** (start game, advance phase, force-lock, watch submissions roll in, see
reconnects/late joiners) · Player game view (team/squad/role/task/timer/submit/
debrief) · Projector/scoreboard (readable across a room) · Final results + learning
recap.

## Reliability in Slice 1

Reconnect-by-token on refresh; a "reconnecting" indicator if realtime drops; clear
errors for invalid/already-started room codes; late joiners after start land in a
holding state and are auto-placed at the next round boundary (host sees them). Full
manual late-joiner override UI is deferred.

## Content (drafted here, user reviews)

- **Round 1 — Phishing / social-engineering spotting.**
- **Round 2 — Passwords / MFA / account protection.**

Each with: mission brief, Red + Blue squad missions (role sub-tasks), scoring, and a
short debrief. Authored as reviewable TypeScript content packs, kept abstract and
safe.

## Explicitly OUT of Slice 1 (designed-for, not built)

Economy/shop · company damage · insurance · Insider Threat + Checkmate Protocol ·
the other team/role assignment modes · role-rotation toggle · characters/art ·
rounds 3–9 · full host override console · Supabase adapter wiring · LabDuel Quest ·
LabDuel Studio · platform/accounts layer.

## Visual identity

Playful-tactical: clean, energetic, a little dramatic — not cyberpunk-terminal, not
childish. Strong Red/Blue team identity carried by icons, shapes, and labels (not
color alone), with neutral bases and reserved accents for money/warnings/damage
later. Satisfying motion on coin flip, score changes, and round transitions; stable
controls and no layout shift from timers. Mobile-first for the player view; large
and legible for the projector.

## Module boundaries

- `lib/engine/` — pure functions: assignment, round setup, coin flip (seeded),
  validation, scoring, phase transitions, winner calc. No I/O. Heavily unit-tested.
- `lib/content/` — scenario packs (data only), separate from the engine.
- `lib/server/` — `GameStore` + `EventBus` interfaces and the in-memory adapters;
  action handlers (authorize → engine → persist → broadcast).
- `lib/shared/` — types + Zod action schemas shared by client and server.
- `app/` — routes and views (render state, send actions).
