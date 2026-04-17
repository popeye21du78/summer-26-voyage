import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Données massives (pas du code app) — accélère ESLint / IDE
    "data/descriptions/**",
    "data/batch/**",
    "data/batch-desc/**",
    "data/debug/**",
    "data/geo/**",
  ]),
]);

export default eslintConfig;
