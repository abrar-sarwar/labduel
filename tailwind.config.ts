import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0c0e16",
          800: "#12141f",
          700: "#191c2b",
          600: "#232739",
          500: "#323750",
        },
        paper: {
          DEFAULT: "#f5f3ee",
          dim: "#e7e3d8",
        },
        red: {
          team: "#ff4d5e",
          ember: "#ff7a45",
          deep: "#b81d34",
        },
        blue: {
          team: "#3d8bff",
          ice: "#56d6ff",
          deep: "#1f4fb5",
        },
        // LabDuel brand spark + functional accents
        gold: "#f6b73c",
        spark: "#ffd166",
        mint: "#3ddc97",
        warn: "#ff9f1c",
        danger: "#ff495c",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        lift: "0 18px 50px -20px rgba(0,0,0,0.65)",
        panel: "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px -30px rgba(0,0,0,0.8)",
        glowred: "0 0 0 1px rgba(255,77,94,0.4), 0 12px 40px -12px rgba(255,77,94,0.45)",
        glowblue: "0 0 0 1px rgba(61,139,255,0.4), 0 12px 40px -12px rgba(61,139,255,0.45)",
      },
      keyframes: {
        "rise": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "coin-flip": {
          "0%": { transform: "translateY(-10px) rotateX(0deg) scale(0.9)", opacity: "0" },
          "12%": { opacity: "1" },
          "70%": { transform: "translateY(0) rotateX(1980deg) scale(1.08)" },
          "85%": { transform: "translateY(-8px) rotateX(2070deg) scale(1)" },
          "100%": { transform: "translateY(0) rotateX(2160deg) scale(1)" },
        },
        "slash": {
          "0%": { transform: "translateX(-120%) skewX(-18deg)", opacity: "0" },
          "40%": { opacity: "0.9" },
          "100%": { transform: "translateX(120%) skewX(-18deg)", opacity: "0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        pop: "pop 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "coin-flip": "coin-flip 2s cubic-bezier(0.25,0.8,0.3,1) both",
        slash: "slash 0.7s ease-in both",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        ticker: "ticker 22s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
