/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        emerald: {
          // Slightly muted for "zen" feel
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        zinc: {
          50: "var(--theme-50)",
          100: "var(--theme-100)",
          200: "var(--theme-200)",
          300: "var(--theme-300)",
          400: "var(--theme-400)",
          500: "var(--theme-500)",
          600: "var(--theme-600)",
          700: "var(--theme-700)",
          800: "var(--theme-800)",
          900: "var(--theme-900)",
          950: "var(--theme-950)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
