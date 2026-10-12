## 修 bug 回报
- 合并基线：main → 39f5d913477d2d3ec1834388f66c1793c3feb48b
- 修复（每条一行）：paper-dataset-git-consistency-race — d2b6ba962e5c6c3edc1e2cf2480b39220fdeb17d — 测试 agent/tests/paper-dataset-git.test.ts:pins Git export and verification to one ref snapshot and fails the CLI on source mismatches — 去掉修复时失败：是（Python 4例中的3例失败；恢复4例通过）
- 修复（每条一行）：boss-sim-codex-home-preflight — 待提交前全量检查终态 — 固定Python 5例通过，撤修复失败已留档
- 测试：第一提交前tsc0、Vitest344文件3413例0；第二提交前检查运行中，不宣称通过
- 合入：未开始
- 需要 Roy 定的事：无
