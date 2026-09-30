import { defineConfig } from "vitest/config";

// Only the setup file is added; everything else is vitest's default (as before this file existed).
export default defineConfig({
  test: {
    setupFiles: ["tests/setup-potion-cost.ts"],
  },
});
