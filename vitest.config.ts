import { defineConfig } from "vitest/config";

// Only the setup file is added; everything else is vitest's default (as before this file existed).
export default defineConfig({
  test: {
    setupFiles: ["tests/setup-potion-cost.ts", "tests/setup-boss-lines.ts"],
    // 15 s per test (vitest's default is 5 s): the planner tests on logged boards take 1–4 s alone and time out at 5 s
    // while live play, its boss sims and the Windows-side game share the cores (2026-10-04). Tests with their own limit keep it.
    testTimeout: 15_000,
  },
});
