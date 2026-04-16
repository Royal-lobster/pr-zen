import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: "#0a0a0b",
          surface: "#121214",
          elevated: "#1a1a1e",
          border: "#27272a",
          "border-subtle": "#1e1e21",
          text: "#e4e4e7",
          "text-secondary": "#a1a1aa",
          muted: "#71717a",
          accent: "#2dd4bf",
          "accent-dim": "rgba(45, 212, 191, 0.12)",
          "accent-hover": "#14b8a6",
          "add-bg": "rgba(52, 211, 153, 0.08)",
          "del-bg": "rgba(251, 113, 133, 0.08)",
          "add-text": "#34d399",
          "del-text": "#fb7185",
          "add-border": "rgba(52, 211, 153, 0.2)",
          "del-border": "rgba(251, 113, 133, 0.2)",
          warn: "#fbbf24",
          purple: "#a78bfa",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "Menlo", "monospace"],
        sans: ['"Inter"', '"SF Pro Display"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "fade-in-up": "fadeInUp 0.25s ease-out",
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "progress-fill": "progressFill 0.5s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        progressFill: {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "left" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(45, 212, 191, 0.15)",
        "glow-sm": "0 0 10px rgba(45, 212, 191, 0.1)",
        overlay: "0 16px 48px rgba(0, 0, 0, 0.5)",
        card: "0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)",
      },
    },
  },
  plugins: [],
} satisfies Config;
