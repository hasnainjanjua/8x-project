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
        fathom: {
          bg: "#090B10",
          surface: "#11141D",
          elevated: "#171B26",
          border: "#222738",
          borderSubtle: "#1A1E2B",
          accent: "#6366F1",
          accentHover: "#4F46E5",
          cyan: "#00D4B2",
          cyanMuted: "rgba(0, 212, 178, 0.12)",
          text: "#F3F4F6",
          textSecondary: "#9CA3AF",
          textMuted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
