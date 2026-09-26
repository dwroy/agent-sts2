**Can Jev be given our accumulated experience?** Yes, but only through the state or question text. There is no system or context field, and Jev cannot be fine-tuned. This was a read-only check; no files were changed.

**1. What a Jev request contains today**
- Every call goes through `JevClient.ask()` to `client.systemOne({model, state, questions})` (`jev-sts2/src/jev/client.ts:183-199`). The request carries only `state` and `questions`. Each question has `type` (choice, noul or score), `instructions` and `criteria` (`src/jev/questions.ts:8-27`).
- The SDK types allow instructions and criteria to be a string or a JSON object or array (`node_modules/@typesafe-ai/sdk/dist/index.d.mts:39-49,143-153`). They also forward extra request properties, but the docs describe no system field.
- An answer comes back as `choice`, `probabilities` and `confidence` (index.d.mts:92-100). Confidence is below `escalate.below` → DeepSeek (`src/loop.ts:585-640`).
- The only limit in our code is 255 options per choice (`questions.ts:49`). TypeSafe's published limits: state plus all questions about 64k tokens, and state plus the longest question about 32k tokens (https://flaviocopes.com/jev/).
- The combat state is built at `src/screens/combat-plan.ts:766-791`. It has `run_brief` (deck, relics, potions, up to 8 `notes`; `project/run-brief.ts:35,68-81`), the situation, the enemies with `POWER_NOTES` glosses (`combat-plan.ts:50`), and one fixed `note` (line 791). Each option is a JSON-stringified `describePlan` (line 741).
- So some experience already reaches Jev: the power glosses and the brief notes. The lessons handbook only reaches DeepSeek (`src/llm/deepseek.ts:23`).
- From the last 2000 lines of logs/decisions.jsonl there were 369 Jev calls. Input tokens were 1434 at the median and 1917 at the 90th percentile (max 2915). Combat was 1454, shop 2354, map 992.
- Jev latency was 532 ms at the median and 654 ms at the 90th percentile. It does not change with input size: 530 ms under 1200 tokens and 541 ms at 2000-4000 tokens.

**2. What the TypeSafe docs say**
- Jev is a "System One" model. It makes fast, calibrated, single-step judgments, answers each question separately, and does not generate text (https://docs.typesafe.ai/concepts/system-one.md).
- The state page says state may hold "related context, examples, and other information that helps the model answer", and that policies belong in state while questions define the judgment (https://docs.typesafe.ai/concepts/state.md).
- The jev-1.13 weaknesses page (https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) says:
  - "accuracy falls as the state grows with content unrelated to the decision"; unrelated detail acts as a distractor.
  - It struggles with extra indirection, double negatives and complex conditions.
  - It "answers the question you wrote, not the one you meant".
  - It does not count reliably.
- The docs advise keeping each question atomic and "composed in code" (https://docs.typesafe.ai/, https://www.eesel.ai/blog/typesafe-jev).

**3. Answers**
- **(a) Channels, best first:**
  1. **Per-option annotations inside each criterion.** Code turns a lesson into a fact about the option, for example `"lesson": "plays Inflame on the enemy's non-attack turn (setup turn)"` or `"leaves 12 HP; the boss hits 18 next turn"`. This suits Jev best because it reads at face value and cannot apply a rule to a board itself.
  2. **A new state field `fight_hints`** holding 3-6 short, positive, conditional lessons retrieved for this fight (enemy, fight kind, act, HP band). Example: "Sentries: kill the middle one first."
  3. **The question `instructions`,** as a JSON object with the goal and priorities. Keep it one or two sentences.
  
  Do not paste lessons.md or the handbook in whole: that is the "unrelated content" the docs warn about.
- **(b) Latency and cost:** about zero. Latency is flat from 1k to 3k tokens. Input costs $0.042 per million tokens (`src/jev/pricing.ts:9`), so 300 more tokens is about $0.00001 per call. We are about 20x below the 32k limit.
- **(c) Risks:**
  - Distraction: the full `run_brief` (deck and relic list) is probably already noise for turn choice. Trimming it from combat state may matter as much as adding hints.
  - Jev can follow the letter of a hint and misapply it, for example "prioritise powers" on a lethal turn. So each hint needs its condition spelled out, or code should attach it only to the options it applies to.
  - Jev is asked only on close calls (code plays rank 1 when the margin is clear), so hints only move marginal decisions.
  - Hints can't carry multi-step plans. Anything numeric should be computed by code, not stated as a rule.
  - The same hint text in every call may shift confidence and change how often we escalate to DeepSeek. Re-check the escalation thresholds afterwards.
- **(d) Proposal (combat first):**
  - Build a small keyed hint table (enemy ids, fight kind, situation tags) from the handbook and lessons.md. At ask time, retrieve up to 5 entries of 25 words or fewer and put them in `questionState.fight_hints` (next to `combat-plan.ts:791`).
  - Suggested content: enemy mechanics not in `POWER_NOTES` (sleep, sandpit, multi-hit timing); "on turns the enemy does not attack, the setup/power line is usually better"; HP rules phrased as facts such as "HP below 40%: an option that loses HP now is worse than one that deals less damage"; and boss-specific notes from `notes/bosses.md`.
  - Move per-plan judgments into `describePlan` as tags: `setup_turn`, `hp_after`, `lethal_next_turn`, `wastes_block`.
  - Drop deck and relic lists from the combat state and keep only relics that matter in combat.
  - Test offline before any live run: `src/replay/replay.ts` can re-ask logged decisions with and without hints. Compare the choices with the min-loss metric we already use to rank Jev, DeepSeek and code (2.59 / 3.12 / 3.67 average extra HP).
  - This fits your split: keyed lessons are experience given to Jev as context, not hard rules. They move to code only once a hint's effect is shown to hold every time.