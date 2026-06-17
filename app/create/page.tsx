"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Button, TextInput, Eyebrow, Toggle } from "@/components/ui";
import { cn } from "@/lib/cn";
import { postAction } from "@/components/hooks";

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-700/50 px-4 py-3">
      <span className="text-sm text-paper/80">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-lg font-bold hover:bg-white/10"
        >
          −
        </button>
        <span className="w-16 text-center font-display text-xl font-black tabular-nums">
          {value}
          {suffix && <span className="ml-1 text-xs text-paper/50">{suffix}</span>}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-lg font-bold hover:bg-white/10"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const [hostName, setHostName] = useState("");
  const [roundCount, setRoundCount] = useState(2);
  const [squadSize, setSquadSize] = useState(5);
  const [roundSeconds, setRoundSeconds] = useState(90);
  const [insiderThreat, setInsiderThreat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { code } = await postAction<{ code: string }>("/api/games", {
        hostName: hostName.trim() || undefined,
        roundCount,
        squadSize,
        roundSeconds,
        insiderThreat,
      });
      router.push(`/host/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create game");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-5 pb-20">
      <nav className="py-6">
        <Logo />
      </nav>
      <div className="animate-rise panel p-7">
        <Eyebrow>New game</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-black">Set up the arena</h1>
        <p className="mt-1 text-sm text-paper/60">
          Teams auto-balance into squads with random roles. You can start as soon as
          2 players join.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="eyebrow">Your host name</label>
            <TextInput
              className="mt-2"
              placeholder="Coach / Host"
              maxLength={20}
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
          </div>

          <Stepper label="Rounds" value={roundCount} min={1} max={2} onChange={setRoundCount} />
          <p className="-mt-2 px-1 text-xs text-paper/40">
            2 rounds of content are live (phishing, MFA). More coming.
          </p>
          <Stepper label="Target squad size" value={squadSize} min={3} max={6} onChange={setSquadSize} />

          <div className="rounded-xl border border-white/10 bg-ink-700/50 px-4 py-3">
            <span className="text-sm text-paper/80">Round timer</span>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  onClick={() => setRoundSeconds(s)}
                  className={cn(
                    "rounded-lg border py-2 font-display text-sm font-bold transition",
                    roundSeconds === s
                      ? "border-gold bg-gold text-ink"
                      : "border-white/15 text-paper/70 hover:bg-white/10"
                  )}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition",
              insiderThreat ? "border-red-team/40 bg-red-team/5" : "border-white/10 bg-ink-700/50"
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-paper/90">Insider Threat</span>
                <span className="chip border-red-team/40 bg-red-team/10 text-red-team">Hidden role</span>
              </div>
              <p className="mt-1 text-xs text-paper/55">
                One Blue player secretly gets Red-aligned sabotage objectives. Needs
                3+ Blue players. They can unlock the Checkmate Protocol.
              </p>
            </div>
            <Toggle checked={insiderThreat} onChange={setInsiderThreat} label="Insider Threat" />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <Button onClick={create} disabled={busy} size="lg" className="mt-6 w-full">
          {busy ? "Creating…" : "Create room"}
        </Button>
      </div>
    </main>
  );
}
