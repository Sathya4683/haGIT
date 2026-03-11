import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        ink: "#0d0d0d",
        paper: "#fafaf7",
        "paper-dark": "#111110",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderWidth: {
        "3": "3px",
      },
      boxShadow: {
        "brutal":    "4px 4px 0px 0px #0d0d0d",
        "brutal-sm": "2px 2px 0px 0px #0d0d0d",
        "brutal-lg": "6px 6px 0px 0px #0d0d0d",
        "brutal-green": "4px 4px 0px 0px #15803d",
        "brutal-red":   "4px 4px 0px 0px #991b1b",
        "brutal-dark":  "4px 4px 0px 0px rgba(255,255,255,0.15)",
        "brutal-sm-dark": "2px 2px 0px 0px rgba(255,255,255,0.12)",
      },
      animation: {
        "fade-in":        "fadeIn 0.2s ease-out",
        "slide-up":       "slideUp 0.25s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "bounce-in":      "bounceIn 0.3s ease-out",
        "shimmer":        "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        bounceIn: {
          "0%":   { opacity: "0", transform: "scale(0.95) translateY(6px)" },
          "60%":  { transform: "scale(1.01) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
