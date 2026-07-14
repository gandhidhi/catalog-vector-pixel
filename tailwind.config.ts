import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aパターンのプライマリー（深い青）とサブ（浅い水色）
        "accent-a": "#1e3a8a",
        "accent-a-soft": "#e0f2fe",
      },
      fontFamily: {
        "plex-sans": ["var(--font-ibm-plex-sans-jp)", "sans-serif"],
        "plex-mono": ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
