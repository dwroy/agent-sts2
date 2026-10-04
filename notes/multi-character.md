# Multi-character plumbing (2026-10-04)

Mandate: decision-log 2026-10-04 19:37. Dai wants the Silent played from A0, going up one ascension per win, while the Ironclad stays exactly as it was. Nothing about how to play the Silent is hand-written. Branch `worktree-agent-a05e774f117deacd2`, on top of 1079972.

**Incident: data/game-data.json was overwritten, now restored.**
- What happened: at 20:00 a `doctor`/`explain` run against `tools/fake-mod.mjs` replaced the shared `data/game-data.json` with the fake mod's empty catalogue (mod `0.13.0-fake`). The runtime re-fetches this cache whenever the mod version changes.
- Restore: Dai authorised it, and the coordinator copied back the Windows backup (mod 0.16.2, fetched 09-27).
- Checks rerun after the restore, all identical to the baseline:
  - builders: hashes, including monster-db 7761c479
  - fight-value: rows sha 01cc2516, gates identical, model JSON-equal
  - the eval metrics with calibration
  - digests and prefix
- Fix: the cache now follows `GAME_DATA_DIR`. It never writes a catalogue with no cards, and never writes a `-fake` mod's catalogue into the project's data/ (`knowledge/index.ts` `cacheWriteRefusal`; test `game-data-cache.test.ts`).

## Commits
- ec19bef: the TS side
- 122acec: the learner
- 82d88d8: builders, ops and eval

## What changed, item by item
1. **Character select.** The character is picked first, then the ascension, then embark. If `CHARACTER` matches nothing or is locked, the loop stops and lists the game's ids. If the run on screen is another character's (for example `RUN_START=continue`), the loop also stops. With `CHARACTER` unset it plays the Ironclad, as before. Config rejects a `CHARACTER` that is not an id.
2. **Knowledge is per character.**
   - `knowledgeCharacter()` is set from config at startup. Worker threads get it through the `CHARACTER` env.
   - For a new character, a missing file means empty knowledge: no experience, hints, guide, handbook, SL list, potion table or records. All 12 bosses count as low trust.
   - The Ironclad's files stay strict: a missing one still throws.
3. **Ironclad-only knowledge kept in code is now gated by character.** This covers the card-value tiers and role sets, `DEBUFF_EXHAUST_KEEP`, the boss notes in run-journal and boss-clock, and the potion pool flag.
   - Card picks for a new character: every card gets the neutral value `SKIP_BAR` (curses 0). Nothing falls under the skip bar and code prefers no card, so the choice goes to the brain (`BUILD_DECIDER`) or to Jev. This was the least invasive change.
4. **Prompts and tools name the run's character.** That covers SYSTEM, the full-knowledge note, the guide title and file (`<id>-guide.md`), and `kb_old_knowledge`. `kb_runs` and `kb_postmortem` return only that character's runs. Post-mortem headings for non-Ironclad runs carry the character name ("A0，静默猎手，…").
5. **monster-db split.**
   - `common/monster-db.json` holds facts from every character's fights.
   - `characters/<id>/monster-records.json` holds bosses, encounters and threat_by_asc.
   - Loaders merge the two back into the old shape.
6. **Builders.** All take `--character` (default ironclad). `refresh.sh` loops over the characters that have runs, and `report.py` refreshes the finished run's character.
7. **Ops and eval.** Scripts filter by character, defaulting to `CHARACTER`. The eval metrics have `--group-by character`, and `stop-after.sh` takes a 4th argument `CHAR`.
8. **Learner.**
   - New template variables: `{{character}}`, `{{character_name}}`, `{{character_dir}}`, `{{experience_path}}`.
   - Pending post-mortems are counted per character (`learner/pending.ts`).
   - Every task renders byte-identical for the Ironclad.
9. **Ascension climb.** `TARGET_ASCENSION=climb` targets that character's highest win (any win, first try or SL) +1. It starts at 0 and is capped at the game's `max_ascension`. `run-config.jsonl` records the resolved `target_ascension` and `target_ascension_mode`. First try and SL stay separate in `sl-attempts.jsonl`; `runs.jsonl` `victory` is the final result.
10. **Max HP.** The 80 HP fallbacks now read the state. fake-mod gains `FAKE_MOD_CHARACTER` and `FAKE_MOD_SCREEN=character_select`. Ring of the Snake was not added, per the 19:50 scope change.

## Equivalence (before 1079972 vs after)
- Decision digests on 490 logged boards: identical.
- A8/A9 knowledge prefix, the v3 system prompt and 40 tool digests: identical.
- Six builders: identical hashes.
- monster-db: common + records merges to the same bytes as before.
- fight-value: gates identical, model JSON-equal.
- Ops and eval script outputs: identical.

## Tests
- `tsc` on src: 0 errors. The 39 test-file errors were already there at baseline.
- vitest: 177 files, 2611 tests, all passing.
- New tests: `multi-character.test.ts`, `learner-character.test.ts`, `characters_test.py`.

## Silent dry check
With `CHARACTER=SILENT` and `TARGET_ASCENSION=climb`:
- The prompt says Silent, mentions the Ironclad 0 times, and its prefix is 41k characters.
- fake-mod character select goes select SILENT, then embark.
- `doctor --no-jev` reads the Silent run.

## Not done, and open questions
- Hand-written Ironclad card ids elsewhere in code (card-model mechanics, Howl from Beyond and so on) are card facts and were left alone. `UPGRADE_PRIORITY` (Ironclad cards) was not gated: those ids never appear in a Silent deck.
- Dai's answers (2026-10-04):
  - **Changelog:** one per character. The Ironclad keeps `paper/materials/experience-changelog.md`; every other character gets `paper/materials/experience-changelog-<id>.md` (learner `{{changelog_path}}`).
  - **Learning cadence:** per character. Ops runs `experience-pending` and the learner batches only for characters with new post-mortems (`learner/README.md`).
- For the Silent run, should `CHARACTER=SILENT` go in the live `.env`, or into a separate worktree?
