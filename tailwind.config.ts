import type { Config } from "tailwindcss";
import path from "path";

const config: Config = {
  darkMode: "class",
  content: [
    path.join(__dirname, "./src/pages/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, "/"),
    path.join(__dirname, "./src/components/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, "/"),
    path.join(__dirname, "./src/app/**/*.{js,ts,jsx,tsx,mdx}").replace(/\\/g, "/"),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "'Be Vietnam Pro'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
