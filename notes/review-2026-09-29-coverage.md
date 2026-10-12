# Review 2026-09-29: combat mechanics seen in the logs that the models do not cover

Code reviewed: `jev-sts2-review` branch `review-0929` = v3 at 4683dbe (read-only).
Data: `jev-sts2/logs/states.jsonl` (streamed, 124k states), `decisions.jsonl` (77k combat decisions),
`runs.jsonl` (315 runs), `src/knowledge/monster-db.json`, `.cache/game-data.json`.

## Method and caveats

- **Fights:** 4,400 fights, i.e. contiguous in-combat states per (run, floor). They come from 318 runs; 2,136 of the fights are at A8/A9. There were 303 deaths, 168 of them at A8/A9.
- **Per fight** I extracted every enemy power, every power on us, enemy intents and moves, and enemies that spawned mid-fight (the count per id went up). I also took heals and revives, cards generated in combat (anything not in the deck), potions held and used, and relics.
- **Per turn** I took the last state of the turn: HP, block, intents, powers, hand.
- **"Excess"** = HP lost in the fight minus the mean for the same fight kind, act and ascension band (A0-7 or A8+).
- **Solver accuracy:** for each turn I compared the last decision's predicted HP loss with the HP actually lost before the next turn. For damage I compared the first decision's predicted damage with the enemy HP actually removed.
- **Rollout accuracy:** I compared the chosen line's rollout facts (expected further HP loss, and "fight over within 5 turns k/8") with the fight's real outcome. Only 2,821 decisions carry rollout facts, all logged between 09-28 14:19 and 09-29 03:09. So the rollout gaps are measured as forecast error, not as HP cost.
- **Code versions:** most logs are from older code. For every fallback I only count what the v3 code still does. Recent sub-sets (09-27 onward) are given where they differ.
- Scratch scripts live in `/tmp/cov/` (`extract2.py`, `extract3.py`, `dec*.py`, `resid.py`, `roll.py`). They are not in the repo.

## Summary: mechanics checked and gaps per component

| Category (seen in logs) | Turn solver | Rollout | Boss clock | Facts shown to Jev |
|---|---|---|---|---|
| Enemy powers: 62 | 13 hit the 0.8 "unmodelled" cut; 2 on-death spawns counted as wins | 24 not simulated or frozen at the decision value (+3 already known) | all 12 bosses profiled (Soul Fysh and Matriarch only as flat factors) | 46 of 62 shown as a bare id, with no note or description |
| Powers enemies put on us: 20 | 1 (Smoggy) | 13 not applied or frozen (+ Surrounded facing, already known) | KD curses, Queen Weak and Beast Ringing covered | covered: the player's powers carry game text |
| Enemy move side effects: 8 Summon, 7 Heal, 17 StatusCard moves, 14 self-buff power types | intents are exact for the current turn; on-death spawns and theft are not valued | 0/8 summons, 1/7 heals (Ponder, Siphon missing), 0/17 status-card moves, 9/14 self-buff types dropped | KD +60 heal, Giant Siphon; statuses only inside the flat factors | move text names the status-card count; heals are never mentioned |
| Our own powers: 55 non-enemy | ~10 in-turn triggers not read | ~20 not carried, and 5 temporary Str/Dex powers frozen as permanent | n/a | covered |
| Potions: 51 | 4 unmodelled (Liquid Bronze, Stable Serum, Entropic Brew, Fairy in a Bottle) | same 4 | n/a | "effect not simulated" line |
| Relics: 198 (most are out of combat) | ~41 with in-combat triggers not read | same | energy and Strength relics counted | relic list only |
| Cards: 169 ids / 251 variants seen in hand | 17 ids (24 variants) unknown, plus Dark Shackles mislabelled unknown | same (flat value) | n/a | "unmodelled_cards" |

The turn solver's single-turn HP forecast is now very accurate. Since 09-27 the last decision of the turn predicted the enemy turn exactly in 7,555 turns with only 213 HP under-predicted in total. The remaining gaps are:
1. the rollout's later turns;
2. the 0.8 damage cut;
3. what Jev is told about enemies.

---

## Gaps ranked by impact

### 1. Rollout keeps the decision's per-turn state for every simulated turn — `bug`, severity HIGH

**Mechanics:**
- enemy `SLIPPERY_POWER`, `ARTIFACT_POWER`, `CURL_UP_POWER`, `FLUTTER_POWER`, `SHRINK_POWER` (enemy);
- the temporary Strength loss we put on enemies (`MANGLE_POWER`, `DARK_SHACKLES_POWER`, `SHACKLING_POTION_POWER`, shown as negative `STRENGTH_POWER`);
- our temporary Strength/Dexterity (`SETUP_STRIKE_POWER`, `FLEX_POTION_POWER`, `REPTILE_TRINKET_POWER`, `FEEDING_FRENZY_POWER`, `SPEED_POTION_POWER`);
- play caps (`RINGING_POWER`, `SLOTH_POWER`);
- our `INTANGIBLE_POWER`.

**Where:**
- Slippery: Vantom and Inklet, 106 fights / 93 runs / A8+ 54. Vantom had Slippery > 0 on 153 turns. It decays for good (6, 5, 4, 2, 1, 0) and never comes back.
- Artifact: 204 fights / 155 runs (Chomper, Punch and Cubex Construct, Mecha Knight, Aeonglass 3).
- Curl Up: 63 fights (Louse Progenitor).
- Temporary enemy Strength loss: 44 fights, mostly bosses and elites (CRY9 F20/F21, D3X1 F38, RA3Q F7, 69HW F8, PHMV F4).
- Setup Strike temporary Strength: up at the end of 1,566 of 20,869 turns (1,110 fights). A Jev question was asked with it up 287 times; 25 of those carried rollout facts. Plus Flex 10, Feeding Frenzy 3, Speed 3.
- Ringing: 37 Beast fights, A8+ 21. Sloth: 38 KD fights, A8+ 17.

**Components:**
- `rollout.ts:1093-1096` `laterTurnSim` only drops asleep/slumber/imbalanced/shriek/burrowed/skittish. Every other `EnemySim` field is re-applied each simulated turn at its decision-time value (`rollout.ts:1220-1234`).
- Enemy Strength is seeded from `STRENGTH_POWER`, which includes the temporary loss (`rollout-live.ts:345` → `rollout.ts:1170`). It is never restored.
- Our Strength and Dexterity are seeded from `strengthNow` and `DEXTERITY_POWER`, which include the temporary part (`rollout.ts:1128-1129`). `applyPlan` only adds permanent gains (`turn-solver.ts:1913`).
- `pSim = { ...base, … }` at `rollout.ts:1236-1270` keeps the base `maxPlays`, `intangible` and `shrunk`.
- `playCap` returns the plays left this turn (`combat-plan.ts:2164-2170`). A Ringing turn therefore becomes "1 card (or 0) every turn". A mid-turn Sloth decision becomes "3 minus the cards already played, every turn".

**Observed cost (forecast error):**
- Vantom decisions with Slippery > 0 (n=14):
  - rollout P(fight over ≤5 turns) 0.00 vs actual 0.29;
  - further loss 60.7 vs actual 40.3;
  - e.g. 69HWH6MD1S34 F17 T1: forecast 71, actual 25; LXB3B2WT9E0W F17 T1: forecast 77, actual 23.
- Vantom decisions with Slippery = 0: 29.6 vs 21.1.
- KD on Sloth turns: 45.5 vs 32.4. GG0Y0TJ2JXAR F33 T6 forecast 151 HP.
- Beast on Ringing turns (n=3-4): forecast 45.5 vs actual 11.8, and every one of those fights ended within 5 turns. Example: 4LC3YKCZV218 F17 T6, forecast 47, actual 4.
- Pessimistic "every line dies" rollouts push Jev and the HP guard toward block lines in boss fights: Vantom (53 fights, 9 deaths), KD (A8+ 13 deaths / 21), Beast.
- The temporary enemy Strength loss goes the other way: the rollout under-forecasts every later enemy attack by 7-15 per hit.

**Fix:** for simulated turns ≥ 1:
- reset per-turn player state (`maxPlays` = the per-turn cap or null, `intangible` false, Strength/Dex minus the temporary powers);
- carry each enemy's remaining Slippery/Artifact/Curl Up/Flutter out of the line's outcome instead of the base, as `enemyHpAfter` already does for Vulnerable and Weak;
- add the temporary loss back to enemy Strength after turn 0.

### 2. Rollout drops what enemy moves add besides damage, Strength, Block and Vigor — `bug`, severity HIGH (Soul Fysh, Aeonglass), MEDIUM elsewhere

**Mechanics:**
- `StatusCard` moves: 17 moves.
- Dazed per hit (`PERSONAL_HIVE`), Wounds per unblocked hit (`PAINFUL_STABS`), Withers (`WITHERING_PRESENCE`).
- Self-buffs other than Strength/Burrowed/Vigor: `INTANGIBLE_POWER` from Soul Fysh's Fade, `THORNS_POWER` from Spiny Toad, `PERSONAL_HIVE`, `VITAL_SPARK`, `SOAR`, `FLUTTER`, and enemy `DEXTERITY_POWER`.

**Where:** status cards were created in combat in about 800 fights:
- Dazed 247, Slimed 201, Toxic 73, Wound 63, Infection 59, Beckon 54, Frantic Escape 49, Soot 22, Burn 20, Wither 13.
- By source: Soul Fysh Beckon/Gaze (54 fights, 12 deaths, A8+ 24/5), Vantom Dismember (53), Myte Toxic (73), Phrog Infect (51), Chomper Screech (71), Mecha Knight Flamethrower (17), Aeonglass Wither (13 fights, 9 deaths), Eye With Teeth (47), Haunted Ship (55), Wriggler (60).
- Soul Fysh was Intangible (from Fade) on 93 of 577 turns.

**Components:**
- `rollout-live.ts:141-150` `enemyTable` keeps only damage, hits, `STRENGTH_POWER`, `block_gained`, `BURROWED`, `VIGOR` and 5 player debuffs.
- `rollout.ts:1013-1023` applies only those.
- No code adds cards to `piles` after an enemy turn. The rollout has no status-card handling at all; statuses already in the piles at the decision do cycle.
- `rollout.ts:1274` strips `wither` from later-turn solver inputs.
- The turn solver is fine: the held penalties of status cards in hand are modelled (`card-model.ts:268-273`) and the draw pile's statuses count.

**Observed cost:**
- Soul Fysh (64 decisions): rollout P(over ≤5) 0.39 vs actual 0.27; further loss 31.2 vs 38.2 (+7.0 per decision). Example: GG0Y0TJ2JXAR F17 T1, forecast 30, actual 49.
- Aeonglass: 58.3 vs 62.1.
- Beckons held at end of turn cost 476 HP over 71 turns (all versions); Toxic cost 510 HP over 109 turns. These were real losses the rollout never foresees for its later turns.

**Fix:**
- read `status_cards` (count) and the card id per move from the monster DB. The DB lacks the id; add it in `build-monster-db.py`. Push that many copies into draw/discard in `applyPlan`'s enemy turn.
- push `dazedAdded`, wounds and withers from the solver outcome into the piles;
- read `INTANGIBLE`/`THORNS`/`SOAR`/`FLUTTER` from `self_powers_gained` into the sim enemy (`intangibleTurns`, base flags);
- keep `wither` in later turns (it needs the running play count).

### 3. The 0.8 "unmodelled enemy power" damage cut — `bug`, severity MEDIUM-HIGH (frequent)

**Powers not in `MODELLED_ENEMY_POWERS`** (turns flagged, of 20,869; A8+ turns):

| Power | Enemy | Turns | A8+ turns |
|---|---|---|---|
| `RAVENOUS_POWER` | Corpse Slug | 764 | 428 |
| `SURPRISE_POWER` and `THIEVERY_POWER` | Gremlin Merc | 156 | — |
| `HEIST_POWER` | Fat Gremlin | 118 | — |
| `HATCH_POWER` | Tough Egg | 90 | — |
| `POSSESS_SPEED_POWER` / `DEXTERITY_POWER` / `POSSESS_STRENGTH_POWER` | The Forgotten / The Lost | 49 / 38 / 18 | — |
| `GALVANIC_POWER` | Globe Head | 35 | — |
| `MANGLE_POWER` (our card) | — | 21 | — |
| `DARK_SHACKLES_POWER` (our card) | — | 13 | — |
| `SHACKLING_POTION_POWER` (our potion) | — | 11 | — |
| `HIGH_VOLTAGE_POWER` | Zapbot | 6 | — |

The cut fired on 1,262 turns (6.0% of all turns).

**Components:**
- `combat-plan.ts:518` sets `unmodelled`;
- `turn-solver.ts:772` cuts every hit into that enemy to 80%. This also applies in rollout later turns through `laterTurnSim`.
- `card-model.ts:523-525` leaves `enemyTempStrengthLoss` out of `hasModelledEffect`. Dark Shackles is therefore tagged unknown and excluded from domination, even though the solver applies it (`turn-solver.ts:1232`).

**Observed cost:**
- Planned damage vs damage actually dealt, turn-start plan:
  - Corpse Slug fights: 1.195× (actual > plan in 65% of turns);
  - Gremlin Merc: 1.171× (68%);
  - other flagged fights: 1.199× (57%);
  - unflagged: hallway 1.033× (16%), elite 1.058×, boss 1.05×.
  - Since 09-27: 1.155× / 1.19× / 1.163× vs 1.035× unflagged.
- About 20 turns where the uncut damage would have been lethal and the fight went on (61 HP taken next turn), plus 29 where the kill happened anyway.
- Our own debuffs trigger the cut right after we spend a potion or rare card, often in boss fights (Insatiable, Vantom, Crab, Giant, Queen, Lagavulin). There were 6 deaths in the 11 Shackling Potion fights.

**Fix:**
- whitelist the powers with no combat numbers or whose effect is already in the intent: `THIEVERY`, `HEIST`, `SWIPE`-like, `MANGLE`, `DARK_SHACKLES`, `SHACKLING_POTION`, `POSSESS_*`, `GALVANIC`;
- model `RAVENOUS` (gap 8), `HATCH` (known summons) and `HIGH_VOLTAGE` (like Territorial ×2);
- add `enemyTempStrengthLoss > 0` to `hasModelledEffect`;
- replace the blanket 0.8 with "no cut, but tag the line" so a lethal is not hidden.

### 4. Enemy powers reach Jev as bare ids — `bug` (facts), severity MEDIUM

**Where:** 46 of the 62 enemy powers seen have no `POWER_NOTES` entry, including:
- `IMBALANCED` (230 fights), `PLATING` (187), `THORNS` (185), `HARD_TO_KILL` (184), `RAVENOUS` (182), `RITUAL` (151), `SLIPPERY` (106, the Vantom boss), `BURROWED` (96);
- `HATCH` (65), `SURPRISE` (62), `INFESTED` (51), `REATTACH` (49, elite), `PERSONAL_HIVE` (52, elite), `VITAL_SPARK` (44, elite), `PLOW` (38, boss), `TERRITORIAL` (54, elite).

There are no fight hints for Corpse Slug, Phrog Parasite, Gremlin Merc, Ovicopter or Vantom's Slippery (`jev-hints.json`).

**Components:**
- `combat-plan.ts:1778-1791` builds `enemies[].powers` as `id amount + POWER_NOTES[id]`.
- `narrow.ts:69-80` `describePowers` already appends the game description (`knowledge.power(id).description`), but only for the player's powers.

**Observed cost:** not measurable directly. Jev decides kill order and block vs race in exactly these fights; the Corpse Slug and Phrog notes in gaps 7-8 are the cases where the rule matters.

**Fix:** reuse `describePowers` for enemies, keeping `POWER_NOTES` as the extra line. For hidden triggers, add notes: Ravenous = "killing another enemy stuns it this turn and gives it +N Strength"; Infested/Surprise = "on death spawns …"; Hatch.

### 5. Rollout: enemy Strength growth from Ritual/Territorial/High Voltage is not simulated — `bug`, severity MEDIUM

**Where:**
- Damp Cultist Ritual 5 (63 fights), Calcified Cultist Ritual 2 (110), Devoted Sculptor Ritual 9 (38; Savage 12, 21, 30, 39, 48, 57 at A8);
- Byrdonis Territorial +1 on every turn (54, elite);
- Zapbot High Voltage +2 (9).

**Components:** `rollout-live.ts:148` reads Strength only from `self_powers_gained` of Buff moves. The monster DB records deltas only for Buff/Debuff/Defend moves, so Ritual's gain on attack turns is lost. `moveAttack` (`rollout.ts:752-758`) uses base damage + frozen `e.strength`. No per-turn power growth exists in `applyPlan`.

**Observed cost:**
- Cultist pair (32 decisions): rollout further loss 5.9 vs actual 13.6; P(over ≤5) 0.93 vs 0.81.
- Byrdonis: 0.98 vs 0.81, T2 loss under-forecast +1.95 per turn.
- Damp Cultist T2: +1.29 per turn.

**Fix:** after each simulated enemy turn, add `RITUAL_POWER`, `TERRITORIAL_POWER` and 2× `HIGH_VOLTAGE_POWER` to `e.strength`. Also let a Buff move's `RITUAL_POWER` gain set that power.

### 6. Knowledge Demon in the rollout: heals and card/energy curses — `bug`, severity MEDIUM

**Where:** KD fights: 44 fights, A8+ 21 fights / 13 deaths.
- Ponder heals: 68 heals, 1,850 HP (~27 each) in 40 fights.
- Mind Rot 39 fights, Waste Away 19, Sloth 38, Disintegration 8.

**Components:**
- the rollout has no heal at all;
- the hand is always 5 cards (`rollout.ts:1122`) and energy is `max_en` (`rollout.ts:1240`), so Mind Rot and Waste Away are ignored;
- curses applied on T5 and T9 are never added (`PLAYER_DEBUFFS`, `rollout.ts:368`).

The boss clock does cover these: +60 HP (`boss-clock.ts:516-520`) and Sloth/Mind Rot (`boss-clock.ts:462-468`). The solver handles Sloth/Disintegration now. Jev only gets the `kd-long-fight` hint ("heals 30").

**Observed cost:** the rollout is pessimistic overall on KD (58.1 vs 43.6, because of gap 1's Sloth freeze), so the missing heal is masked. Turns-to-win are optimistic by about 2 × 27 HP of boss HP per fight.

**Fix:**
- record the heal amount per move in the monster DB and apply it in `applyPlan`;
- derive `handSize` from `MIND_ROT_POWER` (and Pael's Blood, see gap 12) and energy from `WASTE_AWAY_POWER`;
- apply the chosen curse from `CURSE_OF_KNOWLEDGE_MOVE` using the selection.ts order.

### 7. On-death spawns counted as a fight win (Phrog Parasite, Gremlin Merc) and other summons — `bug`, severity MEDIUM-LOW

**Where:**

| Encounter | Spawn | Fights | Runs | A8+ fights |
|---|---|---|---|---|
| Phrog Parasite | `INFESTED_POWER` → 4 Wrigglers | 51 | 51 | 18 |
| Gremlin Merc | `SURPRISE_POWER` → Fat + Sneaky Gremlin | 60 | 60 | 31 |
| Living Fog | Gas Bomb | 50 | — | — |
| Fogmog | Eye With Teeth | 47 | — | — |
| Fabricator | bots | 13 | — | — |
| Two-Tailed Rat | backup | 51 | — | — |

Obscura and Ovicopter are already known (see the end of this note).

**Components:**
- `turn-solver.ts:1612` `winsFight` is true once every current enemy is dead. It ignores `INFESTED`, which is whitelisted with no effect at `combat-plan.ts:59`, and `SURPRISE`, which gets the cut.
- `combat-plan.ts:1463-1467` auto-plays that as `combat/lethal` without asking.
- `describePlan` tells Jev "wins the fight this turn" (`combat-plan.ts:632-633`).
- The rollout counts it as won.

**Observed cost:**
- False lethals: 48 Phrog turns and 47 Gremlin turns (all dates, still occurring 09-28/29: 7MG7E5EYETA6 F8 T3, W8JDDTMSYA6T F13 T3, RUUBXYZV5064 F8 T2).
- Direct HP cost is small, because the spawns do not attack on arrival: 45 HP over 48 Phrog turns, 2 HP over 47 Gremlin turns.
- The rollout forecast is badly wrong on Phrog (15 decisions): P(over ≤5) 0.95 vs 0.47, further loss 11.5 vs 29.2. Example: 4LC3YKCZV218 F9 T3, forecast 0, actual 23.
- A potion lethal on a false win would be shown as "WINS THE FIGHT THIS TURN, spending …".

**Fix:** treat `INFESTED` and `SURPRISE` like `revives`: a kill, not a win. Spawn the DB's summoned enemies in the rollout on death, with their first move.

### 8. Corpse Slug `RAVENOUS_POWER`: stun and Strength on an ally's death — `bug`, severity MEDIUM-LOW

**Where:** 182 fights / 140 runs / A8+ 104. It is the single most common hallway encounter (2 or 3 slugs). Ravenous amount 4, and 5 at A9. Slugs gained Strength in 179 of the 182 fights.

**Components:**
- The solver does not know that killing one slug cancels the other slugs' attacks this turn. The intents update after the kill, so re-plans recover it, but the line that makes the kill is under-valued. There were 21 turns with over-predicted loss, −138 HP in all; 3 of them since 09-27.
- The rollout never adds the +4/5 Strength. WHIP_SLAP T2 loss is under-forecast by +4.9 per turn.
- The 0.8 cut applies to every slug (gap 3).

**Observed cost:** slug fights are cheap (10.8 HP average, excess +0.8, 1 death), so this is mostly wasted damage and extra turns.

**Fix:** in `hitEnemy`/`killEnemy`, when a Ravenous enemy survives an ally's death, drop its attacks for this turn and add +amount Strength in the rollout. Also give Jev a note (gap 4).

### 9. Rollout: enemy Plating and Rampart block are not re-applied in later turns — `bug`, severity MEDIUM-LOW

**Where:**
- Plating: 187 fights / 142 runs / A8+ 86 / 31 deaths, excess +7.1 HP. Slumbering Beetle 15 (69 fights, excess +11.3, 11 deaths), Lagavulin Matriarch 12 (boss, 46 fights), Frog Knight 15, Sewer Clam 8 (decays), Mysterious Knight 6.
- Rampart (Turret Operator 25 block at our turn start): 40 fights.

**Components:** `rollout.ts:1021` sets enemy block to the move's `block_gained` only. Enemy Plating is read nowhere in the rollout; it is modelled for the player only (`rollout.ts:703-706`). The solver is fine, because the block is already on the board.

**Observed cost:** Sewer Clam P(over ≤5) 1.00 vs actual 0.80; Frog Knight 0.79 vs 0.67. Matriarch and the Beetle are mostly asleep while Plating lasts, so the effect is smaller there.

**Fix:** at the end of each simulated enemy turn, block += `PLATING_POWER` (−1 per turn) and `RAMPART` (for its target).

### 10. Rollout: our debuffs from enemy moves beyond Vulnerable/Weak/Frail/Str/Dex — `bug`, severity MEDIUM-LOW

**Mechanics and where:**
- `TENDER_POWER`: Hunter Killer, 72 fights / A8+ 37, excess +5.5. The rollout sets `tender: 0` at `rollout.ts:1254`.
- `SMOGGY` (Living Fog, 51), `TANGLED` (Vine Shambler, 36), `CHAINS_OF_BINDING` (Queen, 15; 10 deaths), `HEX`/`DAMPEN` (Knights, 15).
- `SHRINK` on us (Shrinker Beetle, 135): T2 loss under-forecast by +2.05 per turn.
- `RINGING`/`SLOTH`/`DISINTEGRATION`/`CONSTRICT` when applied after the decision.
- `MIND_ROT`/`WASTE_AWAY`: see gap 6.

**Components:** `PLAYER_DEBUFFS` at `rollout.ts:368` and `rollout-live.ts:122-131`.

**Fix:** extend `PLAYER_DEBUFFS` and map each debuff onto `PlayerSim` fields that already exist (`tender`, `maxPlays` as a per-turn cap, `endTurnHpLoss`, `shrunk`). Add a skill cap for Smoggy (see gap 14).

### 11. Theft enemies escape with our gold or card; code gives killing them no value — `bug` (value model) + `strategy`, severity MEDIUM-LOW

**Where:**
- Gremlin Merc fights: 35 of 62 ended with an `end_turn` while the Fat Gremlin fled carrying its `HEIST_POWER` gold. That is 1,455 gold in total, about 42 per fight, in 35 runs (20 at A8+). Examples: Y0CWCD0C03FL F11 (60g), WCC7RMRLWLZK F12 (40g).
- Thieving Hopper (`SWIPE`/`ESCAPE_ARTIST`, 113 fights): it left with a stolen deck card in about 11 fights (SCBC3F0QT8BC F19, XMY29WWQDC1Y F19, RA3QYBLN7RJF F20, 4LC3YKCZV218 F21, 8V0HD9Y207WY F19).

**Components:** the solver has no gold or card value. `HEIST` gets the 0.8 cut. `SWIPE` and `ESCAPE_ARTIST` are whitelisted with no effect (`combat-plan.ts:58-60`). No `POWER_NOTES` entry.

**Fix / for Roy:** add a kill bonus (gold/25, or the stolen card's value) while an enemy has `HEIST`/`SWIPE` and shows `FLEE`/`ESCAPE`, and tell Jev. The Fat Gremlin has 14-17 HP and arrives stunned for one turn.

### 12. Relic triggers and our own in-combat powers not read — `bug`, severity LOW-MEDIUM

**Relics** (fights held):
- Happy Flower 321, Pael's Blood (+1 draw every turn) 194, Pael's Tears 161, Centennial Puzzle 200.
- Letter Opener 115, Parrying Shield 108, Pen Nib 105, Ornamental Fan 103, Pendulum 99, Candelabra 99, Nunchaku 88, Tuning Fork 86, Orichalcum 83.
- Gremlin Horn 72, Shuriken 64, Ripple Basin 56, Kunai 55, Ice Cream 52, Sai 48, Sturdy Clamp 47, Mr Struggles 47.
- Paper Phrog 46 (Vulnerable ×1.75; the solver uses 1.5 at `turn-solver.ts:765`), Stone Calendar 45, Lizard Tail 38, Tungsten Rod 37, Joss Paper 34, Cloak Clasp 32, Art of War 27, Rainbow Ring 26, …
- About 41 in-combat relics in total are not referenced in combat-plan.ts, turn-solver.ts or rollout.ts.

**Our powers:**
- `ONE_TWO_PUNCH_POWER` (next attack played twice; `DUPLICATION` is read, this is not);
- `HELLRAISER` (35 fights), `DARK_EMBRACE` (21), `JUGGLING` (19), `VICIOUS` (18), `STAMPEDE` (14), `PANACHE`, `ROLLING_BOULDER`, `REBOUND`, `FASTEN`;
- for the rollout: next-turn `DRAW_CARDS/ENERGY/BLOCK_NEXT_TURN`, `TORIC_TOUGHNESS`, `SELF_FORMING_CLAY`, `CLARITY`, `RETAIN_HAND`.

**Observed cost:** each relic or power is too rare to measure alone. End-of-turn block relics make the solver predict losses that do not happen (Orichalcum, Cloak Clasp, Ripple Basin). Draw relics make the rollout pessimistic.

**Fix:**
- `ONE_TWO_PUNCH_POWER` → an attack-only `duplicate`;
- Paper Phrog → a Vulnerable multiplier;
- Pael's Blood → rollout `handSize` 6; Happy Flower → +1 energy every 3rd simulated turn;
- block-at-end-of-turn relics → `endTurnBlock`.

### 13. Unmodelled cards (flat 3 + 2×cost nudge) — `bug`, severity LOW-MEDIUM

**Where** (fights with the card in the deck, A8+ in brackets):
- Infernal Blade 90 (57), Stoke 50 (27), One-Two Punch 46 (31; see gap 12 for its power), Rage 27 (10), Cascade 27 (24), Havoc 20 (10);
- Dark Shackles 18 (14; actually modelled, see gap 3), Discovery 18 (10), Apotheosis 13, Not Yet 12 (12, heals 10), Secret Weapon 6, Enlightenment 4, Scrawl 3, Secret Technique 2, Anointed 1;
- Primal Force 57 (A0-7 only).

Across the logs, options were shown with `unmodelled_cards` 419 times.

**Components:**
- `card-model.ts:523-540`: `known=false` → `turn-solver.ts:999` unknown list;
- `dominates` refuses these lines (`turn-solver.ts:2177`).

**Fix:**
- Not Yet: heal (`special: "heal"` with the Heal var);
- Rage: the card's `Power` var → `rage` for the rest of the turn;
- One-Two Punch: `duplicate_next`, attack only;
- Infernal Blade / Discovery: use the random-card potion MC path (`CHOICE_POTIONS`), which already exists for potions.

### 14. Smoggy: one Skill per turn is not a solver constraint — `bug`, severity LOW

**Where:** Living Fog, 51 fights / A8+ 24. Cheap fights (10.5 HP, 0 deaths).

**Components:** `playCap` (`combat-plan.ts:2164`) knows Sloth and Ringing only. The solver plans 2+ Skills and re-plans after the game refuses the second.

**Fix:** add a per-type cap (`maxSkills`) to `PlayerSim`.

### 15. Rollout later turns lose one-shot enemy triggers: Shriek/Plow, Imbalanced — `bug`, severity LOW-MEDIUM

**Where:** Ceremonial Beast Plow at 150 (38 fights, A8+ 22, 3 deaths); Terror Eel Shriek (58); Bowlbug Rock Imbalanced (230).

**Components:** `laterTurnSim` drops `shriek` and `imbalanced` (`rollout.ts:1094`). Only the decision turn's Shriek is applied (`rollout.ts:955-961`).

**Observed cost:** the rollout is strongly pessimistic on the Beast even without Ringing: 47.0 vs 17.7 further loss; P(over ≤5) 0.38 vs 0.41. Part of that is gap 1 on Ringing turns. The Eel is near neutral.

**Fix:** keep `shriek` in later turns until it has triggered (track it on `SimEnemy`).

### 16. Revive items: the solver and rollout call HP 0 a death — `bug`, severity LOW

**Where:** Fairy in a Bottle was held in 66 fights and used 5 times; Lizard Tail was held in 38 fights.

**Components:** there is no Fairy or Lizard Tail handling in any combat file. The "every line dies" `combat/least-loss` path fired 28 times while one was available.

**Fix:** when a revive is available, set `dies` to false and put `hpAfter` at the revive value (30% or 50% of max), with a cost.

### 17. Unmodelled potions — `bug`, severity LOW

**Where:**

| Potion | Fights held | Uses |
|---|---|---|
| Liquid Bronze (Thorns 3) | 102 | 23 |
| Stable Serum (retain hand for 2 turns) | 87 | 20 |
| Entropic Brew | 51 | 8 |

**Components:** not in `POTION_EFFECTS` (`card-model.ts:612`). They are offered as "drink first: effect not simulated, then re-plan" lines (Liquid Bronze 9 times on 09-28 alone).

**Fix:** Liquid Bronze → `retaliate` +3 for the fight. Stable Serum → keep the hand in the rollout, and a flat value in the solver.

---

## Already known (not re-ranked), with the numbers seen today

- **Summons, Obscura (Parafright) and Ovicopter eggs:** 73 + 65 fights. The rollout was optimistic:
  - Obscura: P(over ≤5) 0.80 vs 0.61; loss 15.4 vs 20.1; T2 +5.6 per turn;
  - Ovicopter: T2 +3.1 per turn.
- **Waterfall Giant:** the rollout is calibrated on P(over) (0.16 vs 0.16) but pessimistic on loss (45.4 vs 39.5).
- **Kaiser Crab facing:** the rollout is pessimistic (53.6 vs 43.1).
- **Player Artifact vs enemy debuffs, and the Siphon heal constant:** the logs agree. Siphon heals 15 at A8/A9.

## Appendix: coverage by mechanic (S = turn solver, R = rollout, B = boss clock, J = facts to Jev)

Legend:
- ✓ = modelled;
- w = whitelisted as "no effect this turn";
- f = frozen at the decision value in later turns;
- c = hits the 0.8 cut;
- – = not modelled;
- n/a = not relevant.

**Enemy powers (fights):**
- `VULNERABLE` 3545, `WEAK` 749, `STRENGTH` 2461: S✓ R✓ (a temporary loss is f, gap 1) J none.
- `MINION` 313: S✓ R✓. `IMBALANCED` 230: S✓ R– (dropped). `ARTIFACT` 204: S✓ R f J✓. `PLATING` 187: S✓ R– (gap 9).
- `THORNS` 185: S✓ R✓ (carried; not gained from moves). `HARD_TO_KILL` 184: S✓ R✓. `RAVENOUS` 182: S c R–. `RITUAL` 151: S w (scaling weight) R– (gap 5).
- `ILLUSION` 120: S✓ R✓. `ESCAPE_ARTIST` 113 and `SWIPE` 112: S w, no value (gap 11). `SLIPPERY` 106: S✓ R f. `FLUTTER` 97: S✓ R f. `BURROWED` 96: S✓ R✓.
- `SLUMBER` 69, `ASLEEP` 46: S✓ R via moves. `HATCH` 65: S c R– (known summons). `CURL_UP` 63: S✓ R f. `INTANGIBLE` 62: S✓ R✓ (not gained from Fade, gap 2).
- `SURPRISE` 62: S c, win (gap 7) R–. `THIEVERY` 62 and `HEIST` 59: S c, no value.
- `SUCK` 60, `SLOW` 59, `SKITTISH` 58: S✓. `SHRIEK` 58: S✓ R turn 0 only. `STEAM_ERUPTION` 58: S✓ R constant (known). `TERRITORIAL` 54: S w R– (gap 5).
- `BACK_ATTACK_L/R` 54: S✓ R– (facing, known). `CRAB_RAGE` 54: S✓ R✓. `HARDENED_SHELL` 52 and `PERSONAL_HIVE` 52: S✓ R✓ (Dazed not added, gap 2).
- `INFESTED` 51: S w, win (gap 7) R–. `VIGOR` 51: S✓ R✓. `SANDPIT` 49: S✓ R✓. `REATTACH` 49: S✓ R✓. `PAPER_CUTS` 45: S✓.
- `VITAL_SPARK` 44: S✓ R✓ (not gained from moves). `RAMPART` 40: S w R– (gap 9). `PLOW` 38: S✓ R turn 0 only.
- `MANGLE` 20, `DARK_SHACKLES` 13, `SHACKLING_POTION` 11: S c R f (gaps 1, 3). `DEMISE` 20: S✓ R✓. `STOCK` 17: S✓ R✓.
- `WITHERING_PRESENCE` 13: S✓ R– (stripped). `ADAPTABLE`/`ENRAGE`/`PAINFUL_STABS` 12: S✓ R✓ (Wounds not added). `SOAR` 12: S✓ R f.
- `POSSESS_STRENGTH`/`POSSESS_SPEED`/enemy `DEXTERITY` 11: S c R–. `BATTLEWORN_DUMMY_TIME_LIMIT` 11: S✓ R✓. `GALVANIC` 10: S c. `HIGH_VOLTAGE` 9: S c R–. `SHRINK` 9: S✓ R f. `NEMESIS` 8: S✓ R✓.
- J: only the 16 `POWER_NOTES` powers carry any explanation (gap 4).

**Our powers put by enemies:**
- `WEAK`/`VULNERABLE`/`FRAIL`/`STRENGTH-`/`DEXTERITY-`: S✓ R✓.
- `TENDER` 72: S✓ R– (zeroed). `SMOGGY` 51: S– R–. `CONSTRICT` 42: S✓ R f/–. `MIND_ROT` 39: S n/a R– B✓. `SLOTH` 38: S✓ R f B✓. `RINGING` 37: S✓ R f B✓.
- `TANGLED` 36: S✓ (shown cost) R–. `WASTE_AWAY` 19: S n/a R–. `CHAINS_OF_BINDING` 15: S✓ (soulbound) R–. `HEX`/`DAMPEN` 15/14: S✓ (shown) R–.
- `DISINTEGRATION` 8: S✓ R f/–. `SURROUNDED` 54: S✓ R– (known). `SHRINK` 135: S✓ R f/–. `TAINTED` 44: S✓ R f.

**Enemy move effects:**
- Summon (8 moves): S intent 0; R– (Obscura/Ovicopter known).
- Heal (7 moves): R✓ for reattach, illusion revive and phases; R– for KD Ponder and Giant Siphon. B✓ for KD +60 and Siphon.
- StatusCard (17 moves): S✓ once the card is in hand or pile; R– (gap 2). B: Soul Fysh 0.82 factor only.
- Self-buffs: STRENGTH, BURROWED, VIGOR R✓; STEAM_ERUPTION constant; NEMESIS and SANDPIT handled; RITUAL, INTANGIBLE, THORNS, PERSONAL_HIVE, VITAL_SPARK, SOAR, FLUTTER, DEXTERITY R–.
- Escape (2 moves): no value (gap 11).
- Defend `block_gained`: R✓ (mode per move).

**Potions:** 46 of 51 modelled. Liquid Bronze, Stable Serum, Entropic Brew and Fairy in a Bottle are unmodelled; Fruit Juice is not modelled but is auto-drunk, so it needs no model.

**Cards:** 17 ids unknown to `card-model` (gap 13), plus Dark Shackles tagged unknown although it is applied.
