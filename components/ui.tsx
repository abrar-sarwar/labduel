import Link from "next/link";
import { cn } from "@/lib/cn";
import { LabDuelMark } from "./icons";

// ---------------- Logo ----------------

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const mark = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" }[size];
  const text = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" }[size];
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 group", className)}>
      <span className={cn("text-gold transition-transform group-hover:rotate-[8deg]", mark)}>
        <LabDuelMark className={mark} />
      </span>
      <span className={cn("font-display font-black tracking-tight", text)}>
        LABDUEL
      </span>
    </Link>
  );
}

// ---------------- Button ----------------

type ButtonVariant = "primary" | "red" | "blue" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_BASE =
  "strike relative inline-flex items-center justify-center gap-2 rounded-xl font-display font-bold uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-px select-none";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-ink hover:bg-spark shadow-[0_10px_30px_-12px_rgba(246,183,60,0.7)]",
  red: "bg-red-team text-white hover:brightness-110 shadow-glowred",
  blue: "bg-blue-team text-white hover:brightness-110 shadow-glowblue",
  danger: "bg-danger text-white hover:brightness-110",
  outline: "border border-white/20 text-paper hover:bg-white/5",
  ghost: "text-paper/70 hover:text-paper hover:bg-white/5",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
    >
      {children}
    </Link>
  );
}

// ---------------- Panel / Chip ----------------

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("panel p-5", className)}>{children}</div>;
}

export function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("chip", className)}>{children}</span>;
}

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

// ---------------- Field ----------------

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-white/12 bg-ink-700/70 px-4 font-sans text-paper placeholder:text-paper/30 outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
        className
      )}
      {...props}
    />
  );
}
