// End-to-end smoke test for Insider Threat + Checkmate over the real HTTP API.

const BASE = process.env.BASE ?? "http://localhost:3000";
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
}
const jar = () => new Map();
function applyCookies(j, res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    j.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
const cookieHeader = (j) => [...j].map(([k, v]) => `${k}=${v}`).join("; ");
async function req(j, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(j.size ? { cookie: cookieHeader(j) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  applyCookies(j, res);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const host = jar();
const stranger = jar();

// Create with Insider Threat ON.
const created = await req(host, "POST", "/api/games", { hostName: "Coach", insiderThreat: true, roundSeconds: 90 });
const code = created.json.code;
check("create with insider enabled", created.status === 200 && !!code);

// 6 players → 3 Blue, enough for an insider.
const players = [];
for (let i = 0; i < 6; i++) {
  const j = jar();
  const r = await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` });
  players.push({ jar: j, id: r.json.playerId });
}
check("six players joined", players.length === 6);

await req(host, "POST", `/api/games/${code}/host`, { action: "start" });

// Host moderation reveals the insider.
const mod = await req(host, "GET", `/api/games/${code}/me`);
check("host sees moderation", mod.json.role === "host" && !!mod.json.moderation);
const insiderId = mod.json.moderation.insiderPlayerId;
check("an insider was assigned (>=3 blue)", !!insiderId);
check("checkmate threshold is 2 for 2 rounds", mod.json.moderation.checkmate.threshold === 2);

const insider = players.find((p) => p.id === insiderId);
const innocent = players.find((p) => p.id !== insiderId);

// Public state must not leak insider identity/objective.
const pub = await req(stranger, "GET", `/api/games/${code}/state`);
const pubStr = JSON.stringify(pub.json);
check("public state has no insider flag on players", !pub.json.players.some((p) => "insider" in p));
check("public state has no objective text", !pubStr.includes("false positive"));

// Insider's own view reveals their role; innocent's does not.
const insiderMe = await req(insider.jar, "GET", `/api/games/${code}/me`);
check("insider sees isInsider=true", insiderMe.json.view.you.isInsider === true);
check("insider has an insider payload", insiderMe.json.view.insider !== null);

const innocentMe = await req(innocent.jar, "GET", `/api/games/${code}/me`);
check("innocent sees isInsider=false", innocentMe.json.view.you.isInsider === false);
check("innocent has no insider payload", innocentMe.json.view.insider === null);
check("innocent payload has no objective text", !JSON.stringify(innocentMe.json).includes("false positive"));

// Advance the host until the room reaches a target phase (robust to Shop).
async function advanceUntil(target) {
  let phase = "";
  for (let i = 0; i < 14; i++) {
    const r = await req(host, "POST", `/api/games/${code}/host`, { action: "advance" });
    phase = r.json.phase;
    if (phase === target) break;
  }
  return phase;
}

await advanceUntil("active"); // round 1 active

// A non-insider cannot perform the insider action.
const innocentSabotage = await req(innocent.jar, "POST", `/api/games/${code}/insider`, { choice: "sabotage" });
check("non-insider blocked from insider action", innocentSabotage.status === 400);

// Insider sabotages round 1.
const sab1 = await req(insider.jar, "POST", `/api/games/${code}/insider`, { choice: "sabotage" });
check("insider can sabotage", sab1.status === 200);

// Through the Shop phase into round 2, sabotage again, then to the end.
await advanceUntil("active"); // round 2 active (passes through lock/debrief/shop/briefing)
await req(insider.jar, "POST", `/api/games/${code}/insider`, { choice: "sabotage" });
const finalPhase = await advanceUntil("finalResults");
check("game ended", finalPhase === "finalResults");

const final = await req(stranger, "GET", `/api/games/${code}/state`);
check("checkmate unlocked after sabotaging both rounds", final.json.final.checkmate.unlocked === true);
check("Red wins via Checkmate", final.json.final.winner === "red");
check("insider revealed only at final", typeof final.json.final.checkmate.insiderName === "string");

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
