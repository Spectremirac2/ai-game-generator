import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "prettier"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Keep console usage clean; allow warnings and errors for critical diagnostics.
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],
      // Enforce const declarations when variables are never reassigned.
      "prefer-const": "error",
      // Flag unused variables but allow intentional ignores prefixed with underscores.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Discourage untyped values while still permitting gradual adoption.
      "@typescript-eslint/no-explicit-any": "warn",
      // Surface missing dependencies to keep React hooks in sync.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;

