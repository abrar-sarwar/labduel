import { Logo, ButtonLink, Chip, Eyebrow } from "@/components/ui";
import { LabDuelMark } from "@/components/icons";

const ROUNDS = [
  { n: 1, t: "Phishing & social engineering", live: true },
  { n: 2, t: "Passwords, MFA & accounts", live: true },
  { n: 3, t: "File permissions & secrets", live: true },
  { n: 4, t: "Web input validation", live: true },
  { n: 5, t: "Logs, alerts & detection", live: true },
  { n: 6, t: "Injection & auth bypass", live: true },
  { n: 7, t: "Containment & response", live: true },
  { n: 8, t: "Evasion vs detection", live: true },
  { n: 9, t: "Full incident", live: true },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-24">
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <ButtonLink href="/join" variant="outline" size="sm">
            Join
          </ButtonLink>
          <ButtonLink href="/create" variant="primary" size="sm">
            Create game
          </ButtonLink>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative grid items-center gap-10 pt-10 md:grid-cols-[1.15fr_0.85fr] md:pt-16">
        <div className="animate-rise">
          <Chip className="border-gold/30 bg-gold/10 text-gold">
            Live · Red vs Blue · Classroom-ready
          </Chip>
          <h1 className="mt-5 text-balance font-display text-5xl font-black leading-[0.95] sm:text-6xl md:text-7xl">
            <span className="text-red-team">Red</span> strikes.
            <br />
            <span className="text-blue-team">Blue</span>{" "}
            <span className="text-gold">defends.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-paper/70">
            A cybersecurity learning platform built around live cyber battles. Two
            sides, small squads, real concepts. Every round is a coin-flip, a move,
            and a counter — Kahoot energy with tabletop incident-response depth.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/create" variant="primary" size="lg">
              Host a game
            </ButtonLink>
            <ButtonLink href="/join" variant="outline" size="lg">
              Join with a code
            </ButtonLink>
          </div>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-paper/40">
            No account needed · Works on any phone · 50+ players
          </p>
        </div>

        {/* Hero side: a stylized "round" board */}
        <div className="animate-pop">
          <div className="panel relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-team/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-red-team/20 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="eyebrow">Round 02 · The Key Ring</span>
              <span className="font-mono text-xs text-mint">● LIVE</span>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-team/40 bg-red-team/10 p-4">
                <p className="font-display text-sm font-bold uppercase text-red-team">Red</p>
                <p className="mt-1 text-xs text-paper/60">Reuse the key. Apply pressure.</p>
                <p className="mt-3 font-display text-3xl font-black tabular-nums">240</p>
              </div>
              <div className="rounded-xl border border-blue-team/40 bg-blue-team/10 p-4">
                <p className="font-display text-sm font-bold uppercase text-blue-team">Blue</p>
                <p className="mt-1 text-xs text-paper/60">Hold the identity perimeter.</p>
                <p className="mt-3 font-display text-3xl font-black tabular-nums">285</p>
              </div>
            </div>
            <div className="relative mt-4 flex items-center justify-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
              <span className="text-gold">
                <LabDuelMark className="h-5 w-5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-gold">
                Coin flip → Blue moves first
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How a round works */}
      <section className="mt-24">
        <Eyebrow>How a round works</Eyebrow>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            { k: "01", t: "Coin flip", d: "Initiative is decided. The winner moves first — and earns a bonus." },
            { k: "02", t: "Mission brief", d: "A short, sharp scenario hits the room. Both sides see the stakes." },
            { k: "03", t: "Squads act", d: "Everyone works connected role tasks at once — no one sits idle." },
            { k: "04", t: "Debrief", d: "What Red did, what Blue did, and the takeaway. Then scores update." },
          ].map((s) => (
            <div key={s.k} className="panel p-5">
              <p className="font-display text-3xl font-black text-gold/80">{s.k}</p>
              <h3 className="mt-2 font-display text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-paper/65">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Round ladder */}
      <section className="mt-20">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>The 9-round ladder</Eyebrow>
            <h2 className="mt-2 font-display text-3xl font-black">
              Warmup → pressure → full incident
            </h2>
          </div>
          <Chip className="hidden sm:inline-flex">All 9 rounds live</Chip>
        </div>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {ROUNDS.map((r) => (
            <div
              key={r.n}
              className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                r.live
                  ? "border-gold/30 bg-gold/5"
                  : "border-white/8 bg-ink-800/40 opacity-70"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display font-black ${
                  r.live ? "bg-gold text-ink" : "bg-white/5 text-paper/50"
                }`}
              >
                {r.n}
              </span>
              <span className="text-sm text-paper/85">{r.t}</span>
              {r.live ? (
                <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-widest text-gold">
                  Live
                </span>
              ) : (
                <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-widest text-paper/30">
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Three pillars */}
      <section className="mt-24">
        <Eyebrow>The platform</Eyebrow>
        <h2 className="mt-2 font-display text-3xl font-black">One universe, three modes</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "LabDuel Live",
              tag: "Available now",
              live: true,
              d: "Host-led red-vs-blue battles for your club or class. Room codes, squads, roles, coin-flip rounds, live scoring.",
            },
            {
              t: "LabDuel Quest",
              tag: "Coming soon",
              live: false,
              d: "A solo, turn-based cyber RPG. Pick a path, enter dungeons, fight incidents, and learn through choices and consequences.",
            },
            {
              t: "LabDuel Studio",
              tag: "Coming soon",
              live: false,
              d: "Creator tools for instructors: build scenarios, quests, role cards, and debriefs — no code required.",
            },
          ].map((p) => (
            <div
              key={p.t}
              className={`panel p-5 ${p.live ? "border-gold/30" : "opacity-80"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-black">{p.t}</h3>
                <span
                  className={`font-mono text-[0.6rem] uppercase tracking-widest ${
                    p.live ? "text-gold" : "text-paper/40"
                  }`}
                >
                  {p.tag}
                </span>
              </div>
              <p className="mt-2 text-sm text-paper/65">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 flex flex-col items-center gap-2 border-t border-white/8 pt-8 text-center">
        <Logo size="sm" />
        <p className="text-sm text-paper/45">
          A live cyber learning game. Built for clubs and classrooms.
        </p>
      </footer>
    </main>
  );
}
