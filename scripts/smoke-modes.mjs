// HTTP smoke test for assignment modes (team choose/host, role hidden/choose).
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
async function newGame(settings) {
  const host = jar();
  const { json } = await req(host, "POST", "/api/games", { hostName: "Coach", ...settings });
  const code = json.code;
  const players = [];
  for (let i = 0; i < 6; i++) { const j = jar(); const r = await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` }); players.push({ jar: j, id: r.json.playerId }); }
  return { host, code, players };
}
const state = (j, code) => req(j, "GET", `/api/games/${code}/state`).then((r) => r.json);

// ---- Team mode: players choose ----
{
  const { host, code, players } = await newGame({ teamMode: "choose", roleMode: "random" });
  await req(players[0].jar, "POST", `/api/games/${code}/lobby`, { kind: "pickTeam", team: "red" });
  await req(players[1].jar, "POST", `/api/games/${code}/lobby`, { kind: "pickTeam", team: "blue" });
  let st = await state(host, code);
  check("player pick sets their team in lobby", st.players.find((p) => p.id === players[0].id).team === "red");
  // host override of a pick
  await req(host, "POST", `/api/games/${code}/lobby`, { kind: "setTeam", playerId: players[2].id, team: "blue" });
  st = await state(host, code);
  check("host can override a team in lobby", st.players.find((p) => p.id === players[2].id).team === "blue");
  await req(host, "POST", `/api/games/${code}/host`, { action: "start" });
  st = await state(host, code);
  check("picked teams survive start", st.players.find((p) => p.id === players[0].id).team === "red");
}

// ---- Team mode: auto rejects player picking ----
{
  const { code, players } = await newGame({ teamMode: "auto" });
  const r = await req(players[0].jar, "POST", `/api/games/${code}/lobby`, { kind: "pickTeam", team: "red" });
  check("pickTeam blocked when teamMode is auto (409)", r.status === 409);
}

// ---- Team mode: host assigns ----
{
  const { host, code, players } = await newGame({ teamMode: "host" });
  for (let i = 0; i < 6; i++) await req(host, "POST", `/api/games/${code}/lobby`, { kind: "setTeam", playerId: players[i].id, team: i % 2 ? "blue" : "red" });
  const st = await state(host, code);
  check("host assigned all teams", st.players.every((p) => p.team));
}

// ---- Role mode: hidden ----
{
  const { host, code, players } = await newGame({ roleMode: "hidden" });
  await req(host, "POST", `/api/games/${code}/host`, { action: "start" });
  const stranger = jar();
  const pub = await state(stranger, code);
  check("hidden roles: no role exposed publicly", pub.players.every((p) => p.roleKey === null));
  const me = await req(players[0].jar, "GET", `/api/games/${code}/me?as=player`);
  check("hidden roles: a player still sees their OWN role", me.json.view.you.role !== null);
  const others = me.json.view.squad.members.filter((m) => m.name !== me.json.view.you.name);
  check("hidden roles: teammates' roles are hidden", others.every((m) => m.roleName === null));
}

// ---- Role mode: players choose ----
{
  const { host, code, players } = await newGame({ roleMode: "choose" });
  await req(host, "POST", `/api/games/${code}/host`, { action: "start" }); // -> roleReveal, roles null
  let pub = await state(host, code);
  check("choose roles: unassigned at start", pub.players.every((p) => p.roleKey === null));
  const me0 = await req(players[0].jar, "GET", `/api/games/${code}/me?as=player`);
  const myTeam = me0.json.view.you.team;
  const wantRole = myTeam === "blue" ? "engineer" : "operator";
  const pr = await req(players[0].jar, "POST", `/api/games/${code}/lobby`, { kind: "pickRole", roleKey: wantRole });
  check("choose roles: a player can claim a role", pr.status === 200);
  await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); // backfill
  pub = await state(host, code);
  check("choose roles: everyone has a role after the round begins", pub.players.filter((p) => p.status === "active").every((p) => p.roleKey));
}

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
