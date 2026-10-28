import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
export default [
  {
    ignores: [
      "**/dist/**",
      "coverage/**",
      "artifacts/**",
      "node_modules/**",
      ".angular/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["**/*.mjs"], languageOptions: { globals: globals.node } },
];
