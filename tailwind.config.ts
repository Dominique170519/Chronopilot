import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050816",
        panel: "#0a1020",
        glass: "rgba(255,255,255,0.05)",
        line: "rgba(255,255,255,0.08)",
        "accent-blue": {
          DEFAULT: "#3b82f6",
          soft: "#60a5fa",
          glow: "#bfdbfe",
        },
        "accent-orange": "#f97316",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(0, 0, 0, 0.35)",
        "card-glow":
          "0 0 0 1px rgba(96, 165, 250, 0.15), 0 20px 60px rgba(59, 130, 246, 0.12)",
        "btn-glow":
          "0 0 0 1px rgba(96, 165, 250, 0.25), 0 8px 24px rgba(59, 130, 246, 0.25)",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        dot: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
        aurora:
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(59,130,246,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 10%, rgba(99,102,241,0.12) 0%, transparent 55%), linear-gradient(180deg, #060d1f 0%, #050816 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
