import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

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
        // Palette-driven (see src/lib/palettes.ts); alpha modifiers like bg-brand-500/25 work.
        brand: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((k) => [k, `rgb(var(--brand-${k}) / <alpha-value>)`]),
        ),
        ink: "rgb(var(--ink-fixed) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        "paper-dark": "#111110",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderWidth: {
        "3": "3px",
      },
      boxShadow: {
        "brutal":    "4px 4px 0px 0px rgb(var(--ink-fixed))",
        "brutal-sm": "2px 2px 0px 0px rgb(var(--ink-fixed))",
        "brutal-lg": "6px 6px 0px 0px rgb(var(--ink-fixed))",
        "brutal-green": "4px 4px 0px 0px rgb(var(--brand-700))",
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
      typography: {
        // `prose-kb`: knowledge-base articles, coloured from the theme variables.
        kb: {
          css: {
            "--tw-prose-body": "rgb(var(--ink))",
            "--tw-prose-headings": "rgb(var(--ink))",
            "--tw-prose-lead": "rgb(var(--ink-muted))",
            "--tw-prose-links": "rgb(var(--ink))",
            "--tw-prose-bold": "rgb(var(--ink))",
            "--tw-prose-counters": "rgb(var(--ink-muted))",
            "--tw-prose-bullets": "rgb(var(--brand))",
            "--tw-prose-hr": "rgb(var(--border) / 0.3)",
            "--tw-prose-quotes": "rgb(var(--ink))",
            "--tw-prose-quote-borders": "rgb(var(--brand))",
            "--tw-prose-captions": "rgb(var(--ink-muted))",
            "--tw-prose-code": "rgb(var(--ink))",
            "--tw-prose-th-borders": "rgb(var(--border))",
            "--tw-prose-td-borders": "rgb(var(--border) / 0.3)",
            fontSize: "15px",
            lineHeight: "1.75",
            a: { textDecorationColor: "rgb(var(--brand))", textDecorationThickness: "2px", textUnderlineOffset: "3px" },
            "h2, h3": { fontWeight: "900", letterSpacing: "-0.01em" },
            blockquote: { fontStyle: "normal", fontWeight: "600", background: "rgb(var(--paper-alt))", padding: "0.5em 1em" },
            "blockquote p:first-of-type::before, blockquote p:last-of-type::after": { content: "none" },
            table: { fontSize: "14px" },
            thead: { borderBottomWidth: "2px" },
            code: { fontWeight: "600" },
          },
        },
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
  plugins: [typography],
};
export default config;
