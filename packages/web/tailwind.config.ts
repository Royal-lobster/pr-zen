import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
          text: "#e6edf3",
          muted: "#8b949e",
          accent: "#58a6ff",
          "add-bg": "rgba(63, 185, 80, 0.15)",
          "del-bg": "rgba(248, 81, 73, 0.15)",
          "add-text": "#3fb950",
          "del-text": "#f85149",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
