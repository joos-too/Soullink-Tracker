import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "build/",
    "coverage/",
    "database-exports/",
    "dist/",
    "dist-ssr/",
    "playwright-report/",
    "scripts/itemlists-source/debug/",
    "scripts/pokeapi-data/",
    "supabase/.temp/",
    "test-results/",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    extends: [js.configs.recommended],
  },
  tseslint.configs.recommended,
  eslintReact.configs["recommended-typescript"],
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["index.tsx", "src/**/*.{js,mjs,ts,mts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      "*.config.{js,mjs,cjs,ts,mts,cts}",
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
      "tests/**/*.{js,mjs,cjs,ts,mts,cts}",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["public/pokeapi-js-wrapper-sw.js"],
    languageOptions: { globals: globals.serviceworker },
  },
]);
