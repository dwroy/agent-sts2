# jev-sts2

Play **Slay the Spire 2** with **Jev** (TypeSafe System One).

The `STS2-Agent` mod exposes live game state and legal actions over a local HTTP API. This project
owns the decision loop: read state → project it into a small, English, decision-shaped payload →
ask Jev typed questions (`choice` / `score` / `noul`) → sanity-check the answer → dispatch one legal
action.

The design, the verified facts about both systems, and the milestone plan live in [PLAN.md](./PLAN.md).
Read §5.4 before proposing any change that puts a language model on the decision path.

## Status

**M0–M4 implemented.** The full decision loop runs: read state → project it per screen → ask Jev →
gate → dispatch → verify → log. Every screen in the mod's `Screen` enum has a planner. Verified by
88 unit/integration tests, a scripted end-to-end loop test, and live read-only runs against a real
game (discovery, `/data/*`, planning, and a real Jev round trip).

Not yet validated live: dispatching during an actual run. Run `shadow` first — it makes the same
decisions and writes the same log, without touching the game.

## Requirements

- Node.js 20 or newer (developed on Node 25)
- Slay the Spire 2 running with the STS2-Agent mod loaded
- A TypeSafe API key for Jev

## Quick start

```sh
npm install
cp .env.example .env      # then fill in TYPESAFE_API_KEY
npm run doctor            # checks the mod, the state payload, and Jev
npm run shadow            # decides against the live game, dispatches nothing  <-- start here
npm run play              # the real thing
```

Useful variants:

```sh
npm run doctor -- --no-jev        # mod-side checks only, no API key needed
npm run doctor -- --json          # machine-readable report
npm run shadow -- --max-decisions 20 --poll 300
npm run play -- --max-runs 1 --max-minutes 60 --max-decisions 2000
npm run play -- --no-jev            # drive with code-only decisions (spends no tokens)
npm run dev -- record --max-minutes 2      # capture raw states into fixtures/states.jsonl
npm run dev -- replay                      # re-run the decision layer over those states, offline
npm run dev -- replay --ask                # ... and ask Jev again for each recorded state
```

### Checking without the game

If the game is not running, a fixture server stands in for the mod. With `FAKE_MOD_FIXTURES` it also
replays a `record`ed session, which is how `shadow`/`play` were tested without launching the game:

```sh
npm run fake-mod                  # serves /health, /state, /actions/available on :8080
npm run doctor -- --no-jev
FAKE_MOD_FIXTURES=fixtures/states.jsonl npm run fake-mod
```

## Commands

| Command | What it does |
| --- | --- |
| `doctor` | Checks the mod, the state payload, the protocol/state versions and the Jev credential. Read-only. |
| `shadow` | Full decision loop, **no dispatch**. Logs what it would do. Safest way to watch it think. |
| `play` | Full loop, dispatches actions. |
| `record` | Captures distinct raw `/state` snapshots to `fixtures/states.jsonl`. Read-only. |
| `replay` | Re-runs the decision layer over recorded states, offline. `--ask` re-queries Jev. |

## Safety model

The guards that keep this from wrecking a run (PLAN.md §8.1) are all in `src/loop.ts`:

- only actions present in the freshest `available_actions` are dispatched, and indexes are re-derived
  from that same payload;
- the state fingerprint is re-checked immediately before dispatch, so an intent computed against a
  stale board is dropped and re-planned;
- `end_turn` is removed from the option set when the mod reports it would be lethal, and a lethal
  `end_turn` answer is overridden in code;
- one action in flight, retryable mod errors mean "wait", non-retryable ones mean "re-plan", and
  three consecutive failures stop the loop;
- hard caps on decisions, Jev requests, tokens, and wall-clock minutes;
- `session.mode` must be `singleplayer`, or the loop stops instead of guessing;
- prompts that turn tutorials on (`NAcceptTutorialsFtue`) are **never** answered: the loop stops and
  hands back to you, because confirming one is a lasting setting change. Informational popups such as
  `NCombatRulesFtue` are still dismissed so play can continue. `ALLOW_FTUE_MODALS=true` opts in;
- a single-instance lock (`logs/loop.lock`) refuses to start a second loop while one is alive, so two
  runs cannot fight over the same game instance. `--force` takes over.
- three debounce guards stop the loop outrunning the game's animations: it re-reads before paying for
  an answer, reuses the last resolution while the board is unchanged, and waits for a `pending`
  action to settle. The summary prints how many calls that saved.

The loop never calls `/session/control`: the mod's own auto-play must stay off, or two loops would
fight over the same instance.

## What `doctor` verifies

1. Node version and effective configuration (secrets redacted).
2. Mod discovery: the configured URL, then a scan of `STS2_PORT_SCAN`, then the port the mod
   reports about itself in `/health`.
3. `/health`: service identity, mod/protocol/game versions, `ready` vs `degraded`, and
   `compatibility.missing_members[]` when a game patch has broken reflected members.
4. `/actions/available`: the current screen and the legal action names.
5. `/state`: screen, `session.mode` / `session.phase`, and — inside a run — character, floor, HP,
   gold, hand and enemy counts.
6. Jev: `GET /v1/models` plus one live `noul` smoke question, printing the answer and token usage.

## Configuration

Beyond `.env.example`, two settings shape behaviour on the main menu:

| Variable | Default | Meaning |
| --- | --- | --- |
| `RUN_START` | `auto` | `auto` continues an existing run when the mod offers it; `new` always starts a fresh run; `continue` only continues. |
| `CHARACTER` | *(unset)* | Character id or name to pick when starting a new run (e.g. `IRONCLAD`). Unset picks the first unlocked character. |
| `MAX_REQUESTS` / `MAX_TOKENS` | `2000` / `20M` | Budget caps for one `play`/`shadow` session. |
| `CONFIDENCE_ACT` | `0.55` | Below this the loop narrows the question or falls back to code. |
| `DECISION_LOG` | `./logs/decisions.jsonl` | One JSON line per decision: state fingerprint, questions, answers, chosen action, latency, tokens. |

## Layout

```
src/
  index.ts          CLI entry point
  config.ts         env + flag parsing and validation
  cli/doctor.ts     the `doctor` command
  cli/runtime.ts    discovery → knowledge → Jev wiring
  cli/reporter.ts   console output for the loop
  mod/client.ts     HTTP transport for the STS2-Agent API
  mod/schema.ts     payload validation + version guards
  mod/discovery.ts  base-URL discovery across the port range
  jev/client.ts     TypeSafe SDK wrapper and smoke check
  jev/questions.ts  typed choice / noul / score specs
  jev/answers.ts    defensive answer parsing
  knowledge/        /data/* cache and id → English text lookups
  project/          run brief, deck summary, narrow payload builders
  screens/          one planner per screen (combat, map, reward, shop, …)
  act/              legality gate, fingerprint, failure classification
  loop.ts           the decision loop: budget, circuit breaker, logging
  replay/           record and replay
  telemetry/        decision log writer
  util/             json + terminal helpers
tools/fake-mod.mjs  fixture server for offline checks
tests/              88 tests: screens, loop, mod client, discovery, schema, config
```

## Reading a decision log

```sh
node -e "const l=require('fs').readFileSync('logs/decisions.jsonl','utf8').trim().split('\n').map(JSON.parse); console.table(l.map(r=>({screen:r.screen,label:r.label,chosen:JSON.stringify(r.chosen),conf:r.confidence,fallback:r.fallback,jev_ms:r.latency_ms.jev})))"
```

Each record holds the exact questions and the full answer distribution, so a bad decision can be
replayed offline (`replay --ask`) after the question wording changes.
