import { defineConfig } from "vitest/config";
export default defineConfig({
  build: { outDir: "demo-dist" },
  test: { include: ["tests/**/*.test.{ts,tsx}"] },
});
