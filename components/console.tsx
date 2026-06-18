import { cn } from "@/lib/cn";

/** A titled "window" panel, like a pane in an operations console. */
export function Win({
  title,
  right,
  className,
  bodyClass,
  children,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  bodyClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("win", className)}>
      {(title || right) && (
        <header className="win-bar">
          <span className="win-title">{title}</span>
          {right}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

type Tone = "ok" | "warn" | "crit" | "idle" | "info";

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-mint",
  warn: "text-warn",
  crit: "text-danger",
  idle: "text-paper/40",
  info: "text-blue-team",
};
const TONE_DOT: Record<Tone, string> = {
  ok: "bg-mint",
  warn: "bg-warn",
  crit: "bg-danger",
  idle: "bg-paper/40",
  info: "bg-blue-team",
};

export function Dot({ tone = "idle", pulse }: { tone?: Tone; pulse?: boolean }) {
  return <span className={cn("dot", TONE_DOT[tone], pulse && "animate-pulse")} />;
}

/** A key/value status line in monospace. */
export function Readout({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="readout">
      <span className="text-paper/40">{label}</span>
      <span className={cn("tabular-nums", TONE_TEXT[tone])}>{value}</span>
    </div>
  );
}

/** Small uppercase status pill with a dot. */
export function StatusPill({
  tone = "idle",
  pulse,
  children,
}: {
  tone?: Tone;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.18em]",
        "border-white/10 bg-white/[0.03]",
        TONE_TEXT[tone]
      )}
    >
      <Dot tone={tone} pulse={pulse} />
      {children}
    </span>
  );
}

/** A monospace field label, like the caption on a control surface. */
export function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-paper/45">
        {children}
      </span>
      {hint && (
        <span className="font-mono text-[0.62rem] tabular-nums text-paper/35">{hint}</span>
      )}
    </div>
  );
}

/** A single terminal-style log line. Prefix is a dim glyph, not an emoji. */
export function LogLine({
  prefix = ">",
  tone = "idle",
  children,
}: {
  prefix?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 font-mono text-[0.72rem] leading-relaxed">
      <span className={cn("shrink-0 select-none", TONE_TEXT[tone])}>{prefix}</span>
      <span className="text-paper/70">{children}</span>
    </div>
  );
}
