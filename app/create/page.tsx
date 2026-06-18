"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo, Button, TextInput, Toggle, Segmented } from "@/components/ui";
import { Win, StatusPill, FieldLabel } from "@/components/console";
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
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-paper/65">{label}</span>
      <div className="flex items-center gap-2">
        <button
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-[5px] border border-white/15 font-mono text-lg leading-none hover:bg-white/10 disabled:opacity-30"
          disabled={value <= min}
        >
          −
        </button>
        <span className="w-14 text-center font-mono text-xl font-bold tabular-nums">
          {value}
          {suffix && <span className="ml-0.5 text-xs text-paper/45">{suffix}</span>}
        </span>
        <button
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-[5px] border border-white/15 font-mono text-lg leading-none hover:bg-white/10 disabled:opacity-30"
          disabled={value >= max}
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
  const [roundCount, setRoundCount] = useState(9);
  const [squadSize, setSquadSize] = useState(5);
  const [roundSeconds, setRoundSeconds] = useState(90);
  const [teamMode, setTeamMode] = useState<"auto" | "choose" | "host">("auto");
  const [roleMode, setRoleMode] = useState<"random" | "hidden" | "choose">("random");
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
        teamMode,
        roleMode,
        insiderThreat,
      });
      router.push(`/host/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create game");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-20">
      <nav className="flex items-center justify-between border-b border-white/10 py-3">
        <Logo />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-paper/35">
          // new session
        </span>
      </nav>

      <div className="animate-rise mt-5 space-y-4">
        <Win
          title="// session config"
          right={<StatusPill tone="idle">draft</StatusPill>}
        >
          <p className="text-sm leading-relaxed text-paper/65">
            Configure the engagement, then launch the lobby. Teams auto-balance into
            squads with assigned roles. You can start once 2 players are in.
          </p>

          <div className="mt-5">
            <FieldLabel hint="max 20">host callsign</FieldLabel>
            <TextInput
              placeholder="Coach / Host"
              maxLength={20}
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
          </div>
        </Win>

        <Win title="// engagement params">
          <Stepper label="rounds" value={roundCount} min={1} max={9} onChange={setRoundCount} />
          <p className="py-1 font-mono text-[0.66rem] leading-relaxed text-paper/40">
            ladder: phishing, MFA, secrets, web input, detection, auth bypass,
            containment, evasion, full incident.
          </p>
          <Stepper label="target squad size" value={squadSize} min={3} max={6} onChange={setSquadSize} />

          <div className="border-t border-white/5 pt-3">
            <FieldLabel hint={`${roundSeconds}s`}>round timer</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  onClick={() => setRoundSeconds(s)}
                  className={cn(
                    "rounded-[5px] border py-2 font-mono text-sm font-bold tabular-nums transition",
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
        </Win>

        <Win title="// team & role assignment">
          <div>
            <FieldLabel>team mode</FieldLabel>
            <Segmented
              value={teamMode}
              onChange={setTeamMode}
              options={[
                { value: "auto", label: "Auto" },
                { value: "choose", label: "Players pick" },
                { value: "host", label: "Host assigns" },
              ]}
            />
            <p className="mt-2 font-mono text-[0.66rem] text-paper/45">
              {teamMode === "auto" && "Room is split into even teams automatically."}
              {teamMode === "choose" && "Players pick Red or Blue in the lobby."}
              {teamMode === "host" && "You assign players to teams in the lobby."}
            </p>
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            <FieldLabel>role mode</FieldLabel>
            <Segmented
              value={roleMode}
              onChange={setRoleMode}
              options={[
                { value: "random", label: "Random" },
                { value: "hidden", label: "Hidden" },
                { value: "choose", label: "Players pick" },
              ]}
            />
            <p className="mt-2 font-mono text-[0.66rem] text-paper/45">
              {roleMode === "random" && "Random roles, visible to everyone."}
              {roleMode === "hidden" && "Random roles, each player sees only their own."}
              {roleMode === "choose" && "Players claim a role at reveal."}
            </p>
          </div>
        </Win>

        <Win
          title="// special rules"
          className={cn(insiderThreat && "border-red-team/40")}
          right={
            <StatusPill tone={insiderThreat ? "crit" : "idle"} pulse={insiderThreat}>
              {insiderThreat ? "armed" : "off"}
            </StatusPill>
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-paper/90">Insider Threat</span>
                <span className="chip border-red-team/40 bg-red-team/10 text-red-team">hidden role</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-paper/55">
                One Blue player secretly draws Red-aligned sabotage objectives.
                Requires 3+ Blue players. Sustained sabotage unlocks the Checkmate Protocol.
              </p>
            </div>
            <Toggle checked={insiderThreat} onChange={setInsiderThreat} label="Insider Threat" />
          </div>
        </Win>

        {error && (
          <p className="font-mono text-xs text-danger">! {error}</p>
        )}

        <Button onClick={create} disabled={busy} size="lg" className="w-full">
          {busy ? "Launching…" : "Launch lobby"}
        </Button>
      </div>
    </main>
  );
}
