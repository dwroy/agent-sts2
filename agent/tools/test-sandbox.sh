#!/usr/bin/env bash
# Fixed sandbox exclusions: engine/CLI stdin and IPC subprocesses cannot complete here.
# Local HTTP server suites also cannot run: the sandbox denies listen(127.0.0.1) with EPERM.
# The scheduler runs every excluded file in the full suite outside the sandbox after a live merge.
# execFileSync wrappers receive EPERM even after exit 0; config tests read denied .env fixtures.
# Four threads keep the runner within four OS processes; all other tests remain enabled.
set -eu
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="$HOME/.local/node/bin:$PATH"
export npm_config_offline=true
nice -n 19 npx tsc -p tsconfig.json --noEmit
nice -n 19 npx vitest run --pool=threads --maxWorkers=4 --exclude tests/paths.test.ts \
  --exclude tests/brain-codex.test.ts \
  --exclude tests/brain-codex-session.test.ts \
  --exclude tests/brain-codex-usage.test.ts \
  --exclude tests/brain-claude.test.ts \
  --exclude tests/brain-knowledge.test.ts \
  --exclude tests/brain-loop.test.ts \
  --exclude tests/route-review.test.ts \
  --exclude tests/learner.test.ts \
  --exclude tests/eval.test.ts \
  --exclude tests/record.test.ts \
  --exclude tests/batch-j.test.ts \
  --exclude tests/deepseek.test.ts \
  --exclude tests/batch-e.test.ts \
  --exclude tests/deepseek-consistency.test.ts \
  --exclude tests/build-decider.test.ts \
  --exclude tests/mod-client.test.ts \
  --exclude tests/batch-m.test.ts \
  --exclude tests/fix-queue-v4.test.ts \
  --exclude tests/execution-gate.test.ts \
  --exclude tests/batch-c.test.ts \
  --exclude tests/run-plan-merge.test.ts \
  --exclude tests/jev-retry.test.ts \
  --exclude tests/loop.test.ts \
  --exclude tests/batch-n.test.ts \
  --exclude tests/batch-h.test.ts \
  --exclude tests/journal-replay.test.ts \
  --exclude tests/discovery.test.ts \
  --exclude tests/jev-prompt-log.test.ts \
  --exclude tests/batch-l.test.ts \
  --exclude tests/sl-loop.test.ts \
  --exclude tests/potion-equivalents.test.ts --exclude tests/monster-db.test.ts \
  --exclude tests/third-party.test.ts --exclude tests/logdb.test.ts \
  --exclude tests/boss-damage-tools.test.ts --exclude tests/knowledge-check-a8w-builder.test.ts \
  --exclude tests/outcome-stats.test.ts --exclude tests/ops-codex.test.ts \
  --exclude tests/config.test.ts \
  --exclude tests/route-event.test.ts \
  --exclude tests/build-facts-audit.test.ts \
  --exclude tests/batch-i.test.ts \
  --exclude tests/oneshot-rest-event.test.ts \
  --exclude tests/thief-card-value.test.ts \
  --exclude tests/oneshot-act-start.test.ts \
  --exclude tests/run-config.test.ts \
  --exclude tests/outcome-asc.test.ts \
  --exclude tests/boss-sim-build.test.ts \
  --exclude tests/oneshot-shop.test.ts \
  --exclude tests/batch-f.test.ts \
  --exclude tests/fix-queue-v4-fix2.test.ts "$@"
# paths.test.ts calls process.chdir(), which Node disallows in threads; use one fork for this file.
nice -n 19 npx vitest run tests/paths.test.ts --pool=forks --maxWorkers=1 "$@"
