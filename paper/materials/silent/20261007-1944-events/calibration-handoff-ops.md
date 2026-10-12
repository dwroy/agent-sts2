# 静默boss校准刷新交接

{
  "source": "e86c8b2a92210e17640662a01f832c6c6980e0e5",
  "merge": "b0b0e679dbab626af188fec8bb180af74e319e71",
  "publication": "a59421ec67d0fd044b31d8077f0074ae231b2bb7",
  "tree": "c345c2163a77556f49c2c442b732bc38ee322796",
  "version": "S1.boss-calibration2",
  "ledger": "silent-0244",
  "ledger_status": "proposed",
  "kind": "fight",
  "commits": [
    "873ed3d08bba0d29cdef102d35d57a861a245086",
    "e86c8b2a92210e17640662a01f832c6c6980e0e5",
    "b0b0e679dbab626af188fec8bb180af74e319e71",
    "a59421ec67d0fd044b31d8077f0074ae231b2bb7"
  ],
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "files": 233,
    "cases": 2441,
    "source_sandbox": {
      "exit": 0,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261007-154303-silent-boss-calibration/source-sandbox.log"
    },
    "python_fixed_fixtures": {
      "exit": 0,
      "cases": 12,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261007-154303-silent-boss-calibration/python-tests.log"
    },
    "consumer_fixed_fixtures": {
      "exit": 0,
      "cases": 5,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261007-154303-silent-boss-calibration/consumer-diagnostic.log"
    },
    "completed_checks": {
      "cached_archive_skipped": true,
      "identical_output_bytes": true,
      "zero_new_events_skip_preserves_outputs": true,
      "fixed_refit_exact": true,
      "artifact": "77a99507591f214838210917aa6c2c53e4654e8a7d3aa8f582071869a3e0555d"
    },
    "post_merge": {
      "sandbox": 0,
      "files": 233,
      "cases": 2441,
      "log": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261007-154303-silent-boss-calibration/live-sandbox.log",
      "tree": "4673719beac7aa733cb232641e68ed03ac8e654c",
      "tsc": 0,
      "vitest": 0
    },
    "external": "交调度器补跑，未冒报通过"
  },
  "publication_receipt": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/learner/runs/20261007-154303-silent-boss-calibration/live-publication.json",
  "report": "/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration/paper/materials/silent/boss-sim-calibration.md",
  "model": {
    "entry": "agent/tools/boss-sim/refresh-silent.py",
    "rule": "ascension or 20 new actual-outcome boss attempts; scheduler tick at :13/:43 and learner finish events",
    "artifact": "experiments/boss-sim/silent/77a99507591f214838210917aa6c2c53e4654e8a7d3aa8f582071869a3e0555d",
    "model_base": "4c691142c099ac0e3505abbec5d04afec9ee796c",
    "model_sha256": "54ad68889611dc2d1e52ca0313a12e0f00e01461911b7890df435fcfcf401969",
    "frozen_split_and_tune_keys": true,
    "old_archive_unchanged": true
  },
  "next": "据真实发布树确认所属ledger shipped、登记并通知Roy；完整外部tsc+vitest交调度器；不把新功能冒标bug-infra。原失败/冲突/检查日志全部保留。"
}
