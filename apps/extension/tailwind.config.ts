import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./popup.html"],
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
        ink:   "#0d0d0d",
        paper: "#fafaf7",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        brutal:    "4px 4px 0px 0px #0d0d0d",
        "brutal-sm": "2px 2px 0px 0px #0d0d0d",
        "brutal-lg": "6px 6px 0px 0px #0d0d0d",
        "brutal-red": "4px 4px 0px 0px #991b1b",
        "brutal-green": "4px 4px 0px 0px #15803d",
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "bounce-in":"bounceIn 0.25s ease-out",
        shimmer:    "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:  { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        bounceIn: { "0%": { opacity: "0", transform: "scale(0.96)" }, "60%": { transform: "scale(1.01)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer:  { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};
export default config;
