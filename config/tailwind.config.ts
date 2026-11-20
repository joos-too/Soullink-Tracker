import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["../index.html", "../src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        "press-start": ["Press Start 2P", "cursive"],
        roboto: ["Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
