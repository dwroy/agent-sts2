# Review 2026-09-29: ascension assumptions and A10 readiness

Scope: jev-sts2-review @ 4683dbe (branch review-0929 = v3, the code the bot runs). Read-only. Numbers come from
src/knowledge/monster-db.json (4394 fights; A8 1909, A9 221), logs/states.jsonl, runs.jsonl (19 A9 runs, 0 wins;
last A9 run W2TB), and from evaluating the real functions at A8/A9/A10 with `tsx --eval`.

What is live today, from recent decisions.jsonl and runs.jsonl:
- DeepSeek makes the build calls: reward/card, shop, rest, event, route-plan and the run plan.
- Jev plays combat and sees the rollout facts, potion_context and jev-hints.
- FIGHT_PLAN is off. fight-plans.jsonl was last written 2026-09-28T06:31Z and no A9 run has a fight plan.

Severity is one of: **now** (affects play at A9 now), **A10** (breaks or misleads at A10), **cosmetic**.
Tag is **bug** (code or data error) or **strategy** (a play-policy choice for Dai).

Ordered by impact.

---

## 1. At A10 every move not logged at A9 drops back to its A8 damage, unscaled [A10 | bug]
- **Where:** `src/knowledge/monster-db.ts:198-235` (`ascensionDamageRatio`, `moveDamageAt`) and `:242-252` (`shownDamageAt`). It feeds:
  - the boss clock: `bossDamageByTurn` → `bossLossPerTurn` (`boss-clock.ts:125`);
  - the rollout's enemy tables (`rollout-live.ts:142`), i.e. the T2+ facts Jev sees;
  - the dossiers (`moveText`).
- **What goes wrong:** `nearestAscension(…, 10)` picks A9 when the move was logged there, otherwise A8. The ratio A8→A10 is then measured on moves logged at both A8 and A10. No such moves exist, so it returns null and the code uses ratio 1. At A9 the same move gets A8×1.14.
- **Evidence** (evaluated):
  - 57 of 207 moves with damage are lower at A10 than at A9. This covers every move of the three act-3 bosses (none has an A9 fight) and of Ceremonial Beast.
  - Boss clock loss per turn, A9 → A10:

    | Boss | A9 | A10 |
    |---|---|---|
    | Queen | 13.5 | 11.8 |
    | Test Subject | 9.5 | 8.6 |
    | Aeonglass | 10.5 | 9.4 |
    | Ceremonial Beast | 7.0 | 6.5 |

  - Queen at 80 HP entry: survive 5 → 6 turns, so need/turn 96 → 80 (479 HP). The model makes the A10 act-3 bosses easier than at A9.
  - The dossier at A10 prints "强力冲撞 26 (A10估: A8×1.00)" where A9 prints 30 (A8×1.14).
  - The source text says "moves unseen at this ascension scaled, estimated" even though nothing was scaled.
- **Fix:**
  - Chain the ratio through the logged ascensions in between: A8→A9 measured (1.14) × A9→A10 measured, or 1 until A10 is logged.
  - Equivalently: when `to` has no logs anywhere, scale to the highest logged ascension below `to`.
  - Apply the same change in `shownDamageAt`.
  - Add a test at asc = maxLogged + 1.

## 2. The second act-3 boss is invisible to every planner [A10 | strategy]
- **Where:**
  - `boss-clock.ts:671-753` (`bossClock` reads only `run.boss_id`) and `:644-668` (entry HP);
  - `run-plan.ts:86-124` (RUN_PLAN_TASK "beat the act boss", `act_boss`);
  - `build-facts.ts:17-57` (`act_boss`, `floors_to_act_boss` from [17,33,48]);
  - `potion-value.ts` (shop potions valued "in the act boss fight");
  - `run-journal.ts:722-734` (act block "第3幕 boss" + one dossier);
  - `experience.ts:363-372` (slice keyed by `run.boss_id`);
  - `map.ts:420-434` (paths stop at the first Boss node).
  - `second_boss_node` / `is_second_boss` (present in the mod's map, see `tools/fake-mod.mjs:121`) and `run.ascension_effects` are read nowhere in `src/`.
- **Consequence at A10:** the clock can say "gap 0" for boss 1 from full HP, but the run needs boss 1 **and** boss 2 on whatever HP and potions are left. No fact ever says how much HP boss 1 costs or what that leaves for boss 2. The run plan's `boss_prep` and `block_target` target one boss.
  - The act-3 pool in the logs is exactly {QUEEN, TEST_SUBJECT, AEONGLASS} (every act_id 2 boss_id in states.jsonl). So even if the mod does not name the second boss, it is one of the two others.
  - Our record there: A8 act-3 bosses 1 win in 12 (RBJ402 Queen); A9 none reached (SK1U died F45).
- **Fix (policy for Dai):**
  - At asc ≥ 10 in act 3, make a two-fight clock. Fight 1 uses its DB turns and loss per turn; the projected HP after it is fight 2's entry HP, with no rest assumed until confirmed.
  - Name the second boss when the mod exposes it, else show the worse of the two remaining act-3 bosses.
  - Put both bosses into `act_boss_clock`, the run plan task ("two bosses back to back"), the route facts (`hp_at_boss` should be the HP needed for both) and the act block.

## 3. Potions and HP in boss 1 are spent as if it were the last fight [A10 | strategy]
- **Where:**
  - `combat-plan.ts:323-326` (`potion_context.act_boss = "this fight"`, Jev);
  - `turn-solver.ts:1562` (`POTION_LASTING.boss = 1`: a potion drunk in a boss fight costs nothing later);
  - `fight-plan.ts:151` (FIGHT_PLAN_TASK; latent while FIGHT_PLAN=off).
- **Evidence:**
  - From A4 the belt has 2 slots (the A9 run shows 2 slots).
  - Lesson potion-save-for-boss: "A9 15 局每局走廊喝 4.6 瓶, boss 里 1.1 瓶, 二幕 boss 进场平均 0.8 瓶".
  - Nothing tells Jev that another boss follows immediately.
- **Fix:** at A10 F48, say so in potion_context ("boss 1 of 2: the second act-3 boss follows with the HP and potions you leave"). Give boss 1 a POTION_LASTING below 1, or an explicit potion split from the run plan. Dai to choose the split rule.

## 4. After boss 1 the clock calls itself stale and may describe the dead boss [A10 | bug, unconfirmed state]
- **Where:**
  - `boss-clock.ts:779-781`: `damageGap` returns null on floors 17/33/48;
  - `boss-clock.ts:813-816`: `bossClockJson` adds `stale: "... the next act's boss is not known yet"` on those floors;
  - `boss-clock.ts:647` and `build-facts.ts:42` / `rest.ts:34,76` / `combat-plan.ts:324`: `BOSS_FLOORS.find(>= floor)` gives nothing past F48.
- **Consequence at A10:**
  - Any card reward or selection between the two bosses tells DeepSeek the clock is stale and that the next boss is in the next act.
  - If `run.boss_id` still names boss 1 during boss 2 (unknown), every clock, dossier and journal note at F49 describes the dead boss.
- **Fix:**
  - Make the boss-floor list ascension-aware: 48 and the second boss's floor, taken from `map.second_boss_node`.
  - Take the current boss from the enemies on board (as `bossOnBoard` / `build-boss-damage.py` do), not from `run.boss_id`.
  - Drop the "next act" wording when a second boss is ahead.

## 5. The monster-DB builder files boss fights under `run.boss_id` [A10 | bug, latent]
- **Where:** `tools/build-monster-db.py:470` (`boss_key = fight.boss_id …`). `bossHpAt` / `bossDamageByTurn` (`monster-db.ts:310-349`) sum *every* part's median × `count_per_fight`.
- **Risk:** if `run.boss_id` does not change for the second fight, A10 boss-2 fights land in boss 1's entry. The builder refreshes after every run, so a single A10 run could corrupt it. Example: a QUEEN entry with 1 of 2 fights being Test Subject gets parts QUEEN 0.5, AMALGAM 0.5 and TEST_SUBJECT 0.5, which breaks HP, damage and win rate.
  - Two fights on one floor would also merge in `run-journal`'s and `fight-plan.ts:61`'s `act:floor` fight keys and in `ops/report.py:133-159` (fights grouped by floor).
  - `tools/build-boss-damage.py` already keys by the enemies on board and is safe.
- **Fix:** key boss fights by the boss enemy ids on board (a BOSS_OF map as in build-boss-damage.py), not by `run.boss_id`. Add the fight's first-turn ordinal to fight keys if two boss fights can share a floor.

## 6. Monster Strength gains, block and power amounts are pooled over all ascensions [now | bug]
- **Where:**
  - `rollout-live.ts:148` (`strength: mode(entry.self_powers_gained…)`) and `:149` (`block: mode(entry.block_gained)`);
  - `monster-db.ts:277` (`strengthOf` in `monsterDamageByTurn`, which feeds the boss clock), `:362` ("+N力" in dossiers) and `:459` (`powersText` uses `amount_at_first_sight`, pooled).
  - The DB already has `self_powers_gained_by_asc` and `amount_at_first_sight_by_asc`, but only `powerScheduleAt` (Steam Eruption) and `playerPowersOf` use them. `block_gained` has no by-asc split at all (`build-monster-db.py:665`).
- **Evidence:**
  - At A9, 14 buff moves gain +1 Strength over A8 while the pooled mode says the A8 value:

    | Move | A8 | A9 | n at A9 |
    |---|---|---|---|
    | Kin Priest Ritual | 2 | 3 | 6 |
    | Kin Follower Power Dance | 2 | 3 | 11 |
    | Crusher Adapt | 2 | 3 | |
    | Rocket Charge Up | 2 | 3 | |
    | Knowledge Demon Ponder | 2 | 3 | |
    | Insatiable Salivate | 2 | 3 | |
    | Louse Progenitor | 5 | 7 | |
    | Phantasmal Gardener Enlarge | 2 | 3 | |
    | Myte, Nibbit | 2 | 3 | |
    | Seapunk | 1 | 2 | |
    | Skulking Colony | 2 | 4 | |
    | Bowlbug Nectar | 15 | 16 | |
    | Ovicopter | 3 | 4 | |

  - Effect on DB damage per turn at A9 (evaluated), pooled vs A9 Strength:

    | Monster | Pooled | A9 Strength | Note |
    |---|---|---|---|
    | Knowledge Demon | 17.3 | 18.5 | T11 35.4 → 40.7 |
    | Kin Follower | 5.8 | 7.2 | |
    | Kin Priest | 9.0 | 9.9 | |
    | Louse Progenitor | 12.0 | 13.3 | |

  - Block at A8: the Matriarch's SLASH2 block is 12 at A0–A7 (n=30) and 14 at A8+ (A8 29 of 35, A9 1/1). The pooled counts tie at 30/30, so the rollout uses 12.
  - The A9 Waterfall Giant dossier prints "能力: 蒸汽喷发 15" (A9 is 20).
- **Fix:**
  - Read `self_powers_gained_by_asc` and `amount_at_first_sight_by_asc` via `nearestAscension`, falling back to pooled.
  - Add `block_gained_by_asc` to the builder and read it the same way.

## 7. `bossHpLoss` returns null when the nearest ascension has no win [now | bug]
- **Where:** `monster-db.ts:620-642` (null if `hp_loss_won.n == 0`; `perTurn` from all fights is gated behind it). Used by:
  - `potion-value.ts:58-61`: shop potion HP value, which falls back to the hand-set A8 `lossPerTurn`, labelled "(boss clock profile)";
  - `event.ts:70-75`: the forced-boss cost becomes null.
- **Evidence:** at A9, KAISER_CRAB has 0 wins in 2 fights (DB per_turn 13.4, fallback used 10), THE_INSATIABLE 0 of 2 (10.8 vs 8.9), LAGAVULIN_MATRIARCH 0 of 1 (6.6 vs 5.8). At A10 Test Subject and Aeonglass also return null (nearest A8 has 0 wins).
- **Fix:**
  - Walk ascensions by distance until one has data, as `roomHpCost` does.
  - Return `perTurn` independently of the win sample.
  - Consider using `bossLossPerTurn`, so the shop and the clock show the same loss per turn.

## 8. Final-boss wins are counted as deaths in the boss-damage and calibration extracts [now | bug]
- **Where:** `tools/build-boss-damage.py:107` and `tools/boss-fights-extract.py:74`: `won = runs.floor > boss floor`. A win ends at floor 48, so the F48 boss is "died" and all remaining HP is booked as lost on the last turn.
- **Evidence:**
  - All 9 wins end at F48: W6F4 and CRRP (Test Subject); 4JVP, BDAK, H5MZ, YN4E and RBJ402 (Queen, the A8 win); JR66 and N1V2 (Aeonglass).
  - Phantom loss, roughly the HP left at the end:

    | Boss | Phantom HP | Total hp_lost | Unblocked share |
    |---|---|---|---|
    | Queen | ~102 | 1174 | 0.362 |
    | Test Subject | ~81 | 1074 | 0.323 |
    | Aeonglass | ~73 | 1091 | 0.501 |

    These shares are about 5–10% too high, so the act-3 clock's loss per turn is too.
  - The ESTIMATE_BASE/SLOPE fit also saw RBJ402's Queen win as a death.
  - At A10 the F49 boss win would be misclassified the same way.
- **Fix:** take the outcome of the run's last fight from `game_over.is_victory` / runs.jsonl `victory` (as `build-monster-db.py:372` does).

## 9. Hand-written boss notes in the journal: A0 HP, and the HP-stripping regex garbles mechanics [now | bug]
- **Where:** `run-journal.ts:167-181` (`BOSS_NOTES`), `:888-897` (`withoutHandHp`, shown to DeepSeek in memory.lookahead). The unstripped note also goes into fight plans (`fight-plan.ts:122`; latent, FIGHT_PLAN off).
- **Evidence** (rendered at A9):
  - Ceremonial Beast "首次跌破 150 血被击晕" → "首次跌破 被击晕一回合". The stun threshold is deleted (DB PLOW_POWER 150 at A8, n=22).
  - Matriarch "掉 1 血就醒" → "掉 就醒".
  - Leftovers: Kin "神官 (A8) + …", Insatiable "(A8)，…".
  - Queen "女王 400 + 聚合体 199" is not stripped (A8+ 419 + 211).
  - Damage figures are A0/A8:
    - Crab "激光 47–49" (A9 base 35 vs 31, 52 from behind before Strength; lesson crab-entry: A9 54);
    - Matriarch "醒后 19、9×2" (A9 21, 10×2);
    - Test Subject "猛扑 45" (A8; A9 not logged);
    - Beast "犁地 9→20→22→24";
    - Vantom "19–30".
  - The fight-plan path would show 173/252/222/379/512 HP, whereas A8+ is 183/262/233/399/535.
- **Fix:**
  - Replace the numbers with placeholders filled from the DB at the current ascension (as `{GIANT_HP}`/`{GUN}` already are), or delete them.
  - Never regex-strip. At minimum drop the regex and keep only strategy text.

## 10. Boss-clock note and mechanic strings hard-code A8 numbers [now | bug]
- **Where:** `boss-clock.ts:65-86` (BOSSES `note`/`mechanic`, shown as `boss_note`/`harder_because` in `act_boss_clock` on every build and route question).
- **Evidence:**
  - Crab "Laser 47-49 on T4/T9" (A9 ≥ 52 from behind).
  - Kin "be above the T11 Beam (~21)": 3×(3+Str) with Ritual +2 at A8 is 21; at A9 +3 gives ~27.
  - Queen "Amalgam hits 12x3/22", "the Amalgam (211)".
  - Test Subject "Multi Claw starts 10x3" (A9 est 11).
- **Fix:** placeholders from `moveDamageAt` / `self_powers_gained_by_asc` at the current ascension, as `{ERUPTION}` already does.

## 11. The DeepSeek guide, the handbook and jev-hints state A0 HP as fact [now | bug]
- **Where:**
  - `ironclad-guide.md` (DeepSeek's system prompt on every call, `deepseek.ts:274`):
    - Insatiable 321, `:56`;
    - Queen 400 + 199, `:60,124-125`;
    - Aeonglass 512, `:68`;
    - Vantom 173, `:80`;
    - Beast 252, `:89`;
    - Kin priest 190, `:96`;
    - Knowledge Demon 379, `:102`;
    - "实验体（600 血）", `:24`.
    - §9's header (`:79`) says these logs override §7 when they conflict.
  - `ds-handbook.md:63`: crab 408.
  - `jev-hints.json` (sent to Jev literally, no ascension filter): `crab-scaling` "about 408 HP", `sandpit-no-race` "about 321", `entomancer-fast` "145 HP".
- **Evidence:** A8/A9 DB: 341, 419+211, 535, 183, 262, 199, 399, 636, 428, Entomancer 165.
- **Fix:** remove the HP figures (the dossier and clock carry measured ones), or label them "A0–A7". Soften §9's "以此为准".

## 12. The Test Subject phase model is hand-set A8 constants [A10 | bug]
- **Where:** `boss-clock.ts:580` (phase-1 loss 3/turn), `:699-708` ("~15 net a turn" in phase 2 from D3X1 A8, phase 2 capped at 3–5 turns, phase 3 fixed 6 turns).
- **Evidence:** Multi Claw is 10/hit at A8 and an estimated 11 at A9/A10 (DB ×1.14). Phase-2 time is `hpAt2/15` regardless of ascension. Test Subject is one of the three possible A10 act-3 bosses.
- **Fix:** derive the phase-2 loss from `moveDamageAt(TEST_SUBJECT, MULTI_CLAW)` × growing hits × unblocked share, as the other bosses do.

## 13. The game's own ascension rules never reach the models [A10 | strategy]
- **Where:** `run.ascension_effects` (LEVEL_01..LEVEL_09 with Chinese name and description in every state) is unread. `run-brief.ts:37`, `build-facts.ts:47` and `run-plan.ts:113` pass only the number. A10's meaning lives only in `ironclad-guide.md:76` ("A10 第 3 幕结尾连打两个 boss …").
- **Fix:** add the active effects (or at least the highest one's text) to the run plan and build facts. At A10 add an explicit "two bosses back to back after F47" fact.

## 14. Route gold model ignores A3's −25% gold [now | bug, low]
- **Where:** `map.ts:145` `FIGHT_GOLD = { Monster: 15, Elite: 30 }` (shop weights and gold projection along routes).
- **Evidence** (MAP-to-MAP gold after a fight): hallway median 15 at A0/A2, 11 at A3–A9 (A8 n=1253, A9 11 n=154). Elite 29–30 at A3+ (40 at A0).
- **Fix:** Monster 11 at asc ≥ 3, or measure it per ascension like room costs.

## 15. Fight-plan inputs are not at the current ascension [cosmetic now (FIGHT_PLAN=off); matters if re-enabled | bug]
- **Where:**
  - `fight-plan.ts:66-75`: `moves_seen` from move-model.json `damage`, which is `avg_total_shown` pooled over A0–A9 including Strength and Vulnerable (e.g. Rocket LASER 45.8);
  - `fight-plan.ts:122`: the raw BOSS_NOTES (see #9).
- **Fix:** use `moveCycle(id, asc)` / `moveDamageAt` for moves_seen, and apply the #9 fix.

## 16. Outcome stats are A8-only [now | strategy, low]
- **Where:** `tools/build-outcome-stats.py:468` defaults to `--ascension 8`, and `ops/wait-run.sh` / `ops/report.py:258-263` call it without the flag. `experience.ts:350` prints "基线 A8 …". Card/relic/event/rest stats are A8 at A9 and A10.
- **Decision for Dai:** keep A8 (n=150) as the baseline, or add A9 rows once n allows. It is labelled, so this is not wrong, just not current.

## 17. Hand constants that are right at A9 but are not in the DB [cosmetic | bug (rule)]
- **Where:**
  - Siphon heal `asc >= 8 ? 15 : 10` (`boss-clock.ts:175,192`, `combat-plan.ts:583`);
  - Knowledge Demon Ponder heal 30 ×2 (`boss-clock.ts:516-518`);
  - `SLIPPERY_STACKS = 9` (`:254`);
  - Queen `addedHp` 60 and Aeonglass 66 (block 20/33, pooled).
- **Evidence:**
  - Ponder heal +30 logged at A8 (22 of 31 transitions; the rest are net of damage) and A9 (LY0N +30, SK1U +24 net).
  - Slippery is 8 at A0–A7 and 9 at A8/A9 (A8 23 of 25, A9 3/3).
  - Siphon +15 at A9 per the code comment (8V0H, HEAC, 9Q7V, YQL8).
- **Fix:** add heal-by-asc to the builder (enemy HP rise across a Heal intent) and read these from the DB. No urgency.

## 18. Card-value boss reasons state A0 HP [cosmetic | bug]
- **Where:** `card-value.ts:93` ("Kin Priest's 190 HP"), `:131` ("Aeonglass's 512 HP"), `:143` ("Test Subject's 600 HP"), `:148` ("Matriarch's 222 HP"). `bossA8Hp` (`:80-82`) hard-codes asc 8 instead of the current one.
- These strings reach DeepSeek as code's `why` on card and shop options (`pick.ts:192`).
- **Fix:** `bossHp(profile, state.run.ascension)` everywhere.

## 19. Ops scripts assume the last boss is F48 [cosmetic → A10 | bug]
- **Where:**
  - `ops/metrics.py:25,88` ("reached final boss" = floor ≥ 48; boss stats only for 17/33/48);
  - `ops/version_compare.py:28,220,236` ("last boss" = max of 17/33/48; potions entering the F49 boss are never counted);
  - `ops/watch-autoplay.py:26` prints milestones at floors 17, 34, 51 (34 and 51 are not boss floors even now);
  - `ops/report.py:133-159` groups fights by floor (see #5).
- **Fix:** read boss floors from the map (`boss_node`, `second_boss_node`) or from the enemies' types.

## 20. Stale fallbacks and HP without a ratio [cosmetic | bug]
- Test Subject fallback `[111, 212, 318]` and hpA8 641 (`boss-clock.ts:76,595`): the DB now has 111 > 212 > 313 (636). The comment "phase 3 not logged yet" is stale. Only a fallback.
- HP lookups (`bossHpAt`, `monsterLine`, `encounterLine`) take the nearest ascension's HP without a ratio. This is harmless now because A8 is the only HP step and A9/A10 fall back to A8/A9. Two entries do resolve below A8 at A9: GUARDBOT (A7 17.5) and SCROLL_OF_BITING×2 (A2 69).

---

## A10 readiness

**Blockers.** Fix these before switching TARGET_ASCENSION to 10.
1. The damage lookup regression (#1). Without it every act-3 boss and most act-3 monsters are modelled at A8 damage in the rollout, the clock and the dossiers, about 12% softer than A9.
2. Nothing plans for the second boss (#2, #3): clock, run plan, route facts, potions and the act block. The act-3 pool is known (Queen / Test Subject / Aeonglass), so a worst-of-two plan is possible even without the id.
3. Boss identity after boss 1 (#4, #5): code and the DB builder trust `run.boss_id` and the floor list 17/33/48. Getting this wrong can mislabel facts at F49 and corrupt boss entries in monster-db.json after the first A10 run.

**Checked and fine:**
- Victory detection uses `game_over.is_victory` (`loop.ts:417`, `ops/report.py:89`, `stats.py:82`, `build-monster-db.py:372`), not the floor. A run that continues past F48 will not be mistaken for a win or a loss.
- Act = floor ≤ 17 / ≤ 33 / else 3 (`map.ts:290`, `combat-plan.ts:345`, `build-room-costs.py:32`) still gives act 3 at F49.
- Act lengths are the same at A8 and A9: act 3 map is 14 rows, boss row 14 = F48.
- Route enumeration stops at the first Boss node, and a single available node (the second boss) falls back to the baseline pick (`map.ts:586`).
- `fightKind` uses the enemy's type, so boss 2 is a "boss" fight.
- TARGET_ASCENSION (`misc.ts:108-119`) holds the level. Moving to A10 is a manual .env change after the first A9 win (STATE-2026-09-27: TARGET_ASCENSION=9). If 10 is set while A10 is still locked, the bot silently embarks at the highest unlocked level with no warning.
- The fight-value GBM uses `asc` as a tree feature (trained on A7–A9). A10 falls into the A9 leaves.

**Could not confirm** (there are no A10 logs: 0 states with ascension 10, and `second_boss_node` was never non-null in 3.5 GB of states):
- The second boss's floor number. Most likely F49, the row after `boss_node`.
- Whether `run.boss_id` switches to boss 2 after boss 1.
- Whether the mod exposes boss 2's id before the fight. Map nodes carry no encounter id.
- Whether there is a reward, rest or event between the bosses.
- That A10 changes nothing but the double boss (monster numbers assumed equal to A9).
- A first A10 run (or the mod's docs) should settle these before relying on #2–#5 fixes.

**Already DB-driven, with constants only as fallback (fine):**
- Boss HP: `bossHp` → `bossHpAt`, with hp/hpA8 as fallback.
- Loss per turn: `bossLossPerTurn` (DB damage × logged unblocked share), with lossPerTurn as fallback.
- Steam Eruption: `eruptionSchedule` (A9: 20 on T2, +3).
- Pressure Gun: `giantNumbers` (A9 23/28/33).
- Test Subject phases: `testSubjectPhases` (111/212/313).
- Kin numbers in `bossNote`.
- Siphon turns: `siphonSchedule`.
- Debuffs on us: `playerPowersOf` by ascension.
- Room costs: 5-sample threshold, by design.
- Removal prices, potion slots and gold come from the live state. Removal prices logged at A9: 100/150, matching the guide's A6 rule.

## Counts
- By severity: A10 7 (#1–5, 12, 13); now 8 (#6–11, 14, 16); cosmetic 5 (#15, 17–20).
- By tag: bug 16; strategy 4 (#2, 3, 13, 16).
