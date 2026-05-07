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
        navy: {
          900: "#1a1a2e",
          800: "#16213e",
          700: "#0f3460",
          600: "#1a4080",
          500: "#1560a8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
