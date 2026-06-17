// Smoke test: a full 9-round game traverses every round and reaches results.
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

const host = jar();
const created = await req(host, "POST", "/api/games", { hostName: "Coach", roundCount: 9, roundSeconds: 90, insiderThreat: true });
const code = created.json.code;
check("created a 9-round game", created.status === 200);
for (let i = 0; i < 8; i++) {
  const j = jar();
  await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` });
}
await req(host, "POST", `/api/games/${code}/host`, { action: "start" });

const titlesSeen = new Set();
let phase = "roleReveal";
let guard = 0;
const stranger = jar();
while (phase !== "finalResults" && guard++ < 120) {
  const r = await req(host, "POST", `/api/games/${code}/host`, { action: "advance" });
  phase = r.json.phase;
  const st = await req(stranger, "GET", `/api/games/${code}/state`);
  if (st.json.round?.title) titlesSeen.add(st.json.round.title);
}
check("reached final results", phase === "finalResults");
const final = await req(stranger, "GET", `/api/games/${code}/state`);
check("played through all 9 round titles", titlesSeen.size === 9);
check("final round index is 8 (round 9)", final.json.roundIndex === 8);
check("final result has a winner", ["red", "blue", "tie"].includes(final.json.final.winner));
check("recap lists all 9 rounds", final.json.final.recap.length === 9);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
