import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ai-purple": "#A78BFA",
        "ai-soft": "#F4F0FF",
        "danger-red": "#E56B6F",
        "danger-soft": "#FDECEC",
        "documents-blue": "#5B8DEF",
        "documents-soft": "#EEF4FF",
        graphite: "#17202a",
        "life-bg": "#F7F8F5",
        "life-border": "#E7EAE5",
        "life-card": "#FFFFFF",
        "life-green": "#6FAF8C",
        "life-green-dark": "#4E8D6C",
        "life-green-soft": "#EAF5EE",
        "life-muted": "#667085",
        "life-text": "#1E2420",
        mint: "#36c7a3",
        coral: "#f97373",
        "reminder-orange": "#F59E0B",
        "reminder-soft": "#FFF5E6",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(30, 36, 32, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
