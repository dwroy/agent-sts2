# V6 prompt budget consumer interface

Recorded 2026-10-20 02:37 CST. This is a prompt representation change; it adds no game knowledge.

`agent/src/v6/prompt-summary.ts` is shared by W4/W5/W6 and W7 shop/rest builders.

- `compactBuildMetrics(metrics, targetIds)` keeps the pooled first/including-SL strata, DPR, startup turn, formed/cleared runs, F48→F49 counts/win rate, and at most two relevant adjusted target win rates, with their original denominators. It does not copy full evidence, provenance groups, simulation grids or shrinkage objects.
- `compactCombo(combo, targetIds, metrics?)` keeps ID, source/type, requirements/cards and the compact metrics. `compactProjection(entry)` preserves projection-entry numeric fields and removes the opaque metric snapshot.
- `prioritize(rows, weights, directionOf, scoreOf)` sorts direction weight descending, then expected win descending, with original order as a deterministic tie breaker. Call it before bounding arrays.
- `boundV6State(state, limit, unit)` removes trailing optional rows and then optional facts. Answer-validation direction keys and legal option keys survive. The returned `prompt_budget` records before/after sizes, ceiling, units and counts by omitted path.
- `boundedV6Jev(state, questions)` also bounds descriptive question text, preserving all choice keys inside `criteria` and all noul slot keys. Use the returned state **and** questions together.
- `promptBudgetLabels(state)` emits the truncation/size label for `v6-build.jsonl.degradation`. Exact omission counts remain in the request state.

Application ceilings: Jev state 16,000 UTF-8 bytes; Jev Decisions request 24,000 UTF-8 bytes including model/questions/framing; brain V6 payload 64,000 JSON characters. These are conservative application limits. Nova returned `max_tokens_exceeded` for the old 6,955,048-byte request but did not disclose a numeric provider limit; do not describe these application limits as a discovered Nova maximum.

`V6BuildLog` adds optional `metric_audits` references. Large snapshots are immutable `v6-metrics/<sha256>.json` beside `v6-build.jsonl`; the hash covers the JSON content without the trailing newline. Numeric projection entries remain in the JSONL. Small existing snapshots and all off paths keep their original representation. The entry validator now accepts the real R2 snapshots (up to 21,434 nodes; bounded ceiling 50,000). The log schema accepts up to 20,000 numeric rows, within its existing 2 MiB serialized-row ceiling; a production reward has 1,224 rows.

Tests load the published Silent R2 file (four directions/17 combinations), assert prompt ceilings and legal answers/fallbacks for brain/card/potion/shop/rest, and exercise known provider rows through the consumer for every real combination. Tests do not make network requests.

No simulation, Jev provider/client, game knowledge, operational prompts, live files or STOP state are changed by this work package.
