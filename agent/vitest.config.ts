import { defineConfig } from "vitest/config";

// The test files, the setup files and the timeout; everything else is vitest's default.
export default defineConfig({
  test: {
    // This package's tests only (agent/tests): never the upstream submodule's, an old worktree's or a nested checkout's.
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/third_party/**", "**/.worktrees/**", "**/jev-sts2*/**"],
    setupFiles: ["tests/setup-potion-cost.ts", "tests/setup-boss-lines.ts"],
    // 15 s per test (vitest's default is 5 s): the planner tests on logged boards take 1–4 s alone and time out at 5 s
    // while live play, its boss sims and the Windows-side game share the cores (2026-10-04). Tests with their own limit keep it.
    testTimeout: 15_000,
  },
});
