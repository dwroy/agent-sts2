# Jev Plays Slay the Spire 2 — Project Plan

Status: draft for review
Scope: a new Node.js/TypeScript project that drives **Slay the Spire 2** through the
`STS2-Agent` mod's local HTTP API and makes every gameplay decision with **Jev**
(TypeSafe System One), plus deterministic code.

Decisions locked with the user (2026-09-19):

1. **Single-player only.** The co-op / AI-teammate route is out of scope.
2. **English game locale.** Card, relic, monster and event text can be sent to Jev as-is, with the
   `card_id` → English canonical lookup kept as a safety net.
3. **State compression is programmatic, not LLM-based.** A traditional LLM is available only as an
   optional, off-by-default *enricher* for off-hot-path work (§5.4).
4. **No optimisation target yet.** The goal is a working end-to-end loop; win-rate/cost tuning is
   deferred (§12, M5–M6 become optional follow-ups).

### Implementation status

| Milestone | State |
| --- | --- |
| M0 — scaffold + `doctor` | **done**: config, mod client, port discovery, payload validation, Jev wrapper + smoke check, fixture server |
| M1 — projection + record/replay | **done**: per-screen projection, `/data/*` knowledge cache, `record`, `replay [--ask]` |
| M2 — combat MVP | **done**: candidate enumeration with code-computed facts, safety floor, confidence gate with one shortlist re-ask, deterministic fallback |
| M3 — non-combat screens | **done**: map, reward, card selection, shop, event, rest, chest, bundle, capstone, character select, timeline, crystal sphere, menus/overlays |
| M4 — full-run loop | **done**: budget caps, circuit breaker, run boundary, JSONL decision log, metrics, and the menu → character select → embark path |
| M5/M6 — evaluation and tuning | not started (optional per the agreed scope) |

125 tests plus a scripted end-to-end loop test; verified live against mod **0.12.5** (upstream's
latest release is 0.13.0, 2026-09-19) for discovery, `/data/*`, planning, a real Jev round trip, and
hundreds of dispatched actions across several runs.

Deliberate differences from the text above, recorded so the plan stays honest:

1. **`project/` and `decide/` are one layer.** Screen-specific code lives in `src/screens/*.ts` and
   returns a `Decision` (narrow state + typed questions + a resolver). Two modules per screen added
   indirection without adding testability, so the split was dropped (§4).
2. **Polling, not SSE.** `src/mod/events.ts` was never needed: a 400 ms poll is simpler, and the
   loop only acts when the mod says an action is legal. SSE stays a possible optimisation (§7.1).
3. **Shop uses one Choice, not a noul fan-out plus a knapsack.** `affordable` items become options,
   "remove a card" and "stop shopping" are options too, and one purchase happens per decision before
   re-reading the shop. Same division of labour (Jev judges value, code owns affordability), fewer
   moving parts (§6.5).
4. **The Run Brief is code-only.** Deck stats, relics, potions and rolling notes are derived from
   fresh state; no extra Jev calls are spent maintaining it (§7.2).
5. **Screen planners get a small per-visit memory.** `DecisionEnv.screenMemory` is owned by the loop
   and reset whenever the screen changes. The shop needs it to distinguish "just arrived" from
   "browsed and chose to leave": without it a live shop visit flapped open → close → open forever,
   because affordable stock still existed after the decision to leave (§6.5). The reward screen needs
   the same thing for a different reason: the mod documents that `skip_reward_cards` "may leave the
   underlying reward item claimable", so without a flag the planner claims the card reward again and
   skips forever (§6.3).
6. **`state_version` is 16, not 11.** The upstream docs say 11 while the installed Workshop build
   reports 16; the guard was moved to 16 and left as a warning.

---

## 1. Goal

Build an autonomous STS2 bot where:

- the mod (already installed) exposes live state and legal actions over HTTP at
  `http://127.0.0.1:8080` (configurable, and the real port must be read back from `/health`);
- this project owns the loop: read state → project it into a small, English, decision-shaped
  payload → ask Jev typed questions → sanity-check the answer → dispatch one legal action;
- judgement calls (path, card to play, target, reward, shop, event, rest) belong to Jev;
  legality, arithmetic, bookkeeping, safety and memory belong to our code.

Non-goals for v1: training a model, screen-scraping pixels, replacing the mod, building a
general-purpose game-playing framework, and **multiplayer/co-op** (see fact 6 below — we still read
`session.mode` and refuse to act if the run is not single-player).

---

## 2. Verified facts about the two systems

Everything below was checked against the current upstream sources during research
(2026-09). Nothing here is guessed.

### 2.1 STS2-Agent (the game side)

Repo: `https://github.com/CharTyr/STS2-Agent` (AGPL-3.0). The C# mod runs an embedded HTTP
server, default `http://127.0.0.1:8080`, protocol `2026-03-11-v1`, state model `state_version: 11`.

| Endpoint | Use for us |
| --- | --- |
| `GET /health` | Is the mod alive, what port is it actually on, is a run active |
| `GET /state` | Full state snapshot — the decision input |
| `GET /actions/available` | Legal actions **and** required argument shape |
| `POST /action` | Execute exactly one action; returns the resulting state |
| `GET /events/stream` | SSE: `combat_started`, `player_action_window_opened`, `screen_changed`, `available_actions_changed`, … |
| `GET /data/{collection}` | Static metadata: `cards`, `relics`, `monsters`, `potions`, `events`, `powers`, `characters` |
| `POST /session/control` | Starts the mod's **own** auto-play loop — we will never call this |
| `POST /mcp` | Optional MCP surface, off by default — not needed |

Envelope: `{ ok, request_id, data }` on success, `{ ok, request_id, error: { code, message, details, retryable } }`
on failure. Action responses carry `status` plus a fresh `state`.

Key behavioural facts that shape the design:

1. **The port is not always 8080.** If 8080 is taken the mod auto-increments; `/health` reports the
   real `api_host` / `api_port`. We must discover, not assume.
2. **`GET /state` is a large object** (potentially tens of KB: full deck, all powers, full map graph).
   It takes **no query parameters**. *(Corrected after a live capture: the installed build does carry
   an `agent_view` field inside `/state`; the earlier reading of `Router.cs` was about the route
   handler, not about the payload builder.)* → We still build our own projection (§5.4): the canned
   `agent_view` is one shape per screen, cannot be narrowed to a single question, and renames keys
   away from the authoritative indexes. It remains useful as a cross-check when a payload looks odd.
3. **Legality is authoritative in the payload.** `available_actions` and `combat.action_readiness`
   come from the *same* gate evaluation, so they can never disagree. If
   `combat.action_readiness.can_use_combat_actions` is `false`, the `reason` names the single thing in
   the way (`hand_in_card_play`, `action_queue_unsettled`, `not_player_action_phase`,
   `snapshot_stabilizing`, `modal_open`, `combat_paused`, …) and the correct response is *wait*, not
   retry.
4. **Indexes are volatile.** Hand, node, reward and selection indexes must be re-derived from the
   freshest payload every time; `play_card` takes `card_index` + optional `target_index`, and the
   descriptor's `requires_target` is always `false` — the real answer is
   `combat.hand[].requires_target` plus `valid_target_indices`.
5. **Error codes drive recovery.** `state_unavailable` / `session_not_ready` / `pause_pending` are
   retryable (503/409); `invalid_action` / `invalid_target` / `forbidden_actor` are not — fix the
   request or re-read state instead of repeating it.
6. **Single-player and multiplayer are different products.** `state.session.mode` /
   `state.session.phase` is the first routing key, never the screen name. We are doing single-player
   only (decision #1), so `mode != "singleplayer"` is a **stop condition** rather than a branch: the
   loop logs it and halts instead of guessing at voting and teammate semantics.
7. **The mod's built-in auto-play speaks OpenAI chat-completions.** Jev does not — it is not a chat
   endpoint. So we cannot point the mod at Jev; an external agent (this project) is the only way to
   play with Jev, and we must leave `/session/control` alone so two loops never fight.
8. **External takeover is a supported route.** The mod explicitly supports driving an instance from
   outside via `GET /state` + `POST /action`, which is exactly what we do from the human instance.
   (Co-op would additionally expose the teammate instance's `api_port` under
   `/health → data.companion`; out of scope.)
9. **Card numbers come from the game's preview, evaluated for whatever the UI has hovered.**
   `GameStateService.BuildCardDynamicValuePayloads` clones the card's dynamic vars and calls
   `card.UpdateDynamicVarPreview(CardPreviewMode.Normal, card.CurrentTarget, previewSet)`, and the
   same call feeds `resolved_rules_text`. So a target-aware preview exists in principle, but the
   target is `card.CurrentTarget` — the UI's hover — and an agent never hovers. There is **no API
   parameter** to ask "what would this card do to enemy X"; the mod reads UI state, it does not
   simulate. Verified live and in the source: `STRIKE_IRONCLAD` reports `Damage=6` while the board
   carries `Vulnerable 2`, and the game resolves that as 9.
   → Resolution-time modifiers are therefore ours to compute (§6.1), not something to ask for.

### 2.2 Jev / TypeSafe System One (the brain)

Docs: `https://docs.typesafe.ai`. Model `jev-1.13.0` (alias `jev-latest`), served by
`POST https://api.typesafe.ai/v1/systemone`. JS SDK `@typesafe-ai/sdk@0.6.0`, Node ≥ 20, zero runtime
dependencies, ESM + CJS + types.

| Property | Value | Consequence for us |
| --- | --- | --- |
| Input | **Text only**: string, JSON object, or array of text. No images. | We must project state to text/JSON. Fine — the mod gives us JSON. |
| Primitives | `choice` (pick one of ≤255 options), `score` (ordered levels), `noul` (P(yes)) | Enough to express every STS2 decision. |
| Answers | `choice` + `probabilities` + `confidence`; `score` + `legend` + `confidence`; `noul` ∈ [0,1] | We can threshold and route, not just take the top answer. |
| Batched questions | All questions in one request are evaluated **in parallel and independently**; latency barely moves, extra questions cost a few tokens | Ask speculative/extra questions in the same call and ignore what we don't need. |
| Context | 64k tokens per request; **32k for `state` plus the longest question** | Projection is mandatory, and it is also an accuracy lever. |
| Price | **$42 / billion input tokens** ($0.042 / Mtok); output free | ~5k-token state ≈ $0.00021 per decision. See §8.3. |
| Rate limits | 250k tokens/s, 1200 req/min (dynamic) | A 1–2 s decision cadence is far below the limit. |
| Language | English is the primary training language; CJK is accepted but less accurate | Send English. Map `card_id` → English canonical text if the game locale is not English. |
| Model shape | System-1 "gut check", not a reasoner. **Does not count, does not do arithmetic, struggles with indirection, dates and spatial/numeric relations.** Fails the same way when the state is padded with irrelevant detail. | Code computes all numbers; we ask narrow, literal, one-thing questions. |

Three documented failure modes drive most of the design in §5–§6:

> literal reading · math and numbers · large state full of irrelevant detail

The official guidance is explicit: **keep arithmetic in code, decompose broad judgements into atomic
questions, filter the state before sending it, and always offer an `other`/`none of the above`
option when the option set might not cover the case.**

---

## 3. Architecture

```
        ┌───────────────────────────┐
        │  Slay the Spire 2         │
        │   + STS2-Agent mod        │
        │  HTTP API on 127.0.0.1    │
        └─────────────┬─────────────┘
                      │  GET  /health, /state, /actions/available, /events/stream
                      │  POST /action
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  jev-sts2  (Node.js 20+, TypeScript)                        │
│                                                             │
│  1  mod client         HTTP transport, port discovery, SSE   │
│  2  knowledge cache    /data/{collection} + English text     │
│  3  projection         raw state -> narrow decision context  │
│  4  question builders  typed choice / score / noul specs     │
│  5  Jev                @typesafe-ai/sdk -> api.typesafe.ai   │
│  6  intent selection   confidence gate + safety floor        │
│  7  legality gate      checked against fresh available_actions│
│  8  memory             Run Brief + decision log              │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Layers and responsibilities

| Layer | Module | Owns | Never does |
| --- | --- | --- | --- |
| Transport | `src/mod/client.ts` | HTTP calls, envelope unwrapping, typed errors, timeouts | Interpret game semantics |
| Schema | `src/mod/schema.ts` | Validating `/state`, `/health`, `/action` payloads; protocol/state version guards | Assume fields exist |
| Wake-up | `src/mod/events.ts` | SSE consumption, "state changed" signals, backoff polling fallback | Decide anything |
| Knowledge | `src/knowledge/*` | `/data/{collection}` fetch + on-disk cache; `card_id` → English name/rules text | Per-decision refreshes |
| Projection | `src/project/*` | Screen-specific slicing of raw state into a small English payload | Judge the situation |
| Decision | `src/decide/*` | Building typed questions + option lists with code-computed facts | Compute numbers itself |
| Strategy | `src/strategy/*` | The **Run Brief** (§7.2) and code-side heuristics used as fallbacks | Override the safety floor |
| Execution | `src/act/*` | Legality gate against `available_actions`, action dispatch, post-action verification | Fire unadvertised actions |
| Loop | `src/loop.ts` | Cadence, budget, circuit breaker, state reconciliation | Contain game rules |
| Telemetry | `src/telemetry/*` | JSONL decision log, metrics, cost accounting | Contain secrets |
| Replay | `src/replay/*` | Record raw states; replay decisions offline | Touch the live game |

### 3.2 Why a projection layer at all

Two independent reasons, both documented:

1. **Hard limit** — `state` + longest question must fit in 32k tokens. A late-game state with a full
   deck, full map graph, all powers and all intents can approach that on its own.
2. **Accuracy** — Jev's accuracy drops as the state fills with material unrelated to the question.
   Sending the whole map graph to answer "which card do I play" is not neutral; it costs correctness.

So projection is not an optimisation we add later. It is the core engineering work of this project.

---

## 4. Proposed project layout

```
jev-sts2/
├── package.json                 # type: module, engines.node >= 20
├── tsconfig.json
├── .env.example                 # TYPESAFE_API_KEY, STS2_BASE_URL, budget knobs
├── PLAN.md                      # this document
├── README.md
├── src/
│   ├── index.ts                 # CLI: doctor | record | replay | play | shadow
│   ├── config.ts                # env + flag parsing, defaults, validation
│   ├── loop.ts                  # the decision loop (§7)
│   ├── mod/
│   │   ├── client.ts            # /health /state /actions/available /action
│   │   ├── schema.ts            # zod schemas + version guards
│   │   ├── discovery.ts         # probe 8080..8090, then trust /health's api_port
│   │   └── events.ts            # SSE client with reconnect + poll fallback
│   ├── knowledge/
│   │   ├── cache.ts             # collection fetch + disk cache, keyed by mod_version
│   │   ├── index.ts             # lookup helpers (card, relic, monster, potion, power, event)
│   │   └── english.ts           # canonical English names/rules text when locale != en
│   ├── project/
│   │   ├── index.ts             # project(state, knowledge, brief) -> DecisionContext
│   │   ├── combat.ts
│   │   ├── map.ts
│   │   ├── rewards.ts
│   │   ├── shop.ts
│   │   ├── selection.ts
│   │   ├── event.ts
│   │   └── misc.ts              # chest, rest, bundle, capstone, character select, menus
│   ├── decide/
│   │   ├── types.ts             # Decision, QuestionSpec, OptionSpec, ActionIntent
│   │   ├── combat.ts
│   │   ├── map.ts
│   │   ├── rewards.ts
│   │   ├── shop.ts
│   │   └── ...
│   ├── strategy/
│   │   ├── run-brief.ts         # rolling strategy memo (§7.2)
│   │   ├── heuristics.ts        # deterministic fallbacks + safety floor
│   │   └── lethal.ts            # code-side damage/block math
│   ├── llm/
│   │   └── enricher.ts          # OPTIONAL OpenAI-compatible client, off by default (§5.4)
│   ├── act/
│   │   ├── gate.ts              # is this intent advertised and well-formed right now?
│   │   └── dispatch.ts          # POST /action, verify transition, classify errors
│   ├── telemetry/
│   │   ├── decision-log.ts      # JSONL record per decision
│   │   └── metrics.ts           # counters, cost, latency percentiles
│   └── replay/
│       ├── record.ts            # dump raw states to fixtures/
│       └── replay.ts            # re-run decision logic offline against fixtures
├── fixtures/                    # recorded raw `/state` snapshots (gitignored by default)
└── tests/                       # vitest: projections, question builders, gate, replay goldens
```

Dependencies stay deliberately thin: `@typesafe-ai/sdk`, `zod`, and dev-only
`typescript` / `tsx` / `vitest` / `@types/node`. HTTP is `fetch`, CLI is `node:util`'s
`parseArgs`, SSE is a hand-rolled reader over `Response.body` (we need the multi-line `data:`
reassembly anyway).

---

## 5. State projection

`project(state, knowledge, brief) -> DecisionContext` produces, per screen, a small English payload
plus the option list that the questions will reference.

### 5.1 Rules the projection must obey

1. **One screen, one payload.** Never send combat + map + shop in the same state blob.
2. **Only facts that bear on this decision.** If a field is not an input to the question, drop it.
3. **Numbers are pre-computed in code** and sent as labelled facts, never as raw inputs for Jev to
   combine (`"incoming_damage_after_this_block": 7`, not `damage: 12, block: 5`).
4. **Stable IDs everywhere**, so answers can be mapped back deterministically
   (`c3`, `e1`, `n12_7`, `r2`), and every option carries the index the API expects.
5. **English canonical text.** Use `card_id` / `enemy_id` / `relic_id` to look up English names and
   rules text from the knowledge cache. Never send localized strings to Jev.
6. **Quote untrusted text.** Card rules text and event text are data, not instructions. Wrap them
   (`"text": "..."`) and keep them out of the question `instructions`. Jev is documented as
   steerable by adversarial content.
7. **Budget the payload.** Target 2–6k tokens typical, 10k worst case. Log actual token counts per
   decision; a projection that balloons is a bug.

### 5.2 Per-screen payload contents

| Screen | Payload | Approx. size |
| --- | --- | --- |
| `COMBAT` | player HP/block/energy/stars/powers, per-enemy HP/block/powers/**intents with total damage**, hand with resolved text and code-computed effect previews, potion slots, a short situation line | 1.5–4k |
| `MAP` | current node, available nodes with type, boss, plus the pre-enumerated candidate routes (§6.2) and the Run Brief | 1–2k |
| `REWARD` | offered cards with resolved text, alternatives, reward types, deck summary, Run Brief | 1–2.5k |
| `CARD_SELECTION` | prompt, `kind` (`deck_upgrade_select`, `deck_card_select`, …), candidate cards only | 0.5–2k |
| `SHOP` | gold, itemised stock with prices + affordability, card-removal status, deck summary, Run Brief | 1–3k |
| `EVENT` | title, description, options with `is_locked` / `will_kill_player`, Run Brief | 0.5–1.5k |
| `REST` | options with `is_enabled`, HP, upgradeable cards, Run Brief | 0.5–1k |
| `CHEST` / `BUNDLE_SELECTION` / `CAPSTONE_SELECTION` | the option list, minimal context | 0.3–1k |
| `CHARACTER_SELECT` | unlocked characters + ascension level | 0.2k |
| overlays (`MODAL`, `GAME_OVER`, `UNLOCK`) | overlay text; most are answered in code | 0.2–1k |

**Deck sizing.** Combat gets a deck *summary* (counts by type/cost, upgrade count, key synergies).
Deck-shaping decisions (card reward, shop, smith, remove, transform) additionally get the full deck as
one compact line per card. 30 lines × ~15 tokens ≈ 450 tokens — cheap, and it is exactly the context
those decisions need.

### 5.3 Rejected alternative: reuse the mod's compact MCP view

The mod can serve a compact `agent_view` over MCP (`F8 → Connect → enable MCP`, then
`POST /mcp` → `get_game_state`). Reusing it would save us writing a projection, but we are not
choosing it for v1:

* it is **off by default** and needs the user to enable it in the overlay;
* it is one canned view per screen, so it still contains fields our question does not need and it
  cannot be narrowed per decision (the §3.2 context-rot problem);
* the `compact` view renames keys (`i`, `alive`, `targets`, `usable`, `stocked`, `affordable`, … per
  the mod's mapping table), which puts a translation layer between us and the authoritative indexes;
* it carries no option list for the question we are about to ask, so the decision layer would still
  have to build one.

It stays useful as a **debugging cross-check** in `doctor` and as a fallback if the raw schema changes.

### 5.4 Why the projection is programmatic, not LLM-compressed

An alternative that looks attractive: accept an OpenAI-compatible endpoint + key, and let a
traditional LLM summarise `/state` into a tidy prompt before it reaches Jev. It is a real option, and
we are deliberately not taking it for the decision path.

| Dimension | Programmatic projection (chosen) | LLM compression |
| --- | --- | --- |
| Determinism | same state → same payload; replay and regression tests compare exactly | paraphrases drift between runs; the same state can produce a different prompt, so "why did it do that" gets harder to answer |
| Numbers | lethal, damage-after-block, energy, affordability are computed in code and are *correct* | LLMs are unreliable at arithmetic, and a wrong number silently becomes Jev's premise |
| Index fidelity | emits the literal `card_index` / `target_index` / `option_index` the API needs | indexes get reworded or dropped, so the answer no longer maps back to a legal action |
| Hot-path latency | ~1–5 ms | +0.5–3 s per decision, on top of Jev, 3–6 times per combat turn |
| Cost | free | a second model call per decision, roughly doubling spend and adding a second failure domain |
| Failure mode | a missing field is a bug we fix once and pin with a unit test | a silently omitted field — the output always *looks* fine |
| Alignment with Jev's docs | exactly the documented guidance: "filter first, send only what the question needs" | an extra hop of indirection, the failure mode Jev is documented to be weakest at |

The decisive point is that projection is not only compression. It is also where the arithmetic
happens, where the candidate/option list is enumerated, and where the answer→action mapping is
defined. An LLM could only ever do the first third of that job, and it would do it nondeterministically.

Where an LLM *is* worth having — optional, off by default, never on the critical path:

* **Run Brief narration** (§7.2): turn a long decision log into the ~200-token strategy memo. Real
  summarisation, run once per floor or per reward, and if it fails we simply keep the previous brief.
* **Unknown-screen fallback**: after a game patch, a screen we do not model can be handed to the
  enricher so the bot degrades (pick something from `available_actions`) instead of halting.
* **Build-time authoring aid**: draft the English `criteria` text for a new question from `/data/*`,
  which we then review and commit as static code. Never called at runtime.

All three are rare or off the hot path, and none of their outputs are numbers the game depends on.

### 5.5 How much history we carry

Short answer: **almost none, and never raw.** Jev is stateless and its questions are local, so a
transcript of previous turns would be the archetypal "large state full of irrelevant detail" that the
docs warn about.

What actually needs history, and where it comes from:

| Need | Source |
| --- | --- |
| What happened earlier *this turn* | the fresh state (`combat.player.cards_played_this_turn`, `attacks_played_this_turn`, `skills_played_this_turn`, current hand/energy) |
| What is in the deck, and its shape | the fresh state (`run.deck[]`) — never a log |
| Which relics/potions we hold, how much gold | the fresh state (`run.relics[]`, `run.potions[]`, `run.gold`) |
| Where we are on the map and what we committed to | `map.*` plus the cached route plan (§6.2) |
| Enemy behaviour across turns | `combat.enemies[].intents[]` is visible up front, so it is a state field, not a memory |
| Cross-floor strategy (archetype, needs, what we already skipped) | **the Run Brief** (§7.2) — the only deliberate memory, ~200 tokens, curated by code |

So the answer to "is history not that important, can we just build the state programmatically?" is
**yes on both counts**. The one piece of history that does matter is the plan — and it is kept as a
short, code-curated memo rather than as a transcript.

### 5.6 Option-set size, and why we do not split questions

A Choice question accepts **at most 255 options** (Jev docs). `choiceQ()` is the single place every
planner builds an option set, and it now enforces that limit — an over-large question fails in code
with a readable message instead of coming back as an opaque 422. The same check rejects an empty
option set. The planner failure is caught by the loop, reported, and tripped into the circuit breaker
after three consecutive occurrences.

Where we actually sit, measured over 257 recorded live states: the largest option set was **19**
(combat, 5 cards × 4 enemies). The theoretical worst case is roughly
`hand × valid targets + potions × targets + 1`, which stays under 100; deck-wide selection screens are
bounded by deck size. The 255 cap is not a constraint we are near.

What we *do* have is **question-level fan-out**: several questions go in one request and are
evaluated in parallel (combat asks `play` and `survival` together). What we deliberately do not have
is **option-level splitting**. The naive version of "split the options, ask twice, take the highest
probability" is unsound: a Choice answer is *relative* to the options supplied, so probabilities from
two different calls are not comparable, and the docs warn explicitly against assuming that kind of
invariance between questions.

If an option set ever did approach the cap, the sound options in order of preference are:

1. **filter in code first** — the documented guidance, and what every planner already does;
2. **a Noul fan-out** — one absolute per-option question per candidate, all in a single request, then
   take the maximum in code. This is the correct shape of "batch, then pick the max": Noul answers are
   absolute rather than relative, so they *are* comparable across options (the docs' own skill
   suggestion cookbook does exactly this);
3. **a two-stage shortlist** — narrow in code, then one Choice over the survivors (which is also the
   way to raise confidence: 19 options gave a top probability of 0.29, 4 options gave 0.18 but on a
   much more meaningful set).

---

## 6. Decision design per screen

The governing split:

> **Code decides what is possible and what it costs. Jev decides what is better.**

### 6.1 Combat

The highest-frequency decision, so it gets the most structure.

**Step 1 — candidate enumeration (code).** For every hand card with `playable === true`, cross it with
its legal targets (`valid_target_indices`, or a single `null` target when `requires_target` is false).
Each candidate becomes one option:

```
c3->e1  Play Strike+ (Attack, 1E) on Jaw Worm
        damage 9 -> e1 hp 22->13 (not lethal)
        energy 3->2 | kills: no | overkill: 0
        incoming next turn after this play: 11
```

Computed facts (all in `src/strategy/damage.ts`, never in Jev):

* damage this instance deals to each target: the mod's `dynamic_values` number (which already carries
  Strength and card-specific scaling such as Perfected Strike's `CalculatedDamage`), then the
  resolution-time modifiers the mod does **not** apply — Vulnerable on the target (×1.5), Weak on us
  (×0.75) and Intangible (each hit capped at 1) — each floored **per hit**, with block consumed hit by
  hit (6 damage twice against 8 block deals 4, not 0);
* lethal / overkill per target; whether this play kills the last enemy;
* block gained; incoming damage after this play, resolved with the same rules against our own powers
  and the enemies' Weak, with block consumed across attackers;
* energy/star cost and what stays playable afterwards;
* free-value flags (0-cost, "draws a card", "gains energy") so Jev can see the tempo.

Then `end_turn` is appended, **and potion actions** from `run.potions[*].can_use`.

**Step 2 — questions (Jev).** One primary Choice plus cheap speculative companions in the *same*
request:

```ts
{
  state: projectedCombatState,          // ~2-4k tokens
  questions: {
    play: choice("Which single action should I take right now?", {
      "c3->e1": "...", "c1": "...", "end_turn": "...", "potion:1": "...",
    }),
    potion_needed: noul("Do I need a potion this turn to survive or to secure a kill?"),
    danger: score("How bad is my position if the enemy turn starts after this action?", [
      "Comfortable", "Manageable", "Dangerous", "Likely lethal",
    ]),
  },
}
```

Each option's criteria value carries the card's English text plus the computed facts above.
`danger` and `potion_needed` are speculative: they cost a few tokens, arrive in parallel, and are
exactly the signal a confidence fallback needs.

**Step 3 — what happens to the answer (code).**

With Jev enabled the model decides, full stop (`STRICT_JEV`, default on). Its answer is dispatched as
given; `confidence` is recorded but never used to replace the decision. The facts that used to drive
code overrides are instead put in front of the model: `situation.ending_turn_would_kill_me`, and a
`lethal` flag plus the projected HP on the `end_turn` option. Two consequences worth stating plainly:

- a low-confidence answer is still acted on (a live run dispatched on 0.21);
- `end_turn` stays in the option list even when the mod says it would be lethal.

`--allow-fallback` (or `STRICT_JEV=false`) restores the earlier policy, kept for comparison runs:

1. `end_turn` is removed from the option set when `end_turn_will_kill_player` is true.
2. `confidence < 0.55` triggers one shortlist re-ask (top 3 by probability + the code-best options);
   if that is still below the threshold, the deterministic heuristic takes over
   (`kill if lethal → block for incoming → best damage-per-energy → end_turn`).
3. A lethal `end_turn` answer is overridden.

What is never negotiable, in either mode: an intent that is not in the freshest `available_actions`,
or whose index is no longer valid, is dropped. That is not a second opinion — it is the difference
between an action that can execute and one that would be rejected with a 409.

Then dispatch and re-read. Repeat until `available_actions` no longer contains `play_card`.

**One action per Jev call** is the v1 design: it is the most literal, least indirect question, which is
what Jev is good at, and combat turns are short (typically 3–6 calls). A later optimisation may
enumerate plausible *sequences* in code and ask Jev to pick a plan; that is a §11 experiment, not the
baseline, because multi-step plans are exactly the "indirection" Jev is documented to be weaker at.

### 6.2 Map / route planning

Route choice is the clearest case where code should generate and Jev should judge:

1. **Code** walks `map.nodes[]` (the full graph, with `parents`/`children`) from the current node and
   enumerates the best K ≈ 5 routes to the boss, scoring edges with a code-side value table that
   depends on the Run Brief — e.g. elites are worth more with a strong deck and high HP, rest sites
   more when HP is low, shops more when gold ≥ 200 and the deck has a card worth removing.
2. **Jev** picks among those K plans:

```jsonc
{
  "map_plan": {
    "instructions": "Which route should I commit to?",
    "A": { "nodes": "Elite -> Rest -> Shop -> Elite -> Boss",
           "facts": { "elites": 2, "rests": 1, "shops": 1, "hp": "41/70 (59%)",
                      "deck_power": "strong early", "gold": 214, "potions": 1 } },
    "B": { "nodes": "Monster -> Event -> Rest -> Monster -> Boss", "facts": { } },
    "C": { "nodes": "...", "facts": { } }
  }
}
```

3. The chosen plan is **cached** (keyed by `run_id` + current node) and executed node by node with
   `choose_map_node` using the freshly read `map.available_nodes[].index` — never a remembered index.
   Re-plan when the next plan node is no longer offered (the graph is only partially visible ahead, so
   this happens), or when HP/HP% changes materially.

### 6.3 Rewards

* Take the non-card rewards and open the card choice (the mod's `collect_rewards_and_proceed` is the
  shortcut, but for v1 we drive `claim_reward` explicitly so card choice stays ours).
* Card choice: `choice` over `reward.card_options[]` **plus a `skip` option** (Jev docs: always offer
  "none of the above" when the set may not cover reality).
* Run Brief questions are batched into the same request when the deck changes (`on_plan` noul,
  `needs_block` / `needs_damage` / `needs_scaling` nouls) so the brief updates for free.

### 6.4 Card selection (smith / remove / transform / enchant)

* Filter in code: only non-upgraded cards for `deck_upgrade_select`, only things that make sense for
  the verb otherwise.
* One `choice` over the surviving candidates; for multi-select screens, ask once per pick and loop,
  respecting `selection.min_select` / `max_select` / `selected_count` / `can_confirm`.

### 6.5 Shop

Budget allocation is arithmetic → code; item worth is judgement → Jev.

1. `choice` on the removal service: "Should I pay N gold to remove a card? If yes, which one?" —
   include `not now` as an option.
2. Fan-out `noul` per purchasable item: *"Given this deck and these needs, is this item worth its
   price right now?"* — one call, N questions, evaluated in parallel.
3. Code then solves the 0/1 knapsack against `gold` (greedy by `price / value`, ties broken by Jev
   probability) and emits `buy_relic` / `buy_card` / `buy_potion` actions in order.
4. `open_shop_inventory` → actions → `close_shop_inventory` → `proceed`, per the documented flow.

### 6.6 Event

* Locked options (`is_locked`) are filtered in code; `will_kill_player === true` options are removed
  unless nothing else is available.
* One `choice` over the remaining options with the event text in the state (quoted).
* Re-read after every branch: events advance in place, and a branch may open a fight or a card
  selection.

### 6.7 Rest, chest, bundle, capstone, character select

All are small `choice` questions over 2–5 options with the Run Brief attached. Rest = `HEAL` vs
`SMITH` (+ other `option_id`s), driven by HP% and the number of upgradeable cards.

### 6.8 Crystal sphere

**Pure code.** It is a grid-placement puzzle: item shapes, hidden cells, limited divinations — a
spatial/numeric problem, exactly what Jev is documented to be worst at. A small expected-value solver
in code plays it; Jev is not consulted.

### 6.9 Menus, overlays, and end-of-run

Deterministic routing, no model calls: `MODAL` → `confirm_modal`/`dismiss_modal` (Jev only if the
modal text genuinely needs a judgement, e.g. "abandon run?" → never), `UNLOCK` → `confirm_unlock`
until closed, `MAIN_MENU` → `continue_run` else `open_character_select`, `GAME_OVER` →
`continue_game_over` before anything else, pause pages → wait.

### 6.10 Screen → mechanism summary

| Screen | Jev primitive | Code's job | Fallback if low confidence |
| --- | --- | --- | --- |
| `COMBAT` | Choice over card×target + end_turn; Noul/Score companions | candidate enumeration, all numbers, safety floor | deterministic combat heuristic |
| `MAP` | Choice over K route plans | path enumeration, edge weights, plan cache | weighted-shortest-path pick |
| `REWARD` | Choice over cards + skip | deck summary, filtering | take nothing unless clearly on-plan |
| `CARD_SELECTION` | Choice over filtered cards | legality, min/max select loop | highest-value by code score |
| `SHOP` | Noul fan-out per item + removal Choice | knapsack under gold, flow | buy nothing |
| `EVENT` | Choice over unlocked options | lock/kill filtering | safest option (no HP loss) |
| `REST` | Choice over options | HP%, upgradeable count | heal if HP% < 60% else smith |
| `CHEST` / `BUNDLE` / `CAPSTONE` | Choice | option list | first legal option |
| `CHARACTER_SELECT` | Choice | unlocked list | configured default |
| `CRYSTAL_SPHERE` | — | solver | solver |
| `MODAL` / `UNLOCK` / `MAIN_MENU` / `GAME_OVER` | rare Noul | deterministic actions | deterministic actions |

---

## 7. The control loop

### 7.1 Loop

```ts
while (!stopped) {
  const health = await mod.health();                        // cheap; also re-discovers the port
  const state  = await mod.state();                          // always fresh, never cached

  if (state.screen === "UNKNOWN") { await backoff(); continue; }
  if (isPausedByHuman(state))     { await wait(); continue; }

  const ctx  = project(state, knowledge, brief);             // narrow, English, decision-shaped
  const plan = buildDecision(ctx);                           // questions + options + intent mapping

  let intent, answer;
  if (plan.kind === "deterministic") {
    intent = plan.intent;                                    // menus, overlays, crystal sphere
  } else {
    answer = await jev.systemOne({ state: ctx.state, questions: plan.questions, model });
    budget.charge(answer.usage);
    intent = selectIntent(ctx, plan, answer);                // confidence gate + safety floor
  }

  if (!gate.isAdvertised(state, intent)) { await backoff(); continue; }  // never fire blind
  if (isStale(state, await mod.state())) { continue; }                   // re-read, re-decide

  const res = await mod.act(intent);
  verify(res, state);                                        // run_id unchanged, expected transition
  brief.update(state, res.state, answer);
  log.write(decisionRecord(state, ctx, answer, intent, res));
}
```

Wake-ups: subscribe to `/events/stream` and act on `player_action_window_opened`,
`combat_turn_changed`, `screen_changed`, `available_actions_changed`, `route_decision_required`,
`reward_decision_required`; use polling with a 250–500 ms interval as the fallback and as the
reconciliation source. The SSE reader must reassemble multi-line `data:` frames before parsing.
In combat, `combat.action_readiness.can_use_combat_actions === false` always means *wait*, whatever
`reason` says.

### 7.2 The Run Brief (memory for a stateless model)

Jev has no memory between calls and cannot hold a multi-act plan. So the strategy lives in code, as a
short English document (~150–300 tokens) that is injected into every decision's state:

```jsonc
{
  "run_brief": {
    "character": "Ironclad", "ascension": 0, "act": 1, "floor": 9,
    "archetype": "strength/attack, light block",
    "win_condition": "scale Strength, kill before the long fights",
    "needs": ["block", "card draw"],
    "avoid": ["expensive Powers"],
    "key_relics": ["Burning Blood", "Vajra"],
    "notes": "HP is the scarce resource this act; two elites already taken."
  }
}
```

It is updated by batched `noul`/`score` questions after each deck-changing decision
("is this deck now on the strength plan?", "does it still need block?"), and by code rules
(HP%, gold, act, floor, potions). This gives plan consistency across hundreds of independent Jev
calls without asking Jev to do long-horizon reasoning.

---

## 8. Reliability, safety, cost

### 8.1 Guards

| Guard | Rule |
| --- | --- |
| **Legality** | Dispatch only actions present in the freshest `available_actions`, with indexes re-derived from the same payload. |
| **Staleness** | Capture `run_id` / `screen` / `turn` / `state_version` at projection time; drop the intent if any changed before dispatch. |
| **Debounce** | Jev answers in well under a second, so the loop can outrun the game's animations. Three guards: (1) a pre-ask re-read skips the call when the board already moved; (2) an answer memo keyed on `(fingerprint, decision)` reuses the last *resolution* while the board is unchanged, and is cleared on every dispatch so an answer is never reused across an action; (3) an action that returns `pending`/unstable is followed by a bounded wait for the board to move before the next plan. The fingerprint covers energy, block, powers, potion slots and shop stock, so "the board did not move" cannot be a false negative after drinking a potion. |
| **In-flight lock** | At most one action in flight. Actions are not idempotent. |
| **Waiting** | Any `pending` status, retryable error, or `can_use_combat_actions === false` means wait + re-read; never re-send. |
| **Circuit breaker** | 3 consecutive failures → stop, dump diagnostics (mirrors the mod's own recovery policy). |
| **Budget** | `--max-requests`, `--max-tokens`, `--max-minutes`, `--max-floors`. Hard stop with a summary. |
| **Run boundary** | A run that ends (victory, defeat, or the run vanishing) is finalised and the loop stops. Finalising means clicking `continue_game_over` — the action the mod documents as writing the score/unlock save — and any `confirm_unlock` overlays, then stopping. `return_to_main_menu` is never clicked for this: it is the action that skips the save, and stopping does not need it. `--max-runs N` keeps going after N runs are finalised. |
| **Never fight the mod** | Do not call `/session/control` or `/teammate/control`; leave in-game auto-play off. |
| **Safety floor** | Never choose `end_turn` when `end_turn_will_kill_player` is true unless nothing else is legal. Code, not model. |
| **Privacy** | Never log the API key; redact `Authorization`; the decision log stores projections and state hashes, not secrets. |

### 8.2 Error handling

| Error | Response |
| --- | --- |
| `state_unavailable`, `session_not_ready`, `pause_pending`, `companion_not_ready` (retryable) | Back off 250 ms → 2 s, re-read state, retry |
| `invalid_action`, `invalid_target`, `forbidden_actor`, `invalid_request` | Re-read state, recompute the decision once with fresh indexes; repeat failures count toward the breaker |
| `internal_error`, `listener_error` | Verify `GET /health` first (the listener itself may be unhealthy), then backoff |
| Port busy / connection refused | Re-run discovery across 8080–8090 and trust `/health.data.api_port` |
| Jev `429` / `529` | SDK retries with backoff by default (`maxRetries: 2`, honouring `Retry-After`) |
| Jev `401` / `403` / `422` | Fatal config error: stop immediately, print the offending field, do not burn budget |
| Jev retries exhausted | Insert a global cooldown, then resume; never drop the decision silently |

### 8.3 Latency and cost model (to be measured in M0)

Assumptions: 4k-token projection per decision, 1 Jev call per decision, ~0.15–0.2 s for a mod action
round trip (the mod's own measurements).

| Quantity | Estimate |
| --- | --- |
| Jev cost per decision | 4k × $0.042/Mtok ≈ **$0.00017** |
| Jev cost per 1,000 decisions | ≈ **$0.17** |
| Jev cost for a ~700-decision full run | ≈ **$0.12** |
| Requests per combat turn | 3–6 (one per action) |
| Requests per full run | ~500–1,500 |
| Rate-limit headroom | 1200 req/min allowed; a 1 s cadence uses ~60 |

Consequence: **state size, not request count, is the cost driver**, which reinforces §5. Cost is low
enough that the correctness-driven extra questions in §6.1 are effectively free.

---

## 9. Configuration

| Variable / flag | Default | Meaning |
| --- | --- | --- |
| `STS2_BASE_URL` | `http://127.0.0.1:8080` | Mod base URL; the *actual* port is re-read from `/health` |
| `STS2_PORT_SCAN` | `8080-8090` | Discovery range when the configured port is dead |
| `TYPESAFE_API_KEY` | — (required) | Jev credential; also accepted via `--api-key` |
| `TYPESAFE_BASE_URL` | `https://api.typesafe.ai` | Override for a proxy or gateway |
| `JEV_MODEL` | `jev-1.13.0` | **Pinned version**, not `jev-latest`, so behaviour is stable while we tune thresholds |
| `CONFIDENCE_ACT` | `0.55` | Below this, escalate/narrow/fall back |
| `CONFIDENCE_STRONG` | `0.75` | Above this, act without extra checks |
| `MAX_REQUESTS` / `MAX_TOKENS` | `2000` / `20M` | Hard budget caps |
| `MODE` | `shadow` | `shadow` (decide only, no dispatch) · `play` · `record` · `replay` |
| `LOG_LEVEL` / `DECISION_LOG` | `info` / `./logs/decisions.jsonl` | Observability |
| `ENRICHER_ENABLED` | `false` | Optional OpenAI-compatible helper (§5.4). Never on the decision path |
| `ENRICHER_BASE_URL` / `ENRICHER_API_KEY` / `ENRICHER_MODEL` | — | Standard OpenAI-compatible endpoint, key and model name; any provider works |
| `ENRICHER_TASKS` | `run_brief` | Which off-path jobs may use it: `run_brief`, `unknown_screen` |

CLI: `npx tsx src/index.ts doctor|record|replay|play|shadow`.

---

## 10. Observability and evaluation

### 10.1 Decision log (JSONL, one record per decision)

```jsonc
{
  "ts": "2026-09-19T10:12:03.291Z",
  "run_id": "C9LRZTK3L1B4", "floor": 9, "screen": "COMBAT", "turn": 3,
  "state_hash": "sha256:...",
  "questions": { "play": { "type": "choice", "options": ["c3->e1", "c1", "end_turn"] } },
  "answer": { "choice": "c3->e1", "probabilities": { }, "confidence": 0.71 },
  "chosen_intent": { "action": "play_card", "card_index": 3, "target_index": 1 },
  "gate": "ok", "result": "completed", "state_after_hash": "sha256:...",
  "usage": { "input_tokens": 4180, "output_tokens": 12 },
  "latency_ms": { "project": 3, "jev": 640, "action": 180 }
}
```

This log is the artefact that makes tuning possible: it stores the exact state, the exact questions,
the full probability distribution, and the outcome.

### 10.2 Metrics

* decisions/min, Jev latency p50/p95, action latency p50/p95;
* tokens per decision, tokens per run, dollars per run;
* action rejection rate (`invalid_action` / `invalid_target` per 100 actions) — should trend to ~0;
* confidence calibration: bin decisions by confidence and check whether low-confidence answers really
  were the ones punished later (HP lost, lethal missed, death within two turns);
* outcome: floors reached, acts cleared, deaths, wins (per character/ascension), and where runs ended.

### 10.3 Evaluation ladder

1. **Unit** — projections and question builders against recorded fixtures (no network).
2. **Replay** — `replay` mode re-asks Jev for every recorded decision and diffs the answers against the
   log; catches prompt/criteria regressions whenever we change wording.
3. **Shadow** — run live against a real game, decide everything, dispatch nothing; measures projection
   validity and latency on real state without risking the run.
4. **Live** — play real runs with budget caps; compare against a deterministic-only baseline
   (`--no-jev`) to show Jev is adding value rather than only cost.
5. **A/B on wording** — the replay harness makes this cheap: the same states answered by two question
   formulations, compared on agreement and confidence.

---

## 11. Risks and mitigations

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | **Jev is a System-1 model, not a planner.** Long-horizon strategy (deck archetype, act plan) is beyond it. | Strategy lives in the code-owned Run Brief; Jev answers atomic, local questions. |
| 2 | **Jev cannot do arithmetic** (lethal, block, energy, gold, counters). | All numbers computed in code and sent as labelled facts (§6.1). |
| 3 | **Context rot** — accuracy falls as state grows. | Per-screen projection with a hard token budget; log token counts and treat growth as a bug. |
| 4 | **Literal reading** — Jev answers the question as written. | Write exact conditions; one judgement per question; put boundary cases in the criteria. |
| 5 | **Language** — English-primary model; localized card names would degrade accuracy. | Never send game-locale strings; map IDs → English text via `/data/*`. |
| 6 | **Stale indexes** — screens mutate in place. | Re-derive indexes from the freshest payload every time; staleness check before dispatch. |
| 7 | **Port is not 8080** when occupied. | Discovery range plus trust `/health.data.api_port`. |
| 8 | **Game/mod updates change the schema** (`protocol_version`, `state_version`). | Validate with zod at the edge; fail fast with a clear "upgrade required" message instead of acting on partial state. |
| 9 | **Rate limits / cost blowout** from a tight loop. | Budget caps, minimum inter-request interval, live cost-per-decision logging. |
| 10 | **State text that reads like an instruction** (card text, event text). | Keep state data out of `instructions`; quote it; never let state alter the question templates. |
| 11 | **Multiplayer semantics** — voting, teammate ownership, `forbidden_actor`. | v1 is single-player only; multiplayer is a documented extension (§13). |
| 12 | **Mod degradation** (`/health.status === "degraded"`, missing reflected members). | `doctor` refuses to start on `degraded` and surfaces `missing_members[]`. |
| 13 | **Answer oscillation** — near-ties producing different choices across re-reads. | Confidence gate plus deterministic tie-break on the probability margin; cache the plan within a turn. |
| 14 | **An LLM slipped onto the decision path** — a future "just let the model summarise the state" change would reintroduce nondeterminism, latency and arithmetic errors. | §5.4 is the standing rule: the enricher is opt-in, documented, and only allowed for `run_brief` / `unknown_screen`; `doctor` prints which enricher tasks are enabled. |

---

## 12. Milestones

| M | Deliverable | Acceptance criteria |
| --- | --- | --- |
| **M0** | Scaffold + `doctor`: config, mod client, discovery, schemas, `/health` + `/state` fetch, Jev smoke call, package/tsconfig/vitest | `doctor` prints mod version, protocol, real port, character/floor, and a Jev round trip with token usage; fails loudly on a bad key or a dead mod |
| **M1** | Projection + record/replay harness | `record` captures ≥50 raw states across screens; `replay` reproduces decisions offline from fixtures; projection token counts sit inside the §5.2 budgets |
| **M2** | Combat MVP | A full single combat completed end to end; 0 `invalid_action`/`invalid_target`; safety floor verified against `end_turn_will_kill_player` fixtures; latency p95 < 3 s per action |
| **M3** | Non-combat screens | Reward, card selection, shop, event, rest, chest, bundle, capstone and character select all playable via Jev; every path has a deterministic fallback |
| **M4** | Full-run loop | Budget caps, circuit breaker, run-boundary stop, decision-log JSONL, metrics summary; one complete run (win or lose) with no manual intervention |
| **M5** *(optional)* | Evaluation | 5 live runs plus a `--no-jev` baseline; confidence calibration report; per-screen rejection rate; documented cost per run |
| **M6** *(optional)* | Optimisation | Speculative fan-out tuning, criteria/wording A/B via replay, optional turn-plan experiment, cost/accuracy report |

Because the agreed goal is "make it work end to end", **M0–M4 are the committed scope**; M5 and M6
only start once the loop reliably finishes runs.

---

## 13. Open questions for you

Resolved: single-player only · English locale · no optimisation target yet (see the header block).

Still open, none of which blocks M0–M4:

1. **Budget ceiling** per run, so §8.3 becomes a hard cap rather than a report. Defaults will be
   conservative until you say otherwise.
2. **Character / ascension for the first runs.** Default: whoever `character_select` offers, ascension
   0 — we will make it a config value.
3. **Do you want to watch it?** Either the JSONL log alone, or a small live view of the last decision
   (screen, question, probabilities, chosen action). The live view is cheap to add in M4 and makes
   debugging much faster, so the plan assumes it will be built.
4. **Enricher**: which OpenAI-compatible endpoint (if any) should the optional helper point at? It stays
   off until you provide one; §5.4 describes the only two jobs it may do.

---

## Appendix A — API cheat-sheet we will code against

```
GET  /health               -> data.api_port, mod_version, protocol_version, status, compatibility
GET  /state                -> data.screen, data.session, data.available_actions, data.combat,
                              data.map, data.reward, data.selection, data.shop, data.event,
                              data.rest, data.run, ...
GET  /actions/available    -> data.actions[] = { name, requires_target, requires_index,
                                                 requires_coordinates, requires_tool }
POST /action               <- { action, card_index?, target_index?, option_index?, x?, y?, tool? }
                           -> data = { action, status: completed|pending|failed, stable, message, state }
GET  /events/stream        -> SSE; multi-line data: frames; heartbeat comment every 15 s
GET  /data/{collection}    -> cards | relics | monsters | potions | events | powers | characters
```

High-value state fields:

* `session.mode` / `session.phase` — first routing key.
* `combat.action_readiness.can_use_combat_actions` + `reason` — act vs wait, single source of truth.
* `combat.hand[].playable`, `unplayable_reason`, `resolved_rules_text`, `dynamic_values`,
  `requires_target`, `valid_target_indices`.
* `combat.enemies[].intents[].total_damage` / `hits` / `status_card_count` — threat math for code.
* `combat.end_turn_will_kill_player` and `combat.lethal_risks[]` — the safety floor's inputs.
* `map.nodes[]` (full graph, for planning) vs `map.available_nodes[].index` (for execution).
* `run.potions[*].can_use` / `requires_target` / `valid_target_indices`.
* `shop.*[].enough_gold` (not `is_stocked`) — the real "can I buy this" flag.
* `selection.min_select` / `max_select` / `selected_count` / `can_confirm`.

## Appendix B — SDK usage sketch

```ts
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

const jev = new TypeSafeClient({
  apiKey: config.typesafeApiKey,        // or TYPESAFE_API_KEY
  defaultModel: "jev-1.13.0",
  timeout: 20_000,
  retry: { maxRetries: 2, backoffInitialMs: 500, backoffMaxMs: 5_000 },
});

const res = await jev.systemOne({
  state: projectedState,                 // object; English; code-computed facts only
  questions: {
    play: choice("Which single action should I take right now?", optionCriteria),
  },
});

const { choice: picked, probabilities, confidence } = res.answers.play;
// `picked` is typed as a key of optionCriteria; map it back through the option table to
// { action, card_index, target_index } — never build an action from the answer string.
```

## Appendix C — Sources reviewed

* `https://github.com/CharTyr/STS2-Agent` — `README.md`, `docs/api.md`, `docs/setup.md`,
  `skills/sts2-mcp-player/SKILL.md` (the shared play contract), `STS2AIAgent/Server/Router.cs`,
  `STS2AIAgent/Server/NativeMcpServer.cs`. Raw copies of the pages we relied on are kept in
  `research-notes/` for now and can be deleted at any time.
* `https://docs.typesafe.ai` — introduction, System One, state, primitives (Choice/Score/Noul),
  advanced structure, confidence, patterns (fan-out, confidence routing, composite scoring), models,
  the HTTP API reference, the JavaScript SDK and its API reference, and the `jev-1.13` jaggedness page.
