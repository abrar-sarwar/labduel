// End-to-end smoke test for the host override console.
const BASE = process.env.BASE ?? "http://localhost:3000";
let failures = 0;
const check = (n, c) => { console.log(`${c ? "✓" : "✗"} ${n}`); if (!c) failures++; };
const jar = () => new Map();
function applyCookies(j, res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [p] = c.split(";"); const i = p.indexOf("="); j.set(p.slice(0, i), p.slice(i + 1));
  }
}
const ch = (j) => [...j].map(([k, v]) => `${k}=${v}`).join("; ");
async function req(j, m, path, body) {
  const res = await fetch(BASE + path, {
    method: m,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(j.size ? { cookie: ch(j) } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  applyCookies(j, res);
  const t = await res.text(); let json; try { json = JSON.parse(t); } catch { json = t; }
  return { status: res.status, json };
}
const state = async (j = stranger) => (await req(j, "GET", `/api/games/${code}/state`)).json;
const find = (st, id) => st.players.find((p) => p.id === id);

const host = jar();
const stranger = jar();
const created = await req(host, "POST", "/api/games", { hostName: "Coach", roundCount: 9 });
const code = created.json.code;
const players = [];
for (let i = 0; i < 8; i++) {
  const j = jar();
  const r = await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` });
  players.push({ jar: j, id: r.json.playerId });
}
await req(host, "POST", `/api/games/${code}/host`, { action: "start" });

let st = await state();
const redPlayer = st.players.find((p) => p.team === "red");
const blueSquad = st.squads.find((s) => s.team === "blue");
const oldSquadId = redPlayer.squadId;

// A player cannot use the override endpoint.
const playerTry = await req(players[0].jar, "POST", `/api/games/${code}/override`, {
  kind: "reassign", playerId: redPlayer.id, team: "blue", squadId: blueSquad.id, roleKey: "analyst",
});
check("player blocked from override (403)", playerTry.status === 403);

// Host reassigns a Red player to a Blue squad as Analyst.
const ra = await req(host, "POST", `/api/games/${code}/override`, {
  kind: "reassign", playerId: redPlayer.id, team: "blue", squadId: blueSquad.id, roleKey: "analyst",
});
check("host reassign succeeds", ra.status === 200);
st = await state();
const moved = find(st, redPlayer.id);
check("player moved to Blue", moved.team === "blue");
check("player moved to the chosen squad + role", moved.squadId === blueSquad.id && moved.roleKey === "analyst");
check("player removed from old squad", !st.squads.find((s) => s.id === oldSquadId).memberNames.includes(moved.name));
check("player appears in exactly one squad", st.squads.filter((s) => s.memberNames.includes(moved.name)).length === 1);

// Invalid role for team is rejected.
const badRole = await req(host, "POST", `/api/games/${code}/override`, {
  kind: "reassign", playerId: moved.id, roleKey: "recon",
});
check("invalid role for team rejected (400)", badRole.status === 400);

// Go live, then handle late joiners.
async function advanceUntil(target) {
  let phase = ""; for (let i = 0; i < 14; i++) { const r = await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); phase = r.json.phase; if (phase === target) break; } return phase;
}
await advanceUntil("active");

const late1 = jar();
const l1 = await req(late1, "POST", `/api/games/${code}/join`, { name: "LateDefer" });
const late2 = jar();
const l2 = await req(late2, "POST", `/api/games/${code}/join`, { name: "LateNow" });
st = await state();
check("late joiners are waiting", st.waitingCount === 2);

// Defer one to next round.
await req(host, "POST", `/api/games/${code}/override`, { kind: "assignWaiting", playerId: l1.json.playerId, team: "blue", roleKey: "responder", joinNow: false });
st = await state();
check("deferred late joiner stays waiting with a team", find(st, l1.json.playerId).status === "waiting" && find(st, l1.json.playerId).team === "blue");

// Bring the other in right now.
await req(host, "POST", `/api/games/${code}/override`, { kind: "assignWaiting", playerId: l2.json.playerId, team: "red", joinNow: true });
st = await state();
check("join-now late joiner is active immediately", find(st, l2.json.playerId).status === "active" && find(st, l2.json.playerId).team === "red");

// Next round: the deferred joiner is activated and seated.
await advanceUntil("active"); // round 2 active
st = await state();
const deferred = find(st, l1.json.playerId);
check("deferred joiner activated next round", deferred.status === "active" && deferred.team === "blue");
check("deferred joiner seated on a squad", st.squads.some((s) => s.memberNames.includes("LateDefer")));

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
