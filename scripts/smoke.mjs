// End-to-end smoke test over the real HTTP API + cookies.
// Drives host + 2 players through a full 2-round game and asserts the
// security boundaries and scoring wiring hold.

const BASE = process.env.BASE ?? "http://localhost:3000";
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
}

function jar() {
  return new Map();
}
function applyCookies(j, res) {
  const sc = res.headers.getSetCookie?.() ?? [];
  for (const c of sc) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    j.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
function cookieHeader(j) {
  return [...j].map(([k, v]) => `${k}=${v}`).join("; ");
}
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
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const host = jar();
const p1 = jar();
const p2 = jar();
const stranger = jar();

// 1. Create
const created = await req(host, "POST", "/api/games", { hostName: "Coach", roundSeconds: 90 });
check("create returns a code", created.status === 200 && /^[A-Z0-9]{4,6}$/.test(created.json.code));
const code = created.json.code;

// 2. Join
const j1 = await req(p1, "POST", `/api/games/${code}/join`, { name: "Alice" });
const j2 = await req(p2, "POST", `/api/games/${code}/join`, { name: "Bob" });
check("two players join", j1.status === 200 && j2.status === 200);

// 3. Non-host cannot start
const sneaky = await req(p1, "POST", `/api/games/${code}/host`, { action: "start" });
check("player cannot perform host action (403)", sneaky.status === 403);

// 4. Host starts
const start = await req(host, "POST", `/api/games/${code}/host`, { action: "start" });
check("host starts game", start.status === 200 && start.json.phase === "roleReveal");

// 5. Public state never leaks tokens/answers
const pub1 = await req(stranger, "GET", `/api/games/${code}/state`);
const pubStr = JSON.stringify(pub1.json);
check("public state has no tokens", !/"token"/.test(pubStr) && !pubStr.includes(host.get("parelyit_host_" + code)));
check("public state has no answerId/answer", !/"answerId"/.test(pubStr) && !/"answer":/.test(pubStr));
check("players are assigned to teams", pub1.json.players.every((p) => p.team));

// 6. Advance to active
await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); // briefing
await req(host, "POST", `/api/games/${code}/host`, { action: "advance" }); // active
const pub2 = await req(stranger, "GET", `/api/games/${code}/state`);
check("phase is active", pub2.json.phase === "active");

// 7. Player /me returns only their own tasks, no answers
const me1 = await req(p1, "GET", `/api/games/${code}/me`);
check("player view role", me1.json.role === "player");
const myTasks = me1.json.view.tasks;
const myStr = JSON.stringify(me1.json);
check("player tasks carry no answer key", !/"answerId"/.test(myStr) && !/"answer":/.test(myStr));
check("player has at least one task", myTasks.length >= 1);
const myRole = me1.json.view.you.role.key;
check("all my tasks match my role", myTasks.every((t) => t.task.roleKey === myRole));

// 8. Stranger (no session) cannot submit
const strangerSubmit = await req(stranger, "POST", `/api/games/${code}/submit`, {
  taskId: myTasks[0].task.id,
  answer: { optionId: "a" },
});
check("stranger cannot submit (403)", strangerSubmit.status === 403);

// 9. Player submits to a task that isn't theirs -> rejected
const otherTeamTaskId = myRole.startsWith("r") ? "r1-b-defender" : "r1-r-recon";
const wrongTask = await req(p1, "POST", `/api/games/${code}/submit`, {
  taskId: otherTeamTaskId,
  answer: { optionId: "a" },
});
check("player rejected from a non-assigned task (400)", wrongTask.status === 400);

// 10. Player submits their own task
const okSubmit = await req(p1, "POST", `/api/games/${code}/submit`, {
  taskId: myTasks[0].task.id,
  answer:
    myTasks[0].task.type === "match"
      ? { pairs: Object.fromEntries(myTasks[0].task.left.map((l, i) => [l.id, myTasks[0].task.right[i].id])) }
      : { optionId: myTasks[0].task.options[0].id },
});
check("player submits own task", okSubmit.status === 200);

const pub3 = await req(stranger, "GET", `/api/games/${code}/state`);
check("submission counted in public round", pub3.json.round.submittedCount >= 1);

// 11. Run the game to the end
let guard = 0;
let phase = "active";
while (phase !== "finalResults" && guard++ < 20) {
  const r = await req(host, "POST", `/api/games/${code}/host`, { action: "advance" });
  phase = r.json.phase;
}
check("game reaches finalResults", phase === "finalResults");
const final = await req(stranger, "GET", `/api/games/${code}/state`);
check("final result declares a winner", ["red", "blue", "tie"].includes(final.json.final.winner));
check("final recap lists rounds", Array.isArray(final.json.final.recap) && final.json.final.recap.length >= 1);

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
