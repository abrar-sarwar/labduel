"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { PlayerTaskView, Team } from "@/lib/shared/types";
import type { PublicTask } from "@/lib/shared/content-types";
import { postAction } from "./hooks";
import { teamClasses } from "./game";

function ResultBadge({ correct, points }: { correct: boolean; points: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border px-2.5 py-1 font-mono text-[0.66rem] font-bold uppercase tracking-[0.12em] tabular-nums",
        correct ? "border-mint/30 bg-mint/10 text-mint" : "border-danger/30 bg-danger/10 text-danger"
      )}
    >
      {correct ? `pass +${points}` : "miss"}
    </span>
  );
}

export function TaskCard({
  item,
  code,
  team,
  locked,
  onSubmitted,
}: {
  item: PlayerTaskView;
  code: string;
  team: Team;
  /** true once the round is locked (no more submitting) */
  locked: boolean;
  onSubmitted: () => void;
}) {
  const task = item.task as PublicTask;
  const c = teamClasses(team);
  const revealed = item.correct !== null;

  // local answer state
  const [choice, setChoice] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchTask = task.type === "match" ? task : null;
  const matchComplete =
    matchTask != null && matchTask.left.every((l) => pairs[l.id]);

  const canSubmit =
    !locked &&
    !busy &&
    (task.type === "match"
      ? matchComplete
      : task.type === "type"
        ? text.trim().length > 0
        : choice != null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const answer =
        task.type === "match"
          ? { pairs }
          : task.type === "type"
            ? { text }
            : { optionId: choice };
      await postAction(`/api/games/${code}/submit`, { taskId: task.id, answer });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "panel relative overflow-hidden p-5 transition",
        item.submitted && !revealed && "ring-1 ring-gold/40",
        revealed && item.correct && "ring-1 ring-mint/40",
        revealed && !item.correct && "ring-1 ring-danger/40"
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", c.bg)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-paper/45">// {task.concept}</p>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug">{task.prompt}</h3>
        </div>
        {revealed && <ResultBadge correct={!!item.correct} points={item.points} />}
        {item.submitted && !revealed && (
          <span className="chip border-gold/40 bg-gold/10 text-gold">submitted</span>
        )}
      </div>

      <div className="mt-4">
        {task.type === "classify" && (
          <OptionList
            options={task.options}
            selected={choice}
            disabled={locked || revealed}
            onSelect={setChoice}
          />
        )}

        {task.type === "fillBlank" && (
          <div>
            <p className="mb-3 rounded-lg border border-white/10 bg-ink-700/60 px-4 py-3 font-mono text-sm text-paper/85">
              {task.template.split("___")[0]}
              <span className="mx-1 rounded bg-gold/20 px-2 py-0.5 text-gold">
                {choice ? task.options.find((o) => o.id === choice)?.label : "___"}
              </span>
              {task.template.split("___")[1]}
            </p>
            <OptionList
              options={task.options}
              selected={choice}
              disabled={locked || revealed}
              onSelect={setChoice}
            />
          </div>
        )}

        {task.type === "match" && (
          <div className="space-y-3">
            {task.left.map((l) => (
              <div key={l.id} className="rounded-lg border border-white/10 bg-ink-700/50 p-3">
                <p className="mb-2 text-sm text-paper/85">{l.label}</p>
                <div className="flex flex-wrap gap-2">
                  {task.right.map((r) => {
                    const active = pairs[l.id] === r.id;
                    return (
                      <button
                        key={r.id}
                        disabled={locked || revealed}
                        onClick={() => setPairs((p) => ({ ...p, [l.id]: r.id }))}
                        className={cn(
                          "rounded-[5px] border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60",
                          active
                            ? cn("border-transparent text-ink", c.bg)
                            : "border-white/15 bg-white/5 text-paper/75 hover:bg-white/10"
                        )}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {task.type === "type" && (
          <div>
            {task.reference && (
              <div className="mb-2">
                <p className="eyebrow mb-1">// type this exactly</p>
                <p className="select-all rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 font-mono text-sm text-gold">
                  {task.reference}
                </p>
              </div>
            )}
            <input
              value={text}
              disabled={locked || revealed}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
              placeholder={task.placeholder ?? "Type your answer…"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-white/12 bg-ink-700/70 px-4 font-mono text-paper placeholder:text-paper/30 outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20 disabled:opacity-60"
            />
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {!revealed && !locked && (
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={cn(
            "strike mt-4 h-11 w-full rounded-xl font-display text-sm font-bold uppercase tracking-wide text-ink transition disabled:opacity-40",
            c.bg
          )}
        >
          {busy ? "Sending…" : item.submitted ? "Update answer" : "Submit answer"}
        </button>
      )}
      {locked && !revealed && (
        <p className="mt-4 text-center font-mono text-xs text-paper/50">// locked · awaiting scoring</p>
      )}
    </div>
  );
}

function OptionList({
  options,
  selected,
  disabled,
  onSelect,
}: {
  options: { id: string; label: string; hint?: string }[];
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = selected === o.id;
        return (
          <button
            key={o.id}
            disabled={disabled}
            onClick={() => onSelect(o.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[6px] border px-4 py-3 text-left text-sm transition disabled:opacity-70",
              active
                ? "border-gold/60 bg-gold/10 text-paper"
                : "border-white/12 bg-ink-700/50 text-paper/80 hover:border-white/25 hover:bg-ink-700"
            )}
          >
            <span
              className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border",
                active ? "border-gold bg-gold" : "border-white/25"
              )}
            >
              {active && <span className="h-1.5 w-1.5 rounded-[1px] bg-ink" />}
            </span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
