// eslint.config.mjs — ESLint 10.9.1-safe flat config (D-02 amendment).
//
// eslint-config-next's default export, and its "web vitals" subpath
// export, pull eslint-plugin-react@7.37.5, whose Components.js calls the
// removed context.getFilename() and crashes `eslint .` under ESLint
// 10.9.1 (reproduced, RESEARCH.md Pitfall 1). This config composes the
// Next-specific rules straight from @next/eslint-plugin-next instead,
// which carries no ESLint-version peer surface, and pulls only the
// TypeScript-aware rules from the package's "/typescript" subpath.
//
// DO NOT import the eslint-config-next package's default export or its
// "web vitals" subpath export here.
import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  nextPlugin.configs["core-web-vitals"],
  reactHooks.configs.flat["recommended-latest"],
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
