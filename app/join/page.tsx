"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo, Button, TextInput } from "@/components/ui";
import { Win, StatusPill, FieldLabel } from "@/components/console";
import { postAction } from "@/components/hooks";

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const clean = code.trim().toUpperCase();
    try {
      await postAction(`/api/games/${clean}/join`, { name: name.trim() });
      router.push(`/play/${clean}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
      setBusy(false);
    }
  }

  return (
    <Win
      className="animate-rise"
      title="// connect to session"
      right={<StatusPill tone="info" pulse>standby</StatusPill>}
    >
      <p className="text-sm text-paper/60">
        Enter the session code shown on the host or projector screen.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <FieldLabel hint="4-6 chars">session code</FieldLabel>
          <TextInput
            className="text-center font-mono text-3xl font-bold uppercase tracking-[0.4em]"
            placeholder="ABCD"
            maxLength={6}
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
        </div>
        <div>
          <FieldLabel hint="max 20">display name</FieldLabel>
          <TextInput
            placeholder="Your name"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && code && name && join()}
          />
        </div>
      </div>

      {error && <p className="mt-4 font-mono text-xs text-danger">! {error}</p>}

      <Button
        onClick={join}
        disabled={busy || code.length < 4 || name.trim().length < 1}
        size="lg"
        className="mt-6 w-full"
      >
        {busy ? "Connecting…" : "Connect"}
      </Button>
    </Win>
  );
}

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-20">
      <nav className="flex items-center justify-between border-b border-white/10 py-3">
        <Logo />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-paper/35">
          // join session
        </span>
      </nav>
      <div className="mt-5">
        <Suspense fallback={<div className="win p-4 font-mono text-sm text-paper/50">loading…</div>}>
          <JoinForm />
        </Suspense>
      </div>
    </main>
  );
}
