// End-to-end smoke test for the Shop / economy phase over the real HTTP API.

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

const created = await req(host, "POST", "/api/games", { hostName: "Coach", roundSeconds: 90 });
const code = created.json.code;
const players = [];
for (let i = 0; i < 6; i++) {
  const j = jar();
  await req(j, "POST", `/api/games/${code}/join`, { name: `P${i}` });
  players.push(j);
}
await req(host, "POST", `/api/games/${code}/host`, { action: "start" });

async function advanceUntil(target) {
  let phase = "";
  for (let i = 0; i < 14; i++) {
    const r = await req(host, "POST", `/api/games/${code}/host`, { action: "advance" });
    phase = r.json.phase;
    if (phase === target) break;
  }
  return phase;
}

// Run round 1 to the shop.
const shopPhase = await advanceUntil("shop");
check("reaches the shop phase between rounds", shopPhase === "shop");

const pre = await req(stranger, "GET", `/api/games/${code}/state`);
check("public state exposes economy", !!pre.json.economy && typeof pre.json.economy.red.money === "number");
check("each team got shop income", pre.json.economy.blue.money >= 1100);
check("company damage is present", typeof pre.json.companyDamage === "number");
const blueBefore = pre.json.economy.blue.money;

// A player cannot buy — only the host.
const playerBuy = await req(players[0], "POST", `/api/games/${code}/shop`, { team: "blue", upgradeId: "mfa" });
check("player blocked from buying (403)", playerBuy.status === 403);

// Host buys MFA for Blue.
const buy = await req(host, "POST", `/api/games/${code}/shop`, { team: "blue", upgradeId: "mfa" });
check("host can buy an upgrade", buy.status === 200);
const afterBuy = await req(stranger, "GET", `/api/games/${code}/state`);
check("money was deducted (320)", afterBuy.json.economy.blue.money === blueBefore - 320);
check("upgrade shows as owned", afterBuy.json.economy.blue.upgrades.includes("mfa"));

// Cannot buy the same thing twice.
const dup = await req(host, "POST", `/api/games/${code}/shop`, { team: "blue", upgradeId: "mfa" });
check("cannot buy the same upgrade twice (400)", dup.status === 400);

// Insurance: money up, premium up.
const beforeIns = (await req(stranger, "GET", `/api/games/${code}/state`)).json.economy.red.money;
await req(host, "POST", `/api/games/${code}/shop`, { team: "red", upgradeId: "warchest" });
const afterIns = await req(stranger, "GET", `/api/games/${code}/state`);
check("insurance nets money now", afterIns.json.economy.red.money === beforeIns - 120 + 450);
check("insurance adds a premium", afterIns.json.economy.red.premium === 110);

// Offensive buy raises company damage.
const dmgBefore = afterIns.json.companyDamage;
await req(host, "POST", `/api/games/${code}/shop`, { team: "red", upgradeId: "breach" });
const dmgAfter = await req(stranger, "GET", `/api/games/${code}/state`);
check("'Press the Breach' raises company damage by 20", dmgAfter.json.companyDamage === dmgBefore + 20);

// Buying closes once we leave the shop.
await advanceUntil("active"); // start round 2
const closed = await req(host, "POST", `/api/games/${code}/shop`, { team: "blue", upgradeId: "edr" });
check("shop is closed outside the shop phase (400)", closed.status === 400);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
