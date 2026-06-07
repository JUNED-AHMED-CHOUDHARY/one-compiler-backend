import jsPlugin from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      js: jsPlugin,
      "@typescript-eslint": tsPlugin,
      import: importPlugin
    },
    rules: {
      ...jsPlugin.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // New Import Ordering Rules
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // Node.js built-ins (fs, path)
            "external", // Third-party npm packages (express)
            "internal", // Internal absolute paths
            "parent", // Relative parent paths (../)
            "sibling", // Relative sibling paths (./)
            "index" // Index files
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true
          }
        }
      ],
      "import/first": "error"
    }
  }
];
