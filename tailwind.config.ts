import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7f3",
          100: "#d9ece1",
          200: "#b3d9c4",
          500: "#2f7a52",
          600: "#1f6a45",
          700: "#175537",
          800: "#124329",
          900: "#0d3220",
        },
      },
      maxWidth: { content: "72rem" },
    },
  },
  plugins: [],
};

export default config;
