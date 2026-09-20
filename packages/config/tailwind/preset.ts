import type { Config } from "tailwindcss";

/**
 * Shared Tailwind preset for internal tools. Apps must still declare their own
 * `content` globs (including the packages/ui sources so shared components are
 * scanned).
 */
export const tailwindPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
