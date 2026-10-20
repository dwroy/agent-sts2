import config from '/home/dw/Projects/agent-sts2/.worktrees/codex-fix-silent-20261020-181302/agent/vitest.config.ts';
export default { ...config, cacheDir: process.env.TMPDIR + '/vitest-cache' };
