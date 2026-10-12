export default {
  envDir: false,
  root: "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent",
  cacheDir: "/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-223545-strategy-proposal/vite-existing-cache",
  test: {
    globals: true,
    include: ["../learner/runs/20261007-223545-strategy-proposal/existing.test.ts"],
    setupFiles: ["tests/setup-potion-cost.ts", "tests/setup-boss-lines.ts"],
    testTimeout: 15000,
  },
};
