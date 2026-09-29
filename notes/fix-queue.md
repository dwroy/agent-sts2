# Fix queue (pure bugs waiting for the next batch on step1-bugfix)

## PRIORITY (regression, fix first)
- Thrash (batch B f0c5d1a): turn-solver.ts thrashAbsorb (~:1373-1392, called ~:1265 at ea6ca1c; step1-bugfix ~:1388/:1280) adds the exhausted attack's damage to the Thrash play itself; in the game Thrash hits for its printed number and the absorbed damage applies to LATER Thrash plays that fight (all 12 Thrash plays in 3SBP). Caused a false lethal at 3SBP F12 T2 (Byrdonis survived at 17, hit 15, Defend left in hand) and inflated Vantom T7 (26 predicted, 12 actual). Also carry the absorbed damage across later turns in the rollout (batch B note: TTVY's Thrash had base 17).


**Batch C (step1-bugfix a649307, merged into v3 54d6d9e at 16:45) fixed every item listed below up to and including the X7LU/XTB4/2XWM/7XK6 and KY3Y/9Q7V/XMK1/PHMV/YQL8 sections (commits ef5eb16…a649307; ops/report.py fight splitting too). Open items start at "From the route-review work".**

From post-mortems W2TB U6RU VBHZ ZY39 0H1X (2026-09-29 14:50):
- Shop card options and shop_stock don't show energy cost (card rewards do, reward.ts:62) — U6RU F22 read PRODUCTION as 1-cost. shop.ts ~:117, :148-153 at HEAD.
- Removal value counts Eternal cards (basics ≥4 / any curse; Ascender's Bane is an Eternal curse at A5+) and the explanation text says so — U6RU F22, VBHZ F23. shop.ts ~:98, :165-166.
- DeepSeek replies that fail to parse are never logged: parse before logReasoning; askJson loses usage too (VBHZ F17 act plan empty reply 48 s; 0H1X F13 half JSON recovered but no reasoning row). deepseek.ts ~:420-423, :307-312, :404-408; loop.ts ~:1450.
- Knowledge contradiction: experience hallway:THE_OBSCURA (experience.json:1667, kill the Parafright when it attacks) vs jev-hints obscura-summoner (jev-hints.json:114-118, attack the Obscura); ZY39 killed the reviving Parafright six times, Obscura took 0 on T3–T5, T8.
(Sent to batch B instead: saturated rollout tie-break sums minion HP, not leader-aware — W2TB.)

From post-mortems X7LU XTB4 2XWM 7XK6 (2026-09-29 15:05; first runs on one-shot code 0c93138):
- One-shot shop: stockDrift (shop.ts ~:396-404, lines 402-403) treats a restock of a slot the plan already bought as the shop changing → with The Courier every purchase re-asks the whole plan (7XK6: 7 re-asks in 3 shops, shop plans 47% of its DeepSeek time; baskets changed between re-asks).
- act-start.ts:63 revealsLater regex reads Choices Paradox's per-fight "choose 1 of 5" as an outcome revealed later → unneeded route review (7XK6 F34).
- event.ts ~:194-210: event options that name a relic carry no effect text (7XK6 F44 Royal Poison taken as if a curse card; 4 HP each fight).
- ops/report.py ~:150-154: the auto run notes end a fight at any non-combat row, so Toasty Mittens exhaust picks and potion card picks split fights into per-turn "−0" rows (2XWM from F19, 7XK6 F42/F48).
- Not new: boss-clock Soul Fysh flat 0.82 discount (deck dealt 0.35 of the estimate in XTB4, repeats VG7H) — derive from logs; rollout time-budget fallback to a one-turn estimate shows every line losing all HP (X7LU elite T1) — label it as a fallback, not a forecast.
- Boss notes omit that Soul Fysh's Scream puts Vulnerable on us (De-Gas hits 27) (XTB4).
(Sent to batch B instead: enemyHpOf ignores unreached boss phases — 7XK6 Test Subject.)
Observation for Dai: one-shot act-start plans take 139–166 s with 26–32k output tokens (DeepSeek effort max).

From post-mortems KY3Y 9Q7V XMK1 PHMV YQL8 (2026-09-29 15:15):
- combat-plan.ts pendingDrinks (f4dc1bc :933-935, :1200-1210; HEAD :970-972, :1249): potion steps of Jev's line are drunk after a draw card cut the line short and the rest was dropped — no re-evaluation (side effect of 1470fdd V1MF fix). XMK1 T3 Blood Potion at 76/87 (6 HP wasted = the margin it died by) + 4 hallway drinks.
- combat-plan.ts commit() (f4dc1bc :928-940; HEAD :965-978): a finished Jev line is not "stop here" — memo only stored when >1 step remains, so code re-plans from scratch and auto-played the "only distinct line" Jev had rejected (9Q7V T14 Sword Boomerang + One-Two Punch killed the Giant → explosion 6 short). Also :1119 doesn't read ONE_TWO_PUNCH_POWER; turn-solver dominance vector (:2143-2157) has no Giant-explosion axis.
- selection.ts (:153, :169-170, :566) Frantic Escape can be exhausted while the Sandpit is the deadline (PLANNED_CARD_KEEP 150 outweighs it); leastLossPlan (:2048-2059) ignores Sandpit ≤1; guardSandpit (:987-998) only intercepts end-turn (KY3Y T9).
- enchant-text.ts:51/:66 regexes need a colon right after 附魔 → "附魔一张攻击牌：活力8" gets no effect text (PHMV).
- selection.ts:172/:263 enchant screen shows a removal-style "upgraded −8" ranking labelled code's ranking (PHMV; DeepSeek spent 233 s on it).
- rollout.ts (f4dc1bc :1099; HEAD :1491) Giant husk not detected on the blast turn (needs eruption > 0; the power is gone) → simulates a ~1e9-HP live enemy (YQL8, 9Q7V).
- consistency.ts:163 flags an answer inconsistent when the reasoning's conclusion is ambiguous → needless re-ask (XMK1).
- ops/report.py :147-168 splits a fight at every mid-fight CARD_SELECTION (same as the 2XWM note above).
- Evidence for Dai (clock, strategy-adjacent): boss clock at A9 optimistic — damage delivered 0.66 (KY3Y) / 0.76 (9Q7V) of the estimate; XMK1 predicted 8.4 loss/turn, 10 turns vs ~17/turn, 6 turns — the pooled unblocked share (boss-clock.ts:125-135) ignores the deck's block density.

From the route-review work (2026-09-29 17:00):
- ~~When the consistency check re-asks DeepSeek, the second answer is only {choice, reason}, so the route review is lost ("the answer has no route") — include the route block and field in the re-ask.~~ fixed adb9ec9 (batch D, v3 cf87de6)
- ~~rest/choose (step-by-step fallback when the one-shot rest plan is unusable) has no route block.~~ fixed 8ee27fb (batch D, v3 cf87de6)
- ~~hp_if_option assumes a 30% heal; relics that change the rest heal are not modelled.~~ fixed 981ae07 (batch D, v3 cf87de6)

From batch C (2026-09-29 16:50), not fixed:
- ~~A potion step in the middle of a Jev line always forces a re-plan: the line memo expects the hand to shrink after each step, a potion doesn't leave the hand → "grown" hand. Of 178 logged Jev lines starting with a potion, 7 continued, 93 were re-asked to Jev.~~ fixed a38c85c, 85d8354 (batch D, v3 cf87de6)
- ~~One-Two Punch and Unrelenting are not modelled in hand (only as powers after being played) — Jev's options understate them.~~ fixed 3d8a9b1 (batch D, v3 cf87de6)
- ~~The solver still counts damage into the Waterfall Giant husk on the blast turn ("dmg 88") — mostly cosmetic.~~ fixed 3932ec9 (batch D, v3 cf87de6)
Evidence for Dai: Soul Fysh clock factor fitted — A8 (n=20) median realised/estimate 0.86, A9 (n=8) 1.09 (XTB4 0.37 an outlier) → left unchanged.

From post-mortems 0NZB 2ZCK 7KDM 3SBP (2026-09-29 16:55):
- combat-plan.ts reads player.cards_exhausted_this_turn (2e92460 :1118; step1-bugfix ~:1176), a field that never appears in states.jsonl → after an exhaust + re-ask, Evil Eye's bonus block is dropped (0NZB: "Evil Eye + Juggernaut" shown −12, really 0). Count exhausts this turn from the logged frames instead.
- combat-plan.ts withPotionLines (~:176-199, called ~:1550) adds "drink" lines whose drink changes nothing (Flex after the last attack); with near-equal numbers the rollout noise tagged one best (3SBP boss T3: 62.5 vs 64.1) and Jev drank it. Drop drink lines whose effect is zero in that line (a pure no-op, not a potion cost).
- Feel No Pain misses end-of-turn exhausts of ethereal cards (Dazed, Clumsy, Ascender's Bane): the solver/rollout never exhaust ethereal cards at end of turn (evaluate, turn-solver.ts ~:1643 / step1-bugfix ~:1758; Feel No Pain only at ~:1027-1031). 7KDM HP forecasts 9–12 too pessimistic at T5/T7/T8. Ascender's Bane is in every A9 deck.
- run-journal.ts:894-895 dedupes next nodes by type ("下一个节点强制: Treasure" with two different Treasure nodes). Minor.
- Not a bug but noted: near-ties are not tagged tied (a line differing only by a useless drink won best by 1.6 of noise) — fixed at the source by the zero-effect drink item above.

From post-mortems 9GRP N01X 83FL 7MDJ 5NFG (2026-09-29 17:05):
- HIGH: run-plan echo accepted — when DeepSeek's run-plan reply is only a {choice, reason} echo, pickJsonObject still returns it (deepseek.ts ~:249 at 54d6d9e), ensureRunPlan stores it unchecked (loop.ts ~:1480-1481), parseRunPlan (run-plan.ts:127-167) turns it into an all-empty plan that REPLACES the valid one (9GRP F9, F25; YFG5 F44 on 09-26). DeepSeek's reasoning had full plans both times. Reject/recover (from reasoning) instead of overwriting.
- Route review candidates come only from the current node's children (map.ts ~:957 positionRoutes) → Winged Boots detours never offered now that the HP-drop re-plan is gone (9GRP F28: boots could reach a rest site at (11,2)). Add boots-reachable nodes when charges remain.
- rest.ts:43 pre-boss heal ignores boss-start heal relics (Pantograph) (5NFG F16; heal amount is a {Heal} placeholder, loss unverified). Minor.
- Unmodelled cards/relics that decided or shaped deaths: Primal Force (N01X), Rolling Boulder power (83FL; coverage #12), Biiig Hug's Soot, Cloak Clasp (7MDJ forecasts +2–4 HP/turn).

From post-mortems KYC0 2MK4 (2026-09-29 17:23; line numbers at v3 54d6d9e):
- loop.ts:482-494 clears combatPlan whenever a card-selection screen opens mid-combat; back in combat combat-plan.ts:1278 finds no plan, so the rest of Jev's line is lost and Jev is re-asked. 2MK4 F8 T2: line Headbutt, Defend, Defend (−0, rollout 4/8 alive); after the Headbutt pick (hand and enemies unchanged) the re-ask had no "Defend, Defend" option, Jev took Strike+Defend, 11→6. KYC0: 4 re-asks after True Grit+ picks (F6 T1, F9 T1, F9 T4, F24 T5), all re-chose the original line.
- Enemies with different ids but the same Chinese name are indistinguishable in option text and kill orders: turn-solver.ts:1129, combat-plan.ts:681-682, rollout.ts:1944-1948, rollout-live.ts:635/:645. KYC0 F28 Decimillipede: three segments all "残杀千足虫"; T1 plans 5/8/9 identical text, T2 plans 9/10; 4 of 6 kill orders merged under one label, so the jev-hints advice (spread damage, kill them together) can't be followed.
- reward.ts:127-134 drops a potion from an event when the potion belt is full, with no discard-to-take option (KYC0 F20 洗劫, YQL8 F28).

From fix batch D (2026-09-29 17:31; line numbers at v3 cf87de6), not fixed:
- loop.ts:804-807 + deepseek.ts DeepSeekAnswerError: when an invalid option key is recovered from the reasoning, the answer's route/route_reason are not carried over → route review still logged as "the answer has no route".
- map.ts:150/174 candidate-path search sustain estimate (stateAfter) still uses a fixed 0.3 heal without relics (the projection shown to DeepSeek is fixed).
- boss-clock.ts:727 expectedEntryHp rounds the 30% heal (+1 at some max HP; the game floors) and ignores Stone Humidifier.
- combat-plan.ts:~1059 Blessing of the Forge drunk mid Jev line upgrades the hand → hand signature changes → line re-planned; the expected hand isn't updated to the upgraded cards.
- To verify first (game behaviour unconfirmed): turn-solver.ts:1044-1045 One-Two Punch / Unrelenting replayed by Duplicator/Replay apply once; rollout.ts:1724 resets freeAttacks each turn (does FREE_ATTACK_POWER carry to next turn if Unrelenting was the last attack?).
- Not modelled: Eternal Feather rest heal by deck size (seen in one run, amount unconfirmed).

## HIGH: DeepSeek answers that don't follow the format (Dai asked 2026-09-29 18:00)
Data 09-26..29 (~5,900 DeepSeek decisions): ~10 visible failures in direct decisions (4 "chose unknown option" — option TEXT instead of key, e.g. "休息", "读下封底"; ~6 non-JSON — empty or truncated reply), 4 run-plan non-JSON; silent failures that do damage: run-plan {choice, reason} echo accepted and overwrote a valid plan with an empty one (9GRP F9/F25, YFG5), act plan empty reply after 48 s (VBHZ F17), a consistency re-ask answer drops the route field. JSON mode (response_format json_object) is already on; label→key mapping, recovery from reasoning, consistency re-ask and fallback to Jev/code exist, but each path validates differently.
Fix (robustness only, no change to what DeepSeek may choose):
1. One validator per question kind (pick / plan / run plan / act plan / shop plan / route review): required fields, allowed keys, plan-step validity; returns a precise error.
2. Recovery order on an invalid answer: (a) map option text/labels to keys (fuzzy match against the options shown; e.g. "休息" → the heal option), (b) recover from the reasoning (exists), (c) ONE repair re-ask in the same conversation stating exactly what was wrong and the valid keys ("reply only with JSON {…}; valid choices: o0…o3") — cheap because the prefix is cached, (d) fall back as today.
3. Never replace good state with a bad answer: an invalid run plan / route plan / act plan keeps the previous plan (log it); the re-ask prompt must carry every field the original asked for (route review!).
4. Detect truncation (finish_reason=length / unbalanced JSON) and re-ask for the JSON only.
5. Count failures per label (and which recovery step fixed them) in ops/report.py and ops/stats.py; the ops session flags a label whose failure rate goes above 2%.

From experience update 2026-09-29.4 (2026-09-29 18:01; line numbers at v3 cf87de6):
- Hand-written knowledge contradicting A9 data (update text per ascension, from the data): Giant "kill early" cites only A8 "killed before T10 13/15 won" — ironclad-guide.md:55, :120, ds-handbook.md:71, run-journal.ts:181 (A9 killed before T10 1/3 won, both losses short of HP at the kill; jev-hints.json:110 giant-eruption already has both halves); ds-handbook.md:75 Infested Prism "22~40 lost" (A9 wins lost 42, 52, 56); ds-handbook.md:40 Entomancer "3 deaths" (now 9 at A7–A9); ironclad-guide.md:52, :98 "kill the cultists first" vs experience kin-priest-focus (old contradiction); jev-hints.json:140 hp-trade-boss counter-example 3SBP Vantom T1 Slippery.
- rest.ts:42 beforeBoss ignores a forced elite within 3 floors (7KDM).
