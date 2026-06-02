import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#17202a",
        mint: "#36c7a3",
        coral: "#f97373",
      },
    },
  },
  plugins: [],
};

export default config;

