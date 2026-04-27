import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default [
  // Base JS recommended
  js.configs.recommended,

  // TypeScript
  ...tseslint.configs.recommended,

  // Astro files
  ...astro.configs.recommended,

  // React hooks (TSX/JSX files) — eslint-plugin-react v7 is incompatible with ESLint 10;
  // TypeScript covers component-level checks, hooks plugin covers hook rules.
  {
    files: ["**/*.{tsx,jsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/incompatible-library": "off", // only relevant with React Compiler
    },
  },

  // Project-wide rule overrides
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Prettier must be last — disables rules that conflict with formatting
  prettier,

  // Ignore build output and generated files
  {
    ignores: ["dist/", ".astro/", "node_modules/"],
  },
];
