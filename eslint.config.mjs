import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "Frameworks_Technical_Assessment_Candidate_Pack*/**",
      ".claude/**",
      "__MACOSX/**",
    ],
  },
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "smart"],
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["src/components/ui/**"],
    rules: {
      "func-style": "off",
    },
  },
];

export default config;
