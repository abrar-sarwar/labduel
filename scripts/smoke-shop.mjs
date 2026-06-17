// End-to-end smoke test for the Shop phase: teammates vote, the leader commits.

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
const created = await req(host, "POST", "/api/games", { hostName: "Coach", roundCount: 9 });
const code = created.json.code;
const players = [];
for (let i = 0; i < 6; i++) {
  const j = jar();
  const r = await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` });
  players.push({ jar: j, id: r.json.playerId });
}
await req(host, "POST", `/api/games/${code}/host`, { action: "start" });
async function advanceUntil(target) {
  let phase = ""; for (let i = 0; i < 14; i++) { const r = await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); phase = r.json.phase; if (phase === target) break; } return phase;
}
const state = () => req(stranger, "GET", `/api/games/${code}/state`).then((r) => r.json);

check("reaches the shop phase", (await advanceUntil("shop")) === "shop");
let st = await state();
check("each team has a leader", !!st.leaders.red && !!st.leaders.blue);
check("public state exposes economy + votes", !!st.economy && !!st.shopVotes);

// Find Blue's leader and a Blue non-leader.
const blueLeader = players.find((p) => p.id === st.leaders.blue);
const blueOther = players.find((p) => st.players.find((q) => q.id === p.id)?.team === "blue" && p.id !== st.leaders.blue);

// A teammate votes.
const vote = await req(blueOther.jar, "POST", `/api/games/${code}/shop`, { kind: "vote", upgradeId: "mfa" });
check("a teammate can upvote", vote.status === 200);
st = await state();
check("the vote shows in public tallies", (st.shopVotes.blue.mfa ?? []).includes(blueOther.id));

// A non-leader cannot buy.
const badBuy = await req(blueOther.jar, "POST", `/api/games/${code}/shop`, { kind: "buy", team: "blue", upgradeId: "mfa" });
check("a non-leader cannot buy (403)", badBuy.status === 403);

// The leader commits the buy.
const before = st.economy.blue.money;
const buy = await req(blueLeader.jar, "POST", `/api/games/${code}/shop`, { kind: "buy", team: "blue", upgradeId: "mfa" });
check("the team leader can buy", buy.status === 200);
st = await state();
check("money deducted + upgrade owned", st.economy.blue.money === before - 320 && st.economy.blue.upgrades.includes("mfa"));

// Host can still buy as a fallback.
const hostBuy = await req(host, "POST", `/api/games/${code}/shop`, { kind: "buy", team: "red", upgradeId: "recon" });
check("host fallback buy works", hostBuy.status === 200);

// Host can change a team's leader.
const newLeader = players.find((p) => st.players.find((q) => q.id === p.id)?.team === "blue" && p.id !== st.leaders.blue);
const setL = await req(host, "POST", `/api/games/${code}/override`, { kind: "setLeader", team: "blue", playerId: newLeader.id });
check("host can change a leader", setL.status === 200);
st = await state();
check("leader updated", st.leaders.blue === newLeader.id);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
