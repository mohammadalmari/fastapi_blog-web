import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Generated files are not ours to lint: they are rewritten on every run.
  globalIgnores([
    "dist",
    "src/api/generated",
    "src/routeTree.gen.ts",
    "playwright-report",
    "test-results",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      // `({ node, ...props })` is how a prop is kept off a DOM element.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // React imports
            ["^react"],
            // Third party imports (not @/ path aliases, not lucide-react)
            ["^(?!lucide-react)[^@.]", "^@(?!/)"],
            // @/ imports that are not @/components
            ["^@/(?!components)"],
            // @/components imports (but not @/components/ui)
            ["^@/components(?!/ui)"],
            // @/components/ui imports
            ["^@/components/ui"],
            // lucide-react imports
            ["^lucide-react"],
            // Side-effect style imports (e.g. ./index.css)
            ["^\\u0000.*\\.css$"],
            // Other side-effect imports
            ["^\\u0000"],
            // Relative imports
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
]);
