"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo, Button, TextInput, Eyebrow } from "@/components/ui";
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
    <div className="animate-rise panel p-7">
      <Eyebrow>Join a game</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-black">Enter the arena</h1>
      <p className="mt-1 text-sm text-paper/60">
        Get the room code from your host&apos;s screen.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="eyebrow">Room code</label>
          <TextInput
            className="mt-2 text-center font-mono text-3xl font-bold uppercase tracking-[0.4em]"
            placeholder="ABCD"
            maxLength={6}
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
        </div>
        <div>
          <label className="eyebrow">Display name</label>
          <TextInput
            className="mt-2"
            placeholder="Your name"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && code && name && join()}
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <Button
        onClick={join}
        disabled={busy || code.length < 4 || name.trim().length < 1}
        size="lg"
        className="mt-6 w-full"
      >
        {busy ? "Joining…" : "Join game"}
      </Button>
    </div>
  );
}

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-20">
      <nav className="py-6">
        <Logo />
      </nav>
      <Suspense fallback={<div className="panel p-7 text-paper/50">Loading…</div>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
