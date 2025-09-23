// ESLint v9 Flat Config (ESM)
import globals from "globals"
import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import pluginImport from "eslint-plugin-import"
import prettier from "eslint-config-prettier"

export default [
  // 忽略产物与配置文件自身
  { ignores: ["dist", "node_modules", "coverage", ".husky", "eslint.config.*"] },

  // JS 基础推荐
  js.configs.recommended,

  // 通用规则（JS/TS 均适用）
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { import: pluginImport },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/vite.config.*",
            "**/eslint.config.*",
            "**/commitlint.config.*",
            "**/*.config.*",
            "**/*.test.*",
            "**/*.spec.*",
            "**/scripts/**",
          ],
        },
      ],
    },
  },

  // TypeScript 专用规则
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: false,
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...(tsPlugin.configs.recommended?.rules || {}),
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", disallowTypeAnnotations: false },
      ],
    },
  },

  // 关闭与 Prettier 冲突的格式化规则
  prettier,
]
