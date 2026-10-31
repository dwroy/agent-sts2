import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { createTempScope } from "./tools/temp-root.mjs";

const scratch = createTempScope();
Object.assign(process.env, scratch.env);

// The test files, the setup files and the timeout; everything else is vitest's default.
export default defineConfig({
  // Shared dependencies stay read-only; every worktree owns its generated test cache.
  cacheDir: fileURLToPath(new URL("../.cache/vitest", import.meta.url)),
  // Tests use fixed inputs; never load a live worktree's credentials or play configuration.
  envDir: false,
  test: {
    globalSetup: ["tests/temp-global-setup.ts"],
    env: { STS2_TEST_TMP_ROOT: scratch.directory ?? "", STS2_TEST_TMP_OWNER: scratch.token ?? "" },
    // This package's tests only (agent/tests): never the upstream submodule's, an old worktree's or a nested checkout's.
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/third_party/**", "**/.worktrees/**", "**/jev-sts2*/**"],
    setupFiles: ['tests/setup-knowledge-fixture.ts', "tests/setup-potion-cost.ts", "tests/setup-boss-lines.ts"],
    // 15 s per test (vitest's default is 5 s): the planner tests on logged boards take 1–4 s alone and time out at 5 s
    // while live play, its boss sims and the Windows-side game share the cores (2026-10-04). Tests with their own limit keep it.
    testTimeout: 15_000,
  },
});
