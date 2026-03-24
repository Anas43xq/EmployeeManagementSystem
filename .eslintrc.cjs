module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    "no-unused-vars": "off",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "no-empty": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ],
    "react-hooks/exhaustive-deps": "off",  // Loading functions intentionally excluded to prevent infinite loops
  },
  overrides: [
    {
      files: ["src/**/*.{ts,tsx}"],
      excludedFiles: ["src/services/**/*", "src/**/*.test.{ts,tsx}", "src/contexts/AuthContext.tsx"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@supabase/supabase-js"],
                message: "Import Supabase package types and helpers through src/services to preserve the service boundary.",
              },
              {
                group: ["**/services/supabase", "**/services/supabase.ts"],
                message: "Import through a named service module (src/services/*) rather than the raw Supabase client to preserve the service boundary.",
              },
            ],
          },
        ],
      },
    },
  ],
};
