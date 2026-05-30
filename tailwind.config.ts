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
        // Paleta oficial ERA Longevity (Brand Book DIC 2025)
        navy: {
          DEFAULT: "#2C3A5B", // Dark Navy — anchor / núcleo de marca
          light: "#3B4A70",
          deep: "#232E49",
        },
        cyan: {
          DEFAULT: "#3E4095", // Blue Cyan — primary
        },
        gold: {
          DEFAULT: "#D2AE6D", // Gold — accent
          soft: "#E2CC9C",
        },
        milky: "#F9F6EB", // Light — fondos / respiro
      },
      fontFamily: {
        // Outfit = display (fallback de Avenir LT), Roboto = cuerpo
        display: ["var(--font-display)", "Outfit", "sans-serif"],
        sans: ["var(--font-body)", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(44, 58, 91, 0.06), 0 1px 2px rgba(44, 58, 91, 0.04)",
        "card-hover": "0 4px 16px rgba(44, 58, 91, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
