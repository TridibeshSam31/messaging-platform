// tailwind.config.ts
import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // shadcn colours (these come from CSS variables — don't change them)
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: "hsl(var(--card))",
        accent: "hsl(var(--accent))",

        // YOUR custom colours
        sidebar: "#0d0d14",       // sidebar background
        online: "#22c55e",        // green dot
        offline: "#4b5563",       // grey dot
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        // typing indicator animation
        bounce3: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "bounce3": "bounce3 1s ease-in-out infinite",
      },
    },
  },
  plugins: [animatePlugin],
}

export default config
