import { Logo, ButtonLink } from "@/components/ui";
import { Win, StatusPill, Readout } from "@/components/console";

const LADDER = [
  ["01", "Phishing & social engineering"],
  ["02", "Passwords, MFA & accounts"],
  ["03", "File permissions & secrets"],
  ["04", "Web input validation"],
  ["05", "Logs, alerts & detection"],
  ["06", "Injection & auth bypass"],
  ["07", "Containment & response"],
  ["08", "Evasion vs detection"],
  ["09", "Full incident"],
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-20">
      {/* app bar */}
      <nav className="flex items-center justify-between border-b border-white/10 py-3">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="hidden font-mono text-[0.66rem] uppercase tracking-[0.25em] text-paper/35 sm:inline">
            // red-vs-blue ops console
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/join" variant="outline" size="sm">
            Join
          </ButtonLink>
          <ButtonLink href="/create" variant="primary" size="sm">
            Create game
          </ButtonLink>
        </div>
      </nav>

      {/* primary console row */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Win
          title="// brief"
          right={<StatusPill tone="ok" pulse>operational</StatusPill>}
        >
          <h1 className="max-w-xl font-display text-4xl font-black leading-[1.02] sm:text-5xl">
            Run a live cyber range
            <br />
            for your whole room.
          </h1>
          <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-paper/70">
            Split the room into Red and Blue, drop into small squads, and work a
            real security incident together. One side moves, the other answers.
            Coin-flip initiative, a siege board, typed commands, a team economy,
            and a debrief after every round.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ButtonLink href="/create" variant="primary" size="lg">
              Create game
            </ButtonLink>
            <ButtonLink href="/join" variant="outline" size="lg">
              Join with a code
            </ButtonLink>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-paper/35">
            <span>no account</span>
            <span>any phone</span>
            <span>50+ players</span>
            <span>9 rounds</span>
          </div>
        </Win>

        {/* telemetry mock */}
        <Win title="// round 02 · the key ring" right={<StatusPill tone="ok" pulse>live</StatusPill>}>
          <div className="space-y-2.5">
            <Readout label="initiative" value="BLUE / +20%" tone="info" />
            <Readout label="red squads" value="3 active" tone="crit" />
            <Readout label="blue squads" value="3 active" tone="info" />
            <Readout label="company breach" value="38%" tone="warn" />
            <div className="my-3 h-px bg-white/10" />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[6px] border border-red-team/30 bg-red-team/[0.06] p-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-red-team">red</p>
                <p className="font-display text-3xl font-black tabular-nums">240</p>
              </div>
              <div className="rounded-[6px] border border-blue-team/30 bg-blue-team/[0.06] p-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-blue-team">blue</p>
                <p className="font-display text-3xl font-black tabular-nums">285</p>
              </div>
            </div>
            <div className="rounded-[6px] border border-gold/25 bg-gold/[0.05] px-3 py-2 font-mono text-[0.7rem] text-gold/90">
              &gt; coin flip resolved, BLUE moves first
            </div>
          </div>
        </Win>
      </section>

      {/* round ladder as a console log */}
      <section className="mt-4">
        <Win title="// engagement ladder · 9 rounds" right={<span className="font-mono text-[0.66rem] text-paper/35">warmup, pressure, full incident</span>}>
          <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
            {LADDER.map(([n, t]) => (
              <div
                key={n}
                className="flex items-center gap-3 border-b border-white/5 py-2 font-mono text-sm last:border-0"
              >
                <span className="text-gold/70">{n}</span>
                <span className="text-paper/75">{t}</span>
                <span className="ml-auto text-[0.6rem] uppercase tracking-widest text-mint/70">rdy</span>
              </div>
            ))}
          </div>
        </Win>
      </section>

      {/* platform modules */}
      <section className="mt-4">
        <Win title="// platform modules">
          <div className="space-y-2">
            {[
              { k: "live", n: "LabDuel Live", d: "Host-led red-vs-blue classroom battles.", tone: "ok" as const, s: "online" },
              { k: "quest", n: "LabDuel Quest", d: "Solo turn-based cyber RPG.", tone: "idle" as const, s: "standby" },
              { k: "studio", n: "LabDuel Studio", d: "Build your own scenarios and quests.", tone: "idle" as const, s: "standby" },
            ].map((m) => (
              <div key={m.k} className="flex items-center gap-3 rounded-[6px] border border-white/10 bg-white/[0.015] px-3 py-2.5">
                <StatusPill tone={m.tone} pulse={m.tone === "ok"}>{m.s}</StatusPill>
                <div className="min-w-0">
                  <span className="font-display text-sm font-bold">{m.n}</span>
                  <span className="ml-2 text-xs text-paper/55">{m.d}</span>
                </div>
              </div>
            ))}
          </div>
        </Win>
      </section>

      <footer className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-paper/30">
        <span>LabDuel</span>
        <span>for clubs &amp; classrooms</span>
      </footer>
    </main>
  );
}
