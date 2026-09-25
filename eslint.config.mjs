// Flat-Config für ESLint 9 (Next 16 hat `next lint` entfernt, das alte
// FlatCompat-Setup mit @eslint/eslintrc crashte mit einer Zirkelstruktur).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bot ist ein eigenes Paket mit eigener tsconfig/eigenen Abhängigkeiten.
    "bot/**",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
