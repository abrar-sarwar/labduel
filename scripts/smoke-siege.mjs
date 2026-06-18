// End-to-end smoke test for the siege board (commit, hide, reveal, breach/parry).
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
const stranger = jar();
const code = (await req(host, "POST", "/api/games", { hostName: "Coach" })).json.code;
const players = [];
for (let i = 0; i < 6; i++) {
  const j = jar();
  const r = await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` });
  players.push({ jar: j, id: r.json.playerId });
}
await req(host, "POST", `/api/games/${code}/host`, { action: "start" }); // roleReveal
await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); // roundBriefing
const state = () => req(stranger, "GET", `/api/games/${code}/state`).then((r) => r.json);

let st = await state();
check("siege present and unrevealed at briefing", st.siege && st.siege.revealed === false);
check("defense slots default to 2", st.siege.defenseSlots === 2);
const redLeaderId = st.leaders.red;
const blueLeaderId = st.leaders.blue;
const redLeader = players.find((p) => p.id === redLeaderId);
const blueLeader = players.find((p) => p.id === blueLeaderId);
const someoneElse = players.find((p) => p.id !== redLeaderId && p.id !== blueLeaderId);

// Non-leader cannot commit.
const bad = await req(someoneElse.jar, "POST", `/api/games/${code}/siege`, { kind: "attack", laneId: "cloud" });
check("non-leader cannot commit attack (400)", bad.status === 400);

// Red leader attacks cloud; Blue leader defends identity+people.
check("red leader commits attack", (await req(redLeader.jar, "POST", `/api/games/${code}/siege`, { kind: "attack", laneId: "cloud" })).status === 200);
check("blue leader commits defense", (await req(blueLeader.jar, "POST", `/api/games/${code}/siege`, { kind: "defense", laneIds: ["identity", "people"] })).status === 200);

// Over-slot rejected.
const over = await req(blueLeader.jar, "POST", `/api/games/${code}/siege`, { kind: "defense", laneIds: ["identity", "people", "cloud"] });
check("over-slot defense rejected (400)", over.status === 400);

st = await state();
check("commit progress public, lanes hidden", st.siege.redCommitted === true && st.siege.blueDefendedCount === 2 && st.siege.attackLane === null);
check("attacked lane not leaked pre-reveal", !JSON.stringify(st.siege).includes("cloud"));

// Red leader sees own pick; Blue can't see Red's.
const redMe = await req(redLeader.jar, "GET", `/api/games/${code}/me?as=player`);
check("red leader sees own attack lane", redMe.json.view.siege.myAttack === "cloud");
const blueMe = await req(blueLeader.jar, "GET", `/api/games/${code}/me?as=player`);
check("blue cannot see red's attack", blueMe.json.view.siege.myAttack === null);

// Reveal by starting the round.
const dmgBefore = st.companyDamage;
await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); // -> active, resolve
st = await state();
check("siege revealed at round start", st.siege.revealed === true);
check("undefended lane => breach", st.siege.outcome === "breach" && st.siege.attackLane === "cloud");
check("breach raised company damage", st.companyDamage > dmgBefore);
check("breach scored for Red", st.scores.red > 0);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
