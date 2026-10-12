export default {
  envDir: false,
  cacheDir: '/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-044250-strategy-proposal/vite-cache',
  test: {
    include: [
      'tests/silent-fasten-upgrade.test.ts',
      'tests/silent-mirage.test.ts',
      'tests/silent-caltrops.test.ts',
    ],
    setupFiles: ['tests/setup-potion-cost.ts', 'tests/setup-boss-lines.ts'],
    env: { CHARACTER: 'silent' },
    pool: 'threads',
    maxWorkers: 1,
    testTimeout: 15000,
  },
};
