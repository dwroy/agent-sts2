# Review 2026-09-29 — consistency of the fight estimators and the facts Jev/DeepSeek see

Code: `jev-sts2-review` @ `review-0929` = v3 4683dbe (read-only). Logs: `jev-sts2/logs` (grep/seek only).
Game text: `.cache/game-data.json`. Tests: 48 files / 783 tests pass; `tsc -p tsconfig.test.json`: 37 errors, all in `tests/` (triage in the last section).
Scratch reproductions (not in the repo): `/tmp/review-repro/rollout-carry.ts`, `/tmp/review-repro/raw-hits.ts`, `/tmp/review-repro/queen.ts`, `/tmp/review-repro/nextdmg.ts` (run with `npx tsx <file>` from the review worktree).

Severity: **play** = changes what is played or what Jev/DeepSeek is shown on current boards; **latent** = wrong but rare/not yet seen to matter; **cosmetic** = labels/log only.
Tag: **bug** / **strategy** (Roy's decision area: reported, not prescribed).

Summary table (details below, ordered by impact):

| # | Finding | Severity | Tag |
|---|---|---|---|
| 1 | Rollout's later turns keep this turn's play cap (Ringing, Sloth remainder): "dead 8/8, dmg 0" | play | bug |
| 2 | Fairy in a Bottle / Lizard Tail are not a revive: "every line dies" picks the most-HP line, rollout counts a death | play | bug |
| 3 | Thrash modelled as a random exhaust of any card, no damage added | play | bug |
| 4 | Rollout Queen/Amalgam moves: shown totals re-scaled by our Vulnerable and Strength, one hit (Off With Your Head 67x1 vs 7x5) | play | bug |
| 5 | Hardened Shell's 20/turn cap restarts at every mid-turn re-plan | play | bug |
| 6 | `rollout_best` set on exact float ties / invisible differences; Jev follows it | play | bug |
| 7 | Rollout drops enemy Strength gained this turn (Fight Me!, Enrage, Crab Rage) | play | bug |
| 8 | Rollout carries this turn's temporary Strength (Setup Strike, Flex; Mangle/Shackling on enemies) into every later turn | play | bug |
| 9 | Rollout later-turn energy ignores energy relics (Pumpkin Candle, Blessed Antler, Pael's Flesh, Spiked Gauntlets) | play | bug |
| 10 | Waterfall Giant in the rollout: eruption frozen, Siphon heal absent (solver/combat-plan/boss-clock model both) | play | bug |
| 11 | `mode()` over sparse monster-DB counts: rare self-buffs applied on every use (Giant +1 Strength per move) | play | bug |
| 12 | Non-attack damage (Inferno, Juggernaut, Kusarigama) ignores enemy Intangible / Slippery / Hardened Shell in the solver | play | bug |
| 13 | Rollout drops the lasting part of potions (Heart of Iron Plating, Dexterity, Regen, Clarity, Ritual, Shrink turns) | play | bug |
| 14 | `enemy_threat_next` cuts the next hit by Weak that has expired by then (Weak 1) | play | bug |
| 15 | Two different sources for "next turn's enemy damage" (move-model pooled shown avg vs per-ascension DB base) | latent | bug |
| 16 | Solver's exhaust pick (Burning Pact, True Grit+, Brand) differs from the selection screen's real pick | latent | bug |
| 17 | Other decision-turn flags leak into / reset in rollout later turns (player Intangible, Blur, Constrict, Artifact/Curl Up restored) | latent | bug |
| 18 | Kusarigama's random hit lands on the lowest-HP enemy (optimistic) while every other random hit is worst-case | latent | bug |
| 19 | A plan whose first card cannot be matched silently becomes `end_turn` | latent | bug |
| 20 | Silent fallbacks when knowledge files fail to load; the shown-intent fallback double-applies Vulnerable/Weak | latent | bug |
| 21 | `platingAbsorbed` treats Metallicize as decaying Plating | latent | bug |
| 22 | Reproducibility and small label issues (clock-dependent degrade, 1-turn "deaths 0", MC denominators, Fysh Oil Dex) | cosmetic | bug |
| S1 | HP guard / T1 potion gate consume rollout deaths that findings 1, 2, 4, 10 distort | play | strategy |
| R1 | Route `code_value`: every elite weighted at the current floor, not its own (plans at act start: all elites -3) | play | bug |
| R2 | Route "likely death" (-20, path cut) uses the old fixed cost shares while arrival HP uses measured costs | play | bug |
| R3 | Route re-plan trigger: projection healed at every rest, so a smith below ~70% reads as a 30-point "HP drop" | play | bug (threshold: strategy) |
| R4 | Boss clock `expected_entry_hp` (upper bound, no fights) next to the routes' projected `hp_at_boss` | play | bug |
| R5 | Monster-DB Strength gains pooled over ascensions (A9 moves +3 read as +2) | play | bug |
| R6 | Ascension fallback accepts n = 0/1 at the exact ascension (A9 crab/Insatiable/Matriarch → hand-set constants) | play | bug |
| R7 | Path HP = sum of room medians ("?" median 0, mean 2.7-5.3) understates the act's cost | play | strategy |
| R8 | "?" rooms break the fight chain in `fightsSoFar` but not in `stateAfter` | latent | bug |
| R9 | Tied route values get ranks 1 and 2 | cosmetic | bug |
| R10 | Act from floor vs from `act_id + 1` disagree on F17/F33 map screens | latent | bug |
| R11 | Map potion-discard ranks: 38/66 potions unranked, `FEAR_POTION` not a game id, entries lost in the 09-28 restore | latent | bug + strategy |
| R12 | Knowledge loaders swallow read/parse errors; some builders write without tmp + rename | latent | bug |
| R13 | Rest heal rounded up in `rest.ts`, four copies of the 30% constant | cosmetic | bug |
| R14 | Minor text/doc items | cosmetic | bug |

Counts: 37 entries. By severity: **play 22** (20 bug, 2 strategy: S1, R7), **latent 11** (all bug; R11 also has a strategy part), **cosmetic 4** (bug). R3's threshold is also Roy's.

---

## 1. Rollout later turns inherit this turn's play cap (Ringing / Sloth remainder)

- `src/screens/combat-plan.ts:2164-2170` `playCap()` returns the plays **left this turn**: Sloth amount minus `cards_played_this_turn`, and 1 for Ringing (game text RINGING_POWER: "本回合你只能打出1张牌", this turn only; SLOTH_POWER: "每个回合不能打出超过3张牌", per turn).
- `src/strategy/rollout.ts:1236-1270` builds every simulated later turn's `PlayerSim` as `{ ...base, ... }` from the decision turn and never resets `maxPlays`, so the remainder (often 0 or 1) applies to all 4 simulated turns.
- Evidence (decisions.jsonl):
  - VQKX9AD1YHKS F17 T5 (Ceremonial Beast Ringing turn), 2026-09-28T14:51:50: after Shrug It Off the only line "end turn" read `5-turn rollout: ... dead within 5 turns in 8/8`, `T2: dmg 0; T3: dmg 0; T4: dmg 0; T5: dmg 0`. The same decision logged `t1: {hp: true, rollout_death: true}`: the unsimulated Shackling Potion and Blessing of the Forge were on the question anyway (T1 by HP), but their `offered_because` told Jev "the cheapest potion-free option dies in some rollout sample" (combat-plan.ts:1704-1705, :1740), and the lone line's facts read certain death. Jev ended the turn at confidence 0.15. One decision earlier (14:51:48, cap 1) the rollout already had every later turn as a 1-card turn.
  - VQKX9AD1YHKS F33 T6 (Knowledge Demon, Sloth 3), 2026-09-28T15:05:46 vs 15:05:49, same turn: before any card, the top line's rollout ended `won 8/8` by T5; after two cards (cap left 1) the lines read `alive 0/8, won 0/8`, and Jev then drank Blessing of the Forge.
  - 4 Ringing and 19 Sloth plan questions carried rollout facts (41 / 116 more without, older builds).
- Reproduction: `/tmp/review-repro/rollout-carry.ts` case (c): `maxPlays: 0` → every later turn `-10.0 hp, dmg 0.0`; `maxPlays: null` → `dmg 6-8`.
- Fix: give later turns their own per-turn cap (Sloth: its amount; Ringing: none, the Beast's next Ringing turn is its own move) instead of spreading `base`; better, list the `PlayerSim` fields that are "this turn only" and reset them explicitly (see #17).

## 2. Fairy in a Bottle / Lizard Tail are not modelled as a revive

- `src/strategy/turn-solver.ts:1661-1664` `dies = hpAfter <= 0 || ...`; `src/strategy/rollout.ts:995` and `:1316` a dying sample loses all HP plus `DEATH_HP` 40. Neither knows FAIRY_IN_A_BOTTLE ("生命值将被减少至0或以下时 ... 回复到你最大生命值的30%") or LIZARD_TAIL (relic, same effect once).
- `src/screens/combat-plan.ts:1439-1451`: when every line "dies", code plays `leastLossPlan` = the line with the most HP after. With a revive held, every dying line ends at the same 30% of max HP, so "most HP" is the wrong criterion (damage/setup is what differs). Code plays this on its own, so Jev never sees the choice.
- Evidence: 12 `combat/least-loss` decisions with a Fairy in the belt (fingerprint `potions`), e.g. JR66CJ9T8H7W F48 T8 (two Fairies, "every simulated line dies; playing the one that keeps the most HP (-44): end turn", twice), G1Z0X3WBH4XQ F48 T7 (x4), LSWUK6D2EV89 F17 T15, and today YQL8D59999AX F31 T2/T4 (defensive least-loss lines at 16 and 10 HP; the run died on F31). 7 more plan questions showed `dead within N turns` rollout facts with a Fairy held. LIZARD_TAIL appears in 1035 logged state rows.
- Fix: a `PlayerSim.revive` (HP it comes back at, from the belt/relic), `dies` only when no revive is left, the revive's cost priced as the potion/relic spent; in the rollout, a death with a revive continues at that HP. The least-loss branch should rank by the score when a revive is held.

## 3. Thrash: random exhaust of any card, and its damage bonus missing

- Game text (THRASH): "造成4点伤害两次。消耗你的手牌中随机一张**攻击牌**，并将它的伤害添加给这张牌。"
- `src/strategy/card-model.ts:600` `randomExhaust` regex (`消耗[^。]*随机`) marks Thrash as a plain random exhaust; `src/strategy/turn-solver.ts:942-955` then (a) charges the average value of every card left (Skills included), (b) moves the whole rest of the hand to `held` so nothing can be planned after Thrash, and (c) deals only 4x2 (+Strength): the absorbed Attack's damage is never added.
- Evidence (states.jsonl, consecutive states where Thrash and one Attack left the hand together): D4JGCNEL40VL F46 T3 Thrash (shown 16) + Dismantle (8): 48 damage = 2 x (16 + 8), the solver counts 2 x 16; TTVYCS2ADZRM F12 T2 Thrash (4) + Uppercut (13): 39 dealt vs 8 counted. (The state log is per decision, so some other pairs include extra plays and are not quoted.) Thrash was in hand at 1178 logged plan decisions (344 of them questions to Jev).
- Fix: special-case Thrash: pick among Attacks only, add the picked Attack's per-hit damage to both hits (expected value over the Attacks in hand, or the worst case like `randomVictim`), and keep non-Attacks playable after it.

## 4. Rollout: Queen / Torch Head Amalgam moves double-scaled and collapsed to one hit

- `src/strategy/rollout-live.ts:142-146` `enemyTable`: when the monster DB has no measured base per hit (`moveDamageAt` null), the move's damage is `learned.damage[move] / hits` with `hits = 1` — the move model's **average shown total**, i.e. already including our Vulnerable and the enemy's Strength at log time.
- `src/strategy/rollout.ts:752-758` `moveAttack` then adds `enemy.strength` and multiplies by 1.5 for our Vulnerable again.
- The boss clock does this right: `src/knowledge/monster-db.ts:237-273` `shownDamageAt` is used by `bossDamageByTurn` for exactly these moves.
- Affected (no measured base): QUEEN OFF_WITH_YOUR_HEAD_MOVE, EXECUTION_MOVE; TORCH_HEAD_AMALGAM BEAM_MOVE, TACKLE_3_MOVE, TACKLE_4_MOVE. `/tmp/review-repro/queen.ts`: Off With Your Head = `{damage: 43, hits: 1}` → with the Queen's Strength 2 under "You are mine" Vulnerable: one 67 hit; logged shown intent is 7x5 = 35 (18 A8 states) and Execution 25 (rollout: 40). Every Queen decision after her T3 whose horizon reaches these moves overstates the loss, and a 5-hit move read as 1 hit also misprices block, Flame Barrier and Buffer.
- Fix: in `enemyTable`, use `shownDamageAt` for moves without a base and mark them `shown: true` so `moveAttack` skips the Vulnerable/Strength scaling; take `hits` from the logged shown string.

## 5. Hardened Shell's per-turn cap restarts at every re-plan

- HARDENED_SHELL_POWER: "每回合失去的生命值不会超过20点". The power amount stays 20 all turn (989/989 logged enemy rows show amount 20).
- `src/screens/combat-plan.ts:472` passes `hpLossCap = 20`; `src/strategy/turn-solver.ts:788` caps against `lostThisTurn`, which `rootSim` (`turn-solver.ts:2023`) starts at 0 on **every decision**. After the first card of a turn, a re-plan (draw, card screen, Jev question) believes the full 20 is available again.
- Evidence: 32 decisions in Skulking Colony fights planned more damage than the cap had left, e.g. 3RWJX25LB2CD F14 T3 (colony 45 → 25, cap spent) "code plan: Twin Strike → colony; dmg 14" (really 0); XJWF15R19UXF F8 T1 (colony 75 → 56, 1 left) options showed 9 damage; JRN33CL7EB50 F9 T1 (10 lost) option "Pommel Strike+, dmg 20".
- Fix: record each enemy's HP at the turn's first combat decision (screenMemory keyed by fight+turn) and pass `hpLossCap = max(0, 20 - lost so far)`.

## 6. `rollout_best` is decided by exact float equality and invisible numbers

- `src/strategy/rollout-live.ts:312-323` `pickRolloutBest`: contenders are `line.value === top` (exact), then enemy HP left and turns alive, then code's order. The flag goes to Jev as `rollout_best: true` (`combat-plan.ts:1713`, `:1735`) with no margin.
- Evidence (all logged plan questions carrying the flag): 2775 flagged questions; in 380 (13.7%) another option shows **identical** rollout numbers (loss to 0.1, wins/N, deaths/N); in 607 (21.9%) another is within 0.5 HP with the same wins and deaths. On those identical-looking ties the flag lands on code's plan1 68% of the time (47% when the lead is visible), and Jev picks the flagged line 72% of the time on ties (91% otherwise). Example: 4LC3YKCZV218 F24 T1 (2026-09-28T09:27:47), plans 1-4 all "expected further HP loss 16, over 0/8", plan1 flagged, chosen.
- Fix: flag only when the best value leads the runner-up by more than a noise margin (e.g. the between-sample standard error, or a fixed 1-2 HP-equivalent), otherwise say "rollout: no clear best among planX/planY" or flag none; log the runner-up gap in `rolloutLog`.

## 7. Rollout forgets enemy Strength gained on the decision turn

- The solver adds enemy Strength this turn for Fight Me! (`turn-solver.ts:1230`), Enrage per Skill (`:1039`), Crab Rage (`:840`, +6) and charges it (`:1864`), but `Outcome.enemyHpAfter` carries only hp/vulnerable/weak/block, so `src/strategy/rollout.ts:962-972` never adds it to `SimEnemy.strength`. The same happens inside every simulated later turn (Test Subject Enrage from the policy's Skills, a crab claw killed in simulated turn 3).
- Reproduction `/tmp/review-repro/rollout-carry.ts` case (a): a line giving the enemy +5 Strength costs 15 on T1 (solver) but its T2-T5 losses are identical to the same line without it.
- Fix: add `strengthGained` (net of `tempStrengthLoss`) per enemy to `enemyHpAfter` and add it in `applyPlan`; include Crab Rage's +Strength on the survivor.

## 8. Rollout makes temporary Strength permanent (both sides)

- Player: `src/strategy/rollout.ts:1128` `strength: base.strengthNow ?? STRENGTH_POWER`. The state's STRENGTH_POWER includes Setup Strike's and Flex's this-turn Strength (logged: `STRENGTH_POWER 3` with `SETUP_STRIKE_POWER 3`; FLEX_POTION_POWER likewise; Tender's per-card loss the other way). Mid-turn questions therefore roll out every later turn with +3/+5 Strength.
- Enemies: `src/strategy/rollout-live.ts:345` `strength: powers["STRENGTH_POWER"]` includes Mangle/Shackling Potion's temporary loss (logged Byrdonis `STRENGTH_POWER -10` with `MANGLE_POWER 10`), so after a Mangle or Shackling Potion the rollout's later turns hit 7-10 less per hit.
- Evidence: since 09-28, 46 rollout-carrying plan questions were asked with SETUP_STRIKE_POWER or FLEX_POTION_POWER up (33 + 13).
- Fix: subtract the temporary powers (SETUP_STRIKE_POWER, FLEX_POTION_POWER, COORDINATE/REPTILE_TRINKET/FEEDING_FRENZY; enemy MANGLE_POWER, SHACKLING_POTION_POWER, PIERCING_WAIL_POWER ...) before seeding later-turn Strength.

## 9. Rollout energy ignores per-turn energy relics

- `src/strategy/rollout-live.ts:226-235` `max_en = run.max_energy` (3 unless a boss relic changes it) and `src/strategy/rollout.ts:1240` gives every simulated turn `max_en + Pyre + Radiance`.
- `src/strategy/boss-clock.ts:313-319` knows `max_energy` leaves out energy relics and adds `ENERGY_RELICS`.
- Evidence (states.jsonl, turn-start states with no card played): `max_energy 3` with turn-start energy 4 under PUMPKIN_CANDLE (e.g. 9XZX4ZJ1ZKUA F19-F23), BLESSED_ANTLER (CRRPX9MWJZGM F35), SPIKED_GAUNTLETS (YFG53EZ372D7), PAELS_FLESH from T3 (VC4LRL945UEF, Y0KJC2MQ57Z4). Those runs' rollouts play one card less per turn than the game gives.
- Fix: seed later-turn energy from the relics (as boss-clock) or from this fight's observed turn-start energy; keep `meta.max_en` as the model feature (it was trained that way).

## 10. Waterfall Giant: the rollout freezes the eruption and has no Siphon heal

- The eruption grows +3 per Giant move: solver `turn-solver.ts:1740` (+3 while alive), `combat-plan.ts:574-594` `eruptionRace` (`eruptionSchedule(asc).perTurn`), `boss-clock.ts:550-576`; monster DB: every Giant move has `self_powers_gained.STEAM_ERUPTION_POWER: 3`.
- The rollout never grows it: `src/strategy/rollout.ts:829` the blast is `e.base.eruption` from the decision state, whatever simulated turn the kill happens on (up to 12 low at the horizon).
- Siphon heals 10 (A0-7) / 15 (A8+) (`boss-clock.ts:175`, used by `combat-plan.ts:551-561` `giantTurnsToKill`), Knowledge Demon's Ponder 30 (`boss-clock.ts:514-518`); `rollout-live.ts:134-161` `EnemyTable` has no heal field, so rollout Giant/Demon HP runs low.
- Net: rollout Giant fights are optimistic on HP left and blast (and pessimistic on hits, #11). Fix: read STEAM_ERUPTION_POWER gain per move into the table and add it to `base.eruption` each enemy turn; add a `heal` per move (Siphon, Ponder) from the same logged numbers boss-clock uses.

## 11. `mode()` over sparse monster-DB counts applies rare effects on every use

- `src/strategy/rollout-live.ts:111-115` `mode(counts)` returns the most common **observed** amount without comparing its count to the move's `n_seen`; used for self Strength (`:148`), block (`:149`), Vigor (`:151`) and player debuffs (`:122-131`).
- Waterfall Giant: every move has `STRENGTH_POWER {"1": 1}` (1 observation out of 58-129 uses, likely a Brimstone run) → the rollout gives the Giant +1 Strength every move (`/tmp/review-repro/queen.ts` prints `strength: 1` for Stomp, Ram, Siphon). Others: QUEEN Burn Bright +2 Str (11/55), TURRET_OPERATOR Reload +1 (8/30), OVICOPTER +3 (7/17), FOGMOG, LIVING_SHIELD, DEVOTED_SCULPTOR, INFESTED_PRISM (1/46); BOWLBUG_EGG Bite 7 block (74/156), MAGI_KNIGHT Prep 5 block (5/11); player debuffs: Decimillipede Constrict Weak (24/63, 18/52), Stabbot Frail (3/20), The Lost/Forgotten Str/Dex drain (6/17, 6/28).
- The boss clock has the same pattern: `src/knowledge/monster-db.ts:276` `strengthOf` = `mode(self_powers_gained.STRENGTH_POWER)` inside `monsterDamageByTurn` → `bossDamageByTurn` → `bossLossPerTurn`, so the Giant's HP loss a turn (and `eruptionRace`'s HP at the kill, `combat-plan.ts:591`) also ramps +1 a turn. (R5 below: the same line also ignores the per-ascension split.)
- Fix: use the expected amount (sum(amount x count) / n_seen), or apply only when count / n_seen >= 0.5; one helper for both callers.

## 12. Non-attack damage ignores enemy caps in the solver

- `src/strategy/turn-solver.ts:1309-1318` `hitEnemyRaw` (Juggernaut `:1290`, Inferno sweep `:727`, Kusarigama `:912`) only meets block. `hitEnemy` (`:759-803`) applies Intangible, Slippery, Hardened Shell, Hard to Kill; the rollout's start-of-turn AoE (`rollout.ts:883`) applies Intangible. INTANGIBLE_POWER: "将本回合受到的**所有伤害和生命减少**效果降低为1"; SLIPPERY_POWER: "下一次要失去生命值时，只会失去1点".
- Reproduction `/tmp/review-repro/raw-hits.ts` (Bloodletting with Inferno 6, Defend with Juggernaut 6, Strike 6): plain 18 dealt; Intangible enemy 13 counted (true 3); Slippery 9: 13 (true 3, and two stacks spent).
- Where it matters: Test Subject phase 3 (Nemesis Intangible every other turn), Soul Fysh Intangible turns, Vantom (Slippery 9), Skulking Colony, with Inferno/Juggernaut decks (both appear in the logged runs). Fix: pass non-attack damage through the same caps (skip only Vulnerable/Weak/Flutter/Slow, which are attack-only).

## 13. Rollout drops the lasting part of potions

- `src/strategy/rollout.ts:912-918`: a potion step decrements the belt, handles Radiant Tincture and Soldier's Stew, then `continue`s — before `:932` (`player.plating += card.plating`). `SimPlayer` has no Regen, Ritual, Clarity or Dexterity gain, and later turns' `laterTurnSim` does not age Shrink.
- The solver prices all of them as lasting value (`turn-solver.ts:1069-1083`, `platingAbsorbed` `:1502-1516`, Shrink `:1862`), so the options' own numbers and their rollout facts disagree, always against the potion line.
- Reproduction `/tmp/review-repro/rollout-carry.ts` (b): Heart of Iron (Plating 7) → later turns identical to "end turn" (T2 -1.3); Stone Armor with the same Plating 7 → T2 -0.0.
- Fix: in `applyPlan`, apply the potion's `plating` like a card's; carry Dexterity Potion (+2), Fysh Oil (+1 Dex), Regen (n, n-1, ... heals), Mazaleth's Gift (+1 Str a turn), Clarity (+1 card for 3 turns), Beetle Juice (Shrink turns on that enemy).

## 14. `enemy_threat_next` counts Weak that has worn off

- `src/screens/combat-plan.ts:707` multiplies the next attack (the move **after** this enemy turn) by 0.75 when the line leaves `weak > 0`. A Weak 1 applied now is gone before that attack: `rollout.ts:1025` decrements it after the enemy turn, and the logs agree (states.jsonl, last 300 MB: enemy Weak 1 at the end of our turn → 0 at our next turn in 51/51 cases; Weak 2 → 1 in 16/16).
- Effect: every line that applies exactly Weak 1 (Uppercut, Potion of Binding, Clothesline-type cards) shows a next-turn threat 25% too low. Fix: `after.weak >= 2`.

## 15. Two sources for "the enemy's next hit"

- Solver/facts: `nextIncoming` (`combat-plan.ts:1274-1280`), `laterIncoming` (`:2244-2261`, feeds Plating value), `enemy_threat_next` (`:1813`), the exhaust pick's `incoming` (`selection.ts:508-511`) and the HP-guard `nextIncoming + 5` rules all use `move-model.ts` `expectedNextDamage` / `damageForecast`: the move's average **shown** total pooled over all ascensions (Strength and our Vulnerable at log time included), ignoring the enemy's current Strength.
- Rollout: `rollout-live.ts:142-154` per-ascension base from the monster DB plus the enemy's current Strength and our Vulnerable.
- `/tmp/review-repro/nextdmg.ts`: over 207 moves, A9 DB base / move-model average: median 1.04, p10 0.79, p90 1.18; e.g. Mysterious Knight Flail 35.2 vs 20, Test Subject Multi Claw 46.9 vs 33 (special-cased by `multiClawNext`), Bygone Effigy Slashes 22.8 vs 15.
- Fix: one helper (`expectedMoveDamage(enemy, move, asc, strength, playerVulnerable)`) used by both; keep the pooled average only as the fallback.

## 16. The solver's exhaust pick is not the one the game makes

- Solver: `turn-solver.ts:638-668` `exhaustValue`/`exhaustPick` (junk, Howl, then the least of damage x 0.45, block x 0.5, debuffs, lasting, draw). Game pick: `selection.ts:552-617` `combatExhaustScore` (card value, "Defend under fire", MIN_COMBAT_ATTACKS, planned cards protected by id, `:153`/`:170`).
- Example: Burning Pact with a Strike and a Defend, more than 10 incoming, more than 4 attacks left: the solver exhausts the Defend (2.5 < 2.7) and plans the Strike; the selection screen exhausts the Strike (70 > 20). Planned-card protection is by `cardId+upgraded`, so with two Defends planned-around, both copies are protected.
- Effect: the line's score and `outcome.exhausted` (used by the rollout to remove cards) describe a different turn from the one played. Latent (the plan is re-made after the draw). Fix: have both call one function.

## 17. Other decision-turn state leaks into (or is reset in) rollout later turns

- `rollout.ts:1236-1270` `{ ...base }` keeps: `intangible` (player Intangible this turn → every later hit 1; `/tmp/review-repro/rollout-carry.ts` (d): T2 loss 0.6 vs 1.3); `endTurnHpLoss` (Constrict stays after the Strangler dies); `shrunk`; `demonTongue` false forever once spent this turn. `rollout.ts:1134` `keepsBlock` from BLUR_POWER (one turn) becomes permanent Barricade.
- `rollout.ts:1093-1096` `laterTurnSim` keeps the decision-time consumables: Artifact stripped on turn 0 is back every later turn, Curl Up ("每场战斗一次") re-arms every turn, Slippery/Flutter stacks restored.
- Logged frequency is low (player Intangible at 2 questions, Blur at 16, none with rollout facts yet). Fix: an explicit list of per-turn fields reset for later turns, and carry Artifact/Curl Up/Slippery from the previous simulated turn.

## 18. Kusarigama's random hit is optimistic

- `turn-solver.ts:909-913` sends Kusarigama's 6 to the lowest-HP living enemy ("随机对一名敌人"), while Juggernaut (`:1287-1290`) and random attacks (`:1200-1207`) use `randomVictim` (most HP + block: never count on a random kill). A Kusarigama line can show a kill or lethal the game gives only sometimes. The comment's MX8K crab case wants the pessimistic choice for Crab Rage; for lethal it is the optimistic one. Fix: `randomVictim`, plus a separate crab-rage risk term if wanted.

## 19. A plan whose first card cannot be matched silently ends the turn

- `combat-plan.ts:760-766` `firstIntent`: `intentFor(first, hand) ?? { action: "end_turn" }` (also `:748-758` when the target is no longer valid). No log line; the rationale still names the chosen plan. No logged instance was found (the end-turn rows whose rationale names cards are HP-guard swaps or the loop's "repeated illegal plays" fallback), but nothing would show it. Fix: log it and re-plan (return null) instead of ending the turn.

## 20. Silent fallbacks

- `rollout-live.ts:95-101` `readJson` → `{}` on any read/parse error: no move tables, so every enemy falls back to `moveAttack`'s shown-intent path, which **re-applies** Weak and our Vulnerable to intents that already include them (`rollout.ts:754-755`) and repeats this turn's intent forever. Today only BATTLE_FRIEND_V3 / FAKE_MERCHANT_MONSTER (no DB entry) and unseen moves take that path.
- `rollout.ts:240-249` gates → `null` (gate w = 0), `move-model.ts:19-28` → `{}` (all next-hit rules see 0), `boss-clock.ts:108-114` → `{}` (labelled in the note, fine). None logs.
- Fix: log once per process when a knowledge file is missing or unparsable; drop the double scaling in the shown fallback.

## 21. `platingAbsorbed` mixes Metallicize into decaying Plating

- `turn-solver.ts:1504-1513` treats `endTurnBlock` (Plating + Metallicize, `combat-plan.ts:1167`) as Plating that drops by 1 a turn; the rollout splits them (`rollout.ts:1137-1138`). With Metallicize up, new Plating is overvalued (existing block assumed to decay; loop runs past the new Plating's life). METALLICIZE is not in this game data's card list, so latent. Fix: pass Plating alone.

## 22. Reproducibility and small label issues (cosmetic)

- Clock-dependent facts: the rollout's horizon/samples (`rollout.ts:1546-1576`; 81 of 2860 logged rollouts degraded, 2.8%) and the potion Monte Carlo's samples and node cap (`potion-mc.ts:213-224`; 37 of 380 runs, 9.7%) depend on wall time, so the same board can show different numbers. Seeds are fixed (`seedOf`), no `Math.random` in `src/`. Suggest logging the seed and cut with the question (already partly in `rolloutLog`).
- `rollout.ts:1650-1668` 1-turn degraded mode reports `deaths: 0` and "expected turns to the end (surviving samples) ~1" for a line that dies this turn (only reachable via the all-die + random-potion path).
- `potion-mc.ts:300-319`: `wins_fight_this_turn` / `beats_best_potion_free_line` use all samples as the denominator, including samples with no legal line (`plans` null), while hp/damage spreads use only the lines.
- `card-model.ts:649` FYSH_OIL models Strength +1 only; `knowledge/potion-values.ts` (and the text) give Strength 1 and Dexterity 1.

## S1. (strategy) Rules that consume rollout deaths inherit the distortions above

- The T1 unsimulated-potion gate (`combat-plan.ts:1704-1705`, `t1Death`) and the HP guard's `guardKeepsPick` (`combat-plan.ts:415-423`, `:1908-1909`) read `rollout.byPlan.get(plan).deaths`. Findings 1 (Ringing: fake 8/8 deaths → potions offered, VQKX9AD1YHKS F17 T5), 2 (a Fairy revive counted as death), 4 (Queen hits x1.9) and 10 feed those counts. Reported for Roy's judgement: whether these rules should wait for the fixes or use a death count that is robust to them.

---

## Route projection and knowledge loaders

Reviewed in parallel (scratch scripts `/tmp/rv/route1-4.ts`, `str.ts`, `boss.ts`, `pot.ts`, `medsum.py`); `map.ts` and `route-projection.ts` are identical between the running build and 4683dbe. Last day of play: 504 `map/route-follow`, 62 DeepSeek route plans, 48 single-option `map/route`; DeepSeek took `code_rank` 1 in 30 of 55 logged plans, so `scorePath`'s `code_value`/`code_rank` and the re-plan trigger are what matter. Items R1, R2, R3 and R5 were re-checked against the code here.

### R1. `floorInAct` is the current floor for every node of every path — play, bug
- `src/screens/map.ts:287-297`: `weightOf` closes over one `floorInAct`; it feeds `continuation()` (`:177-195`) and `scorePath()` (`:449-471`). `nodeWeight`'s elite rules depend on the elite's **own** floor (`:78` `<= 4`, `:84` `>= 12` pre-boss, `:87`), and `RouteState` carries no row.
- Route plans are made at act start (floorInAct 1), so every elite on every candidate path at >= 50% HP scores a flat -3: mid-act elites at > 80% never get +4, and the act-2+ pre-boss rule (-5) never fires. After a mid-act re-plan it flips: every elite, the pre-boss one included, gets the mid-act rule. The next node is off by one too (current floor, not the next).
- Evidence: `nodeWeight("Elite", 0.9, 100, 1, 2)` = -3, with floorInAct 8 = +4. Re-scoring the `sfce-f1-route-plan` fixture with floorInAct = row + 1 (the copy reproduces the logged `code_value` 22.18 / 27.24 / 30.04 exactly) moves the top path from "Elite at step 6 at ~55/80" (22.18) to "... RestSite -> Elite at ~79/80" (33.68), which the live options ranked 5th; 2-elite paths average 16.5 -> 27.9. `tests/screens.test.ts:322-333` and `tests/fight-plan.test.ts:336-343` already treat the argument as the elite's own floor.
- Fix: pass the node's row into the weights, floorInAct = row + 1 (logs: act 1 row r = floor r + 1; act 2 row 0 = F18; act 3 row 0 = F34).

### R2. "Likely death" uses the old fixed costs while the HP it tests comes from the measured costs — play, bug
- `map.ts:70` (`hpPct <= fightHpCost(type, act)` → `LIKELY_DEATH` -20, and the rest of the path stops counting) with `fightHpCost` (`:133-141`: act 1/2/3 Monster 0.10/0.22/0.28, Elite x2.5 = 0.25/0.55/0.70 of max HP), while `scorePath` projects arrival HP with `route-projection.ts` `projectPath` (measured room costs: elite medians about 0.41 of max HP in act 2, 0.40 in act 3).
- Evidence: in logged route plans 50 elite entries were valued -20 while the shown median projection survives (39 in act 2, 11 in act 3), e.g. EZ2LP1P5VRPT F34 p7 "~50/80 on arrival, ~18 left at its median cost", value -4.16, rank 7; 7B0D6XKP0BAZ F30 p2 "Elite -> RestSite -> Boss" "~52/106, ~19 left", value -41.4. Fixtures: 20 of 57 flagged fight nodes (qzqu F18) and 47 of 137 (sfce F18) survive at median.
- Fix: decide likely death from the `RoomCostModel` (arrival HP <= that room's median cost), in `scorePath` and the baseline alike.

### R3. The route re-plan trigger compares real HP with a projection that healed at every rest — play, bug (threshold: strategy)
- `route-projection.ts:82` always heals 30% at a rest; `map.ts:569-579` re-plans when `next.hpOnArrival - hpPct >= 0.3`. Rest vs smith is DeepSeek's call, so a smith below ~70% HP reads as a ~30-point "HP drop".
- Evidence: KY3YZ0DMRY0G F8 smithed at 68%, then "HP 68% is 31 points below the 99% the plan projected"; also WXMBVL6ZJ000 F11, 0B5YKJFM0E8B F13. Last day: 4 of 15 smiths below 70% triggered an immediate HP-drop re-plan; 4 of the 33 HP-drop re-plans followed a smith.
- Fix: after a rest decision, re-base the plan's remaining `hpOnArrival` on actual HP (or take out the heal not taken). The 0.3 threshold itself is Roy's.

### R4. Two "HP at the boss" numbers in one DeepSeek question — play, bug (misleading fact)
- `boss-clock.ts:660-668` `expectedEntryHp` = HP now + 30% (+15 Regal Pillow) when the pre-boss rest is ahead, no fights taken off (its own doc says "an upper bound"), shown as `expected_entry_hp` (`boss-clock.ts:819`) with no such note; `survivable_turns`, `need`, `gap` derive from it. The route options' `hp_at_boss` (`map.ts:546`) project the fights.
- Evidence: qzqu F18 (69/80): clock 80, options ~62/51/73/53/42/60 and two "ran out"; sfce F18 (72/87): clock 87, options 58-87.
- Fix: label it an upper bound in the JSON, or feed the clock the chosen plan's projected boss HP.

### R5. Monster-DB Strength gains pooled over all ascensions though per-ascension data exists — play at A9, bug
- `monster-db.ts:276` (`strengthOf` in `monsterDamageByTurn` → `bossDamageByTurn` → `bossLossPerTurn`), `monster-db.ts:362` (dossier "+N力"), `rollout-live.ts:148`; `powerScheduleAt` already uses `*_by_asc`.
- At A9 these moves gain 3, the code uses 2: Crusher Adapt, Rocket Charge Up, Kin Priest Ritual, Kin Follower Power Dance, Knowledge Demon Ponder, Insatiable Salivate (Louse 5 -> 7; Nibbit/Myte/Gardener 2 -> 3); Aeonglass at A8 the reverse (pooled 4, A8 3). Ten-turn attack at A9, code vs per-ascension: Kin Follower 58 vs 72, Kin Priest 90 vs 99, Insatiable 178 vs 191, Knowledge Demon 155 vs 163, Crusher 138 vs 145, Rocket 172 vs 177.
- Fix: `strengthGainAt(move, asc)` via `nearestAscension` over `self_powers_gained_by_asc` (and the sparse-count rule of #11).

### R6. Ascension fallback takes the exact ascension even with n = 0 or 1 for the needed number — play at A9, bug
- `monster-db.ts:113-120` `nearestAscension` as used by `bossHpLoss` (`:621-642`). At A9, KAISER_CRAB, THE_INSATIABLE, LAGAVULIN_MATRIARCH return null (no A9 wins): `potion-value.ts:58-59` then silently uses the hand-set lossPerTurn (10 / 8.9 / 5.8) instead of A8's measured (crab 9.7, n=23), and `event.ts:69-75` shows no forced-boss facts. KNOWLEDGE_DEMON at A9 uses one win (47 HP) and n=2 per turn instead of A8's n=7 / n=19. `measuredRoom`/`roomHpCost` require n >= 5.
- Fix: a stat-aware nearest lookup with a minimum n, trying ascensions by distance.

### R7. Chained medians understate path HP cost — play (facts), strategy/modelling
- `route-projection.ts:102-117`: a sum of medians is not the median of the sum; "?" rooms have median 0 in every cell but mean 2.7 (A8 act 2) and 5.3 (A8 act 3), so "?"-heavy paths look free. Per-act HP lost over non-rest rooms (runs that survived the act): A8 act 1 actual 39.8 vs medians 32.6 vs means 41.5; A8 act 2 68.6 vs 65.3; A9 act 2 (9 run-acts) 49.8 vs 35.9. Reported for Roy (which statistic the projection should chain).

### R8. "?" rooms break the fight chain in one place but not the other — latent, bug
- `stateAfter` keeps the chain through "Unknown" (`map.ts:163-166`); `fightsSoFar` ends it at a "?" (`map.ts:227`); the `RouteState`/`FIGHT_CHAIN_PENALTY` docs (`:37-47`) say "?" breaks it. Fix: one rule.

### R9. Tied route values still get ranks 1 and 2 — cosmetic, but it steers DeepSeek
- `pick.ts:196` (`ranked.indexOf + 1`): 10 of 62 logged route plans had the top two tied (UBLVBA0D1QXD F1: p1 and p2 both 29.28). `candidatePaths` (`map.ts:481-489`) also drops a first node whose best path has the same room-type sequence as another's, so "every first step is represented" is not guaranteed. Fix: equal values, equal rank. (Same pattern as #6 for combat.)

### R10. Act from the floor in some places, from `act_id + 1` in others — latent
- Floor-based: `map.ts:290`, `journal-replay.ts:355`, `tools/build-room-costs.py:31`; `act_id + 1`: `run-plan.ts:63`, `build-facts`, `experience`, `combat-plan`. They disagree on the F17/F33 map screens (act_id already advanced). Harmless today (stale plan dropped by `available.length < 2`) except `floors_to_act_boss` shows 0 there (`build-facts.ts:42`); a second act boss (A10 `map.second_boss_node`) would break the floor-based act and `BOSS_FLOORS` [17, 33, 48].

### R11. Map discard-step potion ranks — latent, strategy + bug
- `map.ts:650-661`: 38 of the game's 66 potions are unranked and default to 5 (discardable), incl. Ghost in a Jar, Fruit Juice, Cure All, Liquid Bronze, Shackling, Soldier's Stew, King's Courage; `FEAR_POTION` is not a game id; the 09-28 baseline restore (910671b) dropped `BEETLE_JUICE:7`, `MAZALETHS_GIFT:7`, `POTION_SHAPED_ROCK:1` that 06ee142 / 0982190 had added. Before the restore Cure All was discarded at rank 5 (7UJ1 F31, 9VG8 F28, 123Z F16/F28), Liquid Bronze (HCBJ F15), Soldier's Stew (9VG8 F26); no discard rows since. The ranks are Roy's; the missing ids and the non-game id are bugs.

### R12. Knowledge loaders fall back silently — latent, bug
- `room-costs.ts:25-30`, `monster-db.ts:97-103`, `move-model.ts:21-26`, `card-upgrades.ts:132-136`, `jev-hints.ts:260-265`, `experience.ts:76-92`, `fight-value.ts:75-80`, `boss-clock.ts:111-112` (and `rollout-live.ts:95-101`, `rollout.ts:240-249`, #20) catch and return `{}`/`[]`/`null` with no log line. A plausible trigger: `ops/wait-run.sh` rebuilds the files as the next play process starts, and `move-model.json` (`tools/build-monster-db.py:852`), `build-card-upgrades.py:71`, `build-move-model.py:61` write without a temp file. Fix: log once; write via tmp + `os.replace` as room-costs and monster-db already do.

### R13. Rest heal modelled four ways — cosmetic
- `rest.ts:98` shows `Math.round(0.3 * max)`; the game rounds down (its HEAL option text carries the number): one too high at max HP 72, 82, 83, 85, 86, 89, 92, 95, 96, 102, 105, 106, 115. The projection uses unrounded 0.3 x max, only the boss clock adds Regal Pillow. Four copies of the constant: `route-projection.ts:16`, `map.ts:143`, `boss-clock.ts:636`, `rest.ts:98`. Fix: one helper, ideally reading the game's number.

### R14. Minor
- `fillRelicText` leaves raw templates for 6 relics (NEOWS_BONES `{Relics:plural:遗物|遗物}`, SEA_GLASS `{Character.StringValue:cond:…}`).
- `monster-db.json` meta says "not read by the player code"; it is. `knowledge/index.ts` header says English; the cache is Chinese.
- `map.ts:297` `runPlanEliteShift` has no run-id check (harmless: one run per process).
- A chosen plan whose projection runs out has `hpOnArrival` 0, so it never triggers an HP re-plan (`map.ts:569`).
- Checked, no problem: act keys in room-costs / monster-db / outcome-stats are 1-based and match callers; fight-value support keys and bins match the Python builder (the TS `featuresOf` mirrors `base_features`); no loader's cached object is mutated by a caller; no unseeded randomness; experience scope ids and hint enemy ids resolve; `MAX_PATHS` not binding (fixtures 51-128 paths).

---

## Type errors under `npx tsc -p tsconfig.test.json` (37, all in tests/)

All 783 tests pass; no error is in `src/`. None hides a failing assertion; two are stale test code worth tidying.

| File (count) | Code | What | Verdict |
|---|---|---|---|
| `tests/rollout-live.test.ts` (24) | TS2345 | `criteriaOf(decision)[key]` typed as the question-criteria union (`string[] \| Record \| {true,false}`) passed where `Record<string, string\|null>` is expected | harmless typing: narrow once in the helper (`criteriaOf` returns `Record<string, string\|null>` for choice questions) |
| `tests/potion-mc.test.ts` (3) | TS7053 | same union indexed by `"p0"`/`"p1"` | harmless typing, same fix |
| `tests/journal-replay.test.ts` (5) | TS2345 | `poll(..., {label, by, choice})` without the required `reason` | harmless; note the fixture then logs `journal` without `reason`, whereas real rows carry `reason: ""` — set `reason: ""` to keep the fixture like the logs |
| `tests/journal-replay.test.ts:18` (1) | TS6133 | unused `GameState` import | harmless |
| `tests/route-projection.test.ts:96` (1) | TS2339 | `outcome.decision.state` on the `Decision` union (`ActDecision` has no `state`) | harmless: if it were an `act`, `note` would be `"undefined"` and the regex assertions would fail; narrow with `kind === "ask"` |
| `tests/screens.test.ts:904` (1) | TS7053 | `raw["combat"]` on the narrowly typed `exhaustState()` result | harmless typing (the object has `combat` at runtime, the test reads it) |
| `tests/screens.test.ts:1628` (1) | TS2339 | `e.screenMemory.lastScreen` — `ScreenMemory` has no `lastScreen` (renamed/removed) | stale test code: the override always writes `lastScreen: undefined`, so it no longer carries anything; the assertions do not depend on it. Remove it (or use `screen` if the intent was to keep the screen) |
| `tests/turn-solver.test.ts:1881` (1) | TS2345 | `{ ...healthy, nextIncoming: undefined }` passed to a helper typed with `nextIncoming: number` | harmless typing (exactOptionalPropertyTypes); the test does compare the undefined case as intended |
