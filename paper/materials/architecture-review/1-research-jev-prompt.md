Bucket counts are approximate: I counted rule families and read the files, but did not audit every line. All paths below are relative to `/home/dw/Projects/sts2-jev/jev-sts2/src`. Run ids refer to `notes/lessons.md`.

**CLASSIFICATION**
| Bucket | Size | Representative examples |
|---|---|---|
| A. Mechanics / game rules | about 90 items: 16 power notes, 19 card specials, about 25 potion models, 30+ enemy powers in the solver | power notes for Sandpit, Crab Rage, Stock, Illusion and Withering (`screens/combat-plan.ts:50-67`); Sandpit death check (`strategy/turn-solver.ts:986`); Crab Rage +99 block / +6 Strength (`strategy/turn-solver.ts:552,997`); Beckon counted as HP loss that block does not stop (`strategy/turn-solver.ts:952`); potion effects (`strategy/card-model.ts:331-360`); Frantic Escape adds to Sandpit (`strategy/card-model.ts:160`); Evil Eye doubles with Baking Gloves, Fiddle zeroes draw, Vigor is spent by the first attack (`screens/combat-plan.ts:491-505`) |
| B. Safety guards | about 12 | HP guard, slack max(4, 10% HP), fight budget 12 (`screens/combat-plan.ts:100-118`); never Gambit (`strategy/card-model.ts:291`, `screens/selection.ts:416`); never drink Foul Potion (`screens/combat-plan.ts:592`); do not end the turn when the mod says it is lethal (`screens/combat-plan.ts:704`); Sandpit and sleeper hard filters (`screens/combat-plan.ts:416,465`); event HP guard (`screens/event.ts:23-46`); least-loss line when every line dies; skip-reward loop and full-potion-slot guards (`screens/reward.ts`) |
| C. Context-free heuristics | about 10 | Fruit Juice drunk at once (`screens/combat-plan.ts:595`); heal before the boss below 85% and before a forced elite (`screens/rest.ts:31-36`); discard junk potions at the shop; remove order curse > Strike > Defend (`screens/selection.ts:317`); code makes the most expensive card free (`screens/selection.ts:379`); potions become free when every line costs 30% or more of HP (`screens/combat-plan.ts:643-652`) |
| D. Contextual strategy as rules | about 25 families, about 150 numbers | card tier table of about 110 cards plus skip bar 50 (`strategy/card-value.ts:16-41`); need bonuses +12/+14/+5/+10/+5 (`strategy/card-value.ts:158-181`); boss bonuses for 7 bosses (`strategy/card-value.ts:69-103`); relic synergy +25 (`:189`); bloat past 22 cards (`:213`); shop scores `value-62-cost/25`, relic `18-cost/40`, removal 30/8 (`screens/shop.ts:130,184-186`); map elite gates by floor and HP 0.8/0.7 (`screens/map.ts:67-75`), shop weight (`:103`), fight cost by act (`:110`), low-HP urgency (`:245`); rest scores (`screens/rest.ts:33`); Knowledge Demon curse order and `curseRank` margins 20/25 (`screens/selection.ts:186-220`); upgrade priority list (`:228`); minimum 4 attacks kept in a fight (`:234`); potion costs 4/5/15, save factor 0.6, 1 potion per turn in boss fights, "pressed" below 40% (`screens/combat-plan.ts:69-72,603-607`); solver weights for damage 0.8/0.7/0.45 and the HP curve (`strategy/turn-solver.ts:919`); power values (`strategy/card-model.ts:127`); close-call gap 6 and the code margins per screen (card 6, shop 10, rest 3, map 2.5), which decide who gets the question |

**Overfitting suspects in D (rule, source runs)**
- **Boss card bonuses**, each from 1-2 runs: Soul Fysh (XPA4; Battle Trance -10), Matriarch (1K5G, Z2H3), Vantom and Knowledge Demon (no single run cited). These are the most rigid-playbook-like rules.
- **Single-run card retunes:** Breakthrough 54→62 (1K5G F14), Dark Embrace needing 3+ exhaust cards (Z2H3), Baking Gloves +25 (one live run), Armaments 48 (WX16, BG4W). Inflame 68→74 is backed by win/loss statistics, so it is less suspect.
- **Event limits:** max-HP limit 8 (1K5G F8); floor 1-3 HP share 20% (6A36 F1, one run).
- **Map:** optional elite only above 80% HP (UJS25, G8AQ); pre-boss elite above 0.8 (BG4W); Act 1 late-shop +3 at 300 gold (8LQG, G6YV); `monsterWeight` below 50%/35% (MD3F only). Fight-chain penalty has 3 runs behind it (QE4K, XJWF, MD3F), so it is the most robust of these.
- **Knowledge Demon curses:** order plus the `outlastsHp` formula (DG1, VKPX, PU21). This is boss-specific with made-up margins, but it is closer to mechanics than taste.
- **Potions:** boss cost 4 and 1 per turn (1R3C, one run); pressed below 40% (7Q5G, Y83U).
- **Combat keep-attacks and exhaust:** keep at least 4 attacks (6A36, one run); exhaust uses next turn's expected hit (U6W7).
- **Deck size and rest thresholds:** bloat starts at 22 (0NG); rest heal below 0.85 before a boss (runs 2, 5, 6).
- **Conflict:** the HP guard (B) was tightened after Z2H3, but JEGBU7 died because Jev kept swapping out the scaling-power lines for ones that lost fewer HP. The guard and the power values pull against each other.

**Who decides what now** (`logs/decisions.jsonl`, last 15 runs, 5,686 decisions; overall code 80.9%, Jev 9.4%, DeepSeek 8.6%, code fallback 1.1%)
| Label | Count | Split |
|---|---|---|
| combat/plan, plan-continue, lethal, least-loss, end_turn | 2,778 | code 100% (clear margin ≥6 or forced) |
| combat/plan-choice | 436 | Jev 64%, DeepSeek 21%, code fallback 14% |
| combat/plan-choice+potion | 351 | DeepSeek 64%, Jev 36% |
| reward/card | 200 | code 74% (125 by the margin-6 rule, 23 all below the skip bar), DeepSeek 20%, Jev 6% |
| shop/buy | 97 | code 51% (22 forced leaves, 18 removals), DeepSeek 45%, Jev 4% |
| selection/upgrade | 31 | code 65%, DeepSeek 32%, Jev 3% |
| selection/remove, selection/exhaust | 23 / 52 | code 100% |
| selection/add | 32 | code 72%, DeepSeek 19%, Jev 9% |
| map/route | 401 | code 81% (231 of 324 had only one option, 93 by margin), Jev 18%, DeepSeek 1% |
| rest/choose | 63 | code 86%, Jev 13%, DeepSeek 2% |
| event/choose | 71 | DeepSeek 77%, Jev 23% (code only filters options) |

- **Deck building is mostly code today, not DeepSeek.** The tier table plus the per-screen code margins is the real deck builder. The skip-bar filter and "only one option" cases also hide choices from both models.
- **In combat, Jev and DeepSeek only see the close calls,** about 22% of combat plan decisions. Everything else is code.
- **Key numbers** (873 escalated turns, extra HP lost vs the min-loss line): code rank1 3.67, Jev 2.59, DeepSeek 3.12, after the HP guard 1.88. Jev alone 1.61 vs code rank1 2.13. DeepSeek overriding Jev cost +1.7 HP for +0.4 damage. Both wins' decisive builds came mostly from DeepSeek overriding Jev. 34 of 45 losses were mainly code bugs or unmodelled mechanics.

**Can Jev get our accumulated experience through its prompt?**
- Yes, but only as data. The call is `systemOne({model, state, questions})` (`jev/client.ts:191-199`) and has no system-prompt field. Experience has to go into the `state` JSON or into the question's instructions and criteria.
- This already works on a small scale: power notes and the reward `note` are prose hints in `state`.
- The DeepSeek guide plus handbook is about 29 KB (roughly 8-9k tokens), against Jev's current ~840 input tokens, so sending all of it is not practical.
- What fits is 3-6 retrieved hints of about 200 tokens, keyed by boss, enemy, relic and screen. Most bucket-D boss and relic rules could move into those hints instead of fixed score bonuses.
- Whether Jev actually weighs prose hints is untested; an A/B run is needed before relying on it.