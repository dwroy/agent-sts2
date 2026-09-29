# Fix queue (pure bugs waiting for the next batch on step1-bugfix)

## PRIORITY (regression, fix first)
- ~~Thrash (batch B f0c5d1a): turn-solver.ts thrashAbsorb (~:1373-1392, called ~:1265 at ea6ca1c; step1-bugfix ~:1388/:1280) adds the exhausted attack's damage to the Thrash play itself; in the game Thrash hits for its printed number and the absorbed damage applies to LATER Thrash plays that fight (all 12 Thrash plays in 3SBP). Caused a false lethal at 3SBP F12 T2 (Byrdonis survived at 17, hit 15, Defend left in hand) and inflated Vantom T7 (26 predicted, 12 actual). Also carry the absorbed damage across later turns in the rollout (batch B note: TTVY's Thrash had base 17).~~ fixed 1b4a5c8 (batch E, v3 94648bf)


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
- ~~combat-plan.ts reads player.cards_exhausted_this_turn (2e92460 :1118; step1-bugfix ~:1176), a field that never appears in states.jsonl → after an exhaust + re-ask, Evil Eye's bonus block is dropped (0NZB: "Evil Eye + Juggernaut" shown −12, really 0). Count exhausts this turn from the logged frames instead.~~ fixed 1fb3c13 (batch E, v3 94648bf)
- ~~combat-plan.ts withPotionLines (~:176-199, called ~:1550) adds "drink" lines whose drink changes nothing (Flex after the last attack); with near-equal numbers the rollout noise tagged one best (3SBP boss T3: 62.5 vs 64.1) and Jev drank it. Drop drink lines whose effect is zero in that line (a pure no-op, not a potion cost).~~ fixed 0dafcda (no-effect drink line reuses the dry line's rollout; not removed) (batch E, v3 94648bf)
- ~~Feel No Pain misses end-of-turn exhausts of ethereal cards (Dazed, Clumsy, Ascender's Bane): the solver/rollout never exhaust ethereal cards at end of turn (evaluate, turn-solver.ts ~:1643 / step1-bugfix ~:1758; Feel No Pain only at ~:1027-1031). 7KDM HP forecasts 9–12 too pessimistic at T5/T7/T8. Ascender's Bane is in every A9 deck.~~ fixed b66bcf9 (batch E, v3 94648bf)
- ~~run-journal.ts:894-895 dedupes next nodes by type ("下一个节点强制: Treasure" with two different Treasure nodes). Minor.~~ fixed 246ff27 (batch E, v3 94648bf)
- Not a bug but noted: near-ties are not tagged tied (a line differing only by a useless drink won best by 1.6 of noise) — fixed at the source by the zero-effect drink item above.

From post-mortems 9GRP N01X 83FL 7MDJ 5NFG (2026-09-29 17:05):
- ~~HIGH: run-plan echo accepted — when DeepSeek's run-plan reply is only a {choice, reason} echo, pickJsonObject still returns it (deepseek.ts ~:249 at 54d6d9e), ensureRunPlan stores it unchecked (loop.ts ~:1480-1481), parseRunPlan (run-plan.ts:127-167) turns it into an all-empty plan that REPLACES the valid one (9GRP F9, F25; YFG5 F44 on 09-26). DeepSeek's reasoning had full plans both times. Reject/recover (from reasoning) instead of overwriting.~~ fixed 46a05c6 (batch E, v3 94648bf)
- ~~Route review candidates come only from the current node's children (map.ts ~:957 positionRoutes) → Winged Boots detours never offered now that the HP-drop re-plan is gone (9GRP F28: boots could reach a rest site at (11,2)). Add boots-reachable nodes when charges remain.~~ fixed 71c4f56 (batch E, v3 94648bf)
- ~~rest.ts:43 pre-boss heal ignores boss-start heal relics (Pantograph) (5NFG F16; heal amount is a {Heal} placeholder, loss unverified). Minor.~~ fixed 97b239a facts only (boss_start_heal, Pantograph +25) (batch F, v3 c605500)
- ~~Unmodelled cards/relics that decided or shaped deaths: Primal Force (N01X), Rolling Boulder power (83FL; coverage #12), Biiig Hug's Soot, Cloak Clasp (7MDJ forecasts +2–4 HP/turn).~~ fixed Cloak Clasp 28a9c5d, Rolling Boulder 81d7fbd, Primal Force fc6cd6f, Biiig Hug Soot 56d8183 (batch F, v3 c605500)

From post-mortems KYC0 2MK4 (2026-09-29 17:23; line numbers at v3 54d6d9e):
- ~~loop.ts:482-494 clears combatPlan whenever a card-selection screen opens mid-combat; back in combat combat-plan.ts:1278 finds no plan, so the rest of Jev's line is lost and Jev is re-asked. 2MK4 F8 T2: line Headbutt, Defend, Defend (−0, rollout 4/8 alive); after the Headbutt pick (hand and enemies unchanged) the re-ask had no "Defend, Defend" option, Jev took Strike+Defend, 11→6. KYC0: 4 re-asks after True Grit+ picks (F6 T1, F9 T1, F9 T4, F24 T5), all re-chose the original line.~~ fixed 4d59170 (batch E, v3 94648bf)
- ~~Enemies with different ids but the same Chinese name are indistinguishable in option text and kill orders: turn-solver.ts:1129, combat-plan.ts:681-682, rollout.ts:1944-1948, rollout-live.ts:635/:645. KYC0 F28 Decimillipede: three segments all "残杀千足虫"; T1 plans 5/8/9 identical text, T2 plans 9/10; 4 of 6 kill orders merged under one label, so the jev-hints advice (spread damage, kill them together) can't be followed.~~ fixed 2de27ae (batch E, v3 94648bf)
- ~~reward.ts:127-134 drops a potion from an event when the potion belt is full, with no discard-to-take option (KYC0 F20 洗劫, YQL8 F28).~~ fixed 89ab236 (event path, DeepSeek decider) (batch E, v3 94648bf)

From fix batch D (2026-09-29 17:31; line numbers at v3 cf87de6), not fixed:
- ~~loop.ts:804-807 + deepseek.ts DeepSeekAnswerError: when an invalid option key is recovered from the reasoning, the answer's route/route_reason are not carried over → route review still logged as "the answer has no route".~~ fixed 0809eb7 (batch E, v3 94648bf)
- ~~map.ts:150/174 candidate-path search sustain estimate (stateAfter) still uses a fixed 0.3 heal without relics (the projection shown to DeepSeek is fixed).~~ fixed 562215f (batch E, v3 94648bf)
- ~~boss-clock.ts:727 expectedEntryHp rounds the 30% heal (+1 at some max HP; the game floors) and ignores Stone Humidifier.~~ fixed 562215f (batch E, v3 94648bf)
- ~~combat-plan.ts:~1059 Blessing of the Forge drunk mid Jev line upgrades the hand → hand signature changes → line re-planned; the expected hand isn't updated to the upgraded cards.~~ fixed eca3384 (batch E, v3 94648bf)
- ~~To verify first (game behaviour unconfirmed): turn-solver.ts:1044-1045 One-Two Punch / Unrelenting replayed by Duplicator/Replay apply once; rollout.ts:1724 resets freeAttacks each turn (does FREE_ATTACK_POWER carry to next turn if Unrelenting was the last attack?).~~ fixed 2a38a76 (FREE_ATTACK_POWER carries over, verified); One-Two Punch replaying Unrelenting gives 1, solver already right (9LSQ F31 T2); Duplicator: no log case (batch F, v3 c605500)
- ~~Not modelled: Eternal Feather rest heal by deck size (seen in one run, amount unconfirmed).~~ fixed 6a23c64 (3 HP per 5 cards, 9/9 matched) (batch F, v3 c605500)

## HIGH: DeepSeek answers that don't follow the format (Dai asked 2026-09-29 18:00)
Data 09-26..29 (~5,900 DeepSeek decisions): ~10 visible failures in direct decisions (4 "chose unknown option" — option TEXT instead of key, e.g. "休息", "读下封底"; ~6 non-JSON — empty or truncated reply), 4 run-plan non-JSON; silent failures that do damage: run-plan {choice, reason} echo accepted and overwrote a valid plan with an empty one (9GRP F9/F25, YFG5), act plan empty reply after 48 s (VBHZ F17), a consistency re-ask answer drops the route field. JSON mode (response_format json_object) is already on; label→key mapping, recovery from reasoning, consistency re-ask and fallback to Jev/code exist, but each path validates differently.
Fix (robustness only, no change to what DeepSeek may choose):
1. One validator per question kind (pick / plan / run plan / act plan / shop plan / route review): required fields, allowed keys, plan-step validity; returns a precise error.
2. Recovery order on an invalid answer: (a) map option text/labels to keys (fuzzy match against the options shown; e.g. "休息" → the heal option), (b) recover from the reasoning (exists), (c) ONE repair re-ask in the same conversation stating exactly what was wrong and the valid keys ("reply only with JSON {…}; valid choices: o0…o3") — cheap because the prefix is cached, (d) fall back as today.
3. Never replace good state with a bad answer: an invalid run plan / route plan / act plan keeps the previous plan (log it); the re-ask prompt must carry every field the original asked for (route review!).
4. Detect truncation (finish_reason=length / unbalanced JSON) and re-ask for the JSON only.
5. Count failures per label (and which recovery step fixed them) in ops/report.py and ops/stats.py; the ops session flags a label whose failure rate goes above 2%.

From experience update 2026-09-29.4 (2026-09-29 18:01; line numbers at v3 cf87de6):
- ~~Hand-written knowledge contradicting A9 data (update text per ascension, from the data): Giant "kill early" cites only A8 "killed before T10 13/15 won" — ironclad-guide.md:55, :120, ds-handbook.md:71, run-journal.ts:181 (A9 killed before T10 1/3 won, both losses short of HP at the kill; jev-hints.json:110 giant-eruption already has both halves); ds-handbook.md:75 Infested Prism "22~40 lost" (A9 wins lost 42, 52, 56); ds-handbook.md:40 Entomancer "3 deaths" (now 9 at A7–A9); ironclad-guide.md:52, :98 "kill the cultists first" vs experience kin-priest-focus (old contradiction); jev-hints.json:140 hp-trade-boss counter-example 3SBP Vantom T1 Slippery.~~ fixed 95ff84e (facts only; jev-hints hp-trade-boss direction left for Dai) (batch F, v3 c605500)
- ~~rest.ts:42 beforeBoss ignores a forced elite within 3 floors (7KDM).~~ fixed 97b239a facts only (forced_elite_ahead); the heal rule itself is strategy → Dai (batch F, v3 c605500)

From post-mortems AD5P CJ88 (2026-09-29 18:02; line numbers at v3 3e41460):
- ~~rollout-live.ts:420-434 pickRolloutBest on saturated boards: every line is a candidate (:424) and is ordered by enemy HP left first (:431-432); deaths within the 5 turns are not compared. CJ88 F17 Vantom T2 (asked twice): plan2 "−14, 5/8 and 4/8 samples dead" tagged best over plan1 "−2/−0, 1 dead"; Jev ignored it and took 0 that turn. Deaths (then loss) must rank before enemy HP left.~~ fixed b2080fb (batch F, v3 c605500)
- ~~Hellraiser unmodelled (card-model.ts:217 only a lasting value 10; solver/rollout don't auto-play drawn Strikes) — add to the unmodelled-cards list (CJ88 F17 onwards, not the cause of death).~~ fixed a4f3795 (start-of-turn draws; mid-turn draws still open) (batch F, v3 c605500)
- ~~To verify: shop.ts:31-35 leaves FAKE_MERCHANT immediately although open_shop_inventory is available; never tried (CJ88 F21, 32/80 HP, 228 gold). Check what the fake merchant sells before changing.~~ fixed skipped: 24 logged visits, never opened, no shop data (batch F, v3 c605500)

From fix batch E (2026-09-29 18:26; line numbers at v3 94648bf), not fixed:
- ~~rollout.ts:1274 Thrash's random exhaust in the rollout draws from all unplayed cards, not only attacks; growth uses the smallest attack's damage (conservative).~~ fixed 5506462 (batch F, v3 c605500)
- ~~turn-solver.ts:1807 Feel No Pain block from end-of-turn ethereal exhausts doesn't trigger Juggernaut; Dark Embrace draw not modelled.~~ fixed d4808d8 (batch F, v3 c605500)
- ~~event.ts:265 "discard one to take this" only exists with BUILD_DECIDER=deepseek (jev mode still drops the potion); one discard per option, so an option giving 3 potions frees only one slot.~~ fixed 549379c, 5c10115 (batch F, v3 c605500)
- reward.ts:134 combat-reward potions still dropped on a full belt (the reward screen can't discard; making room before the fight ends is a trade-off → left, possibly for Dai).
- ~~To verify: Thrash growth under Duplication / One-Two Punch replays.~~ fixed skipped: no such case in the logs (batch F, v3 c605500)
- ~~combat-plan exhaustedSinceTurnStart: after a mid-turn restart the first seen frame is the baseline (undercounts, conservative).~~ fixed d5ad024 (batch F, v3 c605500)
- ~~Test runtime: rollout-live.test.ts and potion-mc.test.ts run every fixture in tests/logged-states; potion-mc timed out once under load (1.8 s alone). Consider a per-test timeout or a fixture subset.~~ fixed b650fe4 (batch F, v3 c605500)

From post-mortems KTRT ZGZ0 QBCV (2026-09-29 19:09; line numbers at v3 94648bf):
- ~~map.ts:340-342 with Little Mailbox (小邮箱) code discards a potion on the map whenever the next node can be a rest site, but the mailbox only gives potions on a Rest, not a Smith (ZGZ0 F10 dropped Fysh Oil, F11 DeepSeek smithed, entered the boss with an empty slot). Code must not discard potions on its own (Dai's potion rule); if room is needed, make it part of the rest/plan answer. Recorded in an old post-mortem (fcbe2a8 era) but never queued.~~ fixed 0c71951 (no code discard; rest options get a discard variant, DeepSeek names slots / Jev yes-no per slot) (batch G, v3 d32b992)
- ~~event.ts:338 the discard option only appears when the belt is completely full; when an event gives more potions than free slots, the extra potion is silently left behind and DeepSeek is not told (KTRT F6 低语空谷: 44 gold for 2 potions, Dexterity Potion left on the reward page, "no rewards left to claim").~~ fixed 5c10115 (slots needed = potions given − slots the option adds − free slots; verify live) (batch F, v3 c605500)
- ~~Recurring: saturated pickRolloutBest doesn't compare deaths (rollout-live.ts:440-455) — QBCV boss T5 (Jev ignored), ZGZ0 boss T4 (Jev followed). In batch F.~~ fixed b2080fb (batch F, v3 c605500)
- ~~To investigate: KTRT F23 T3 "Twin Strike, Bash+" (0 loss, kills the 29-HP Bowlbug Rock exactly) ranked below "Defend, Bash+" (−11, Rock left at 16) by both rollout (6/8 vs 3/8 dead) and history (25% vs 49%); the Rock lived, T4 −20.~~ fixed ff5fa50 (Bowlbug Rock Imbalanced stun only on a fully blocked attack; was a random ~30% stun) (batch G, v3 d32b992)
- ~~To investigate: selection.ts:689 Toasty Mittens exhaust pick scores power cards at a fixed 5 → at 9 HP it exhausted Twin Strike and kept Rend (KTRT).~~ not a bug: fixed 5 is an intended heuristic (4UWK Barricade) → valuation question for Dai (batch G, v3 d32b992)
- ~~Boss rollout coverage: ZGZ0 boss 3 of 5 questions fell back to the 1-turn estimate; QBCV boss 7 of 9 saturated.~~ fixed 129a2a3 (fallback to 3-turn rollouts, keep 1 sample per line when just over budget; QBCV saturation is the board itself) (batch G, v3 d32b992)

From fix batch F (2026-09-29 19:12; line numbers at v3 c605500), not fixed:
- ~~turn-solver.ts:1462 drawCards: mid-turn draws don't auto-play Hellraiser Strikes; Dark Embrace draw on mid-turn exhausts not modelled.~~ fixed ed9f105 (batch G, v3 d32b992)
- ~~combat-plan.ts:~1421 after Primal Force the expected hand isn't updated to Giant Rocks → the line is re-planned (same shape as eca3384 Blessing of the Forge).~~ fixed ca11ab3 (batch G, v3 d32b992)
- ~~boss-clock.ts:735 expectedEntryHp and route projections don't add Pantograph's boss-start heal (+25).~~ fixed 66f98b5 (batch G, v3 d32b992)
- To verify: rollout.ts:739 BOULDER_STEP=5 for upgraded / two Rolling Boulders (no log data yet).
- ~~turn-solver.ts:1066 unused free attacks carry over only in the rollout; the solver's scoring of this turn gives them no value.~~ fixed fed438e (fact free_attacks_kept, score unchanged) (batch G, v3 d32b992)
- ~~Event discard options: one option per discard combination can explode (5 slots, 3 potions → 25 options) — consider grouping.~~ fixed fa98169 (one discard variant per option) (batch G, v3 d32b992)

From experience update 2026-09-29.5 (2026-09-29 19:40; line numbers at v3 4452401):
- ~~Hand-written facts contradicting data (fix the numbers per ascension): ds-handbook.md:38 "wins average 88% entry, losses 81%" (A9 act-1 boss 41 fights: both 90%); boss-clock.ts:195 "A9 killed before T10 1/3" is now 2/4 (Y36H won with a T9 kill) — better derived from the data than hard-coded.~~ fixed 22109ed (Giant record computed from data: A9 3/10, before T10 2/4) (batch G, v3 d32b992)
- Knowledge text vs code: experience potion-swift says code values Swift Potion at 0, but potion-values.ts:47 / card-model.ts:730 draw 3 (potion entry: left for Dai's potion-entry decision).
- combat-plan.ts:690 treats Slumbering Beetle as an elite in combat while route pricing prices it as a hallway (inconsistent classification; pricing itself is route estimation → Dai).

From post-mortems Y36H WQ67 8KD7 RHNE ARKG (2026-09-29 20:17; line numbers at v3 4452401):
- ~~HIGH regression (0dafcda, batch E): Demise powder tagged potion_no_effect — solver outcome doesn't record Demise (turn-solver.ts:2174-2191; only scored at :2119-2122), so noEffectTwin (rollout-live.ts:406-419) treats the line as identical and copies the dry line's rollout (:615-619); rollout.ts has no Demise at all. ARKG F17 Soul Fysh: 30/34 questions tagged, Jev never drank until code did at T15 (up to 117 over T2–T14, Fysh left at 62). → sent to batch G as its first item.~~ fixed 2ca832e (turnOnlyDrink positive check, lastingDrinks, Demise in solver outcome and rollout) (batch G, v3 d32b992)
- ~~Pael's Tear unmodelled: run-brief.ts:113 lists it as text only; solver/rollout never make "end the turn with 1 energy left" lines (Y36H: DeepSeek took it at F18 for +2 energy/turn; 15 turns F19–F25 all started at 3 energy).~~ fixed 8c5a83c (+2 energy next turn, verified 60 turns; leftover-energy lines kept as their own axis) (batch H, v3 389bdb7)
- ~~Liquid Memories drunk mid Jev line: the card the line names isn't carried to the selection screen — combat-plan.ts:1537 computes it, selection.ts:40-53 only remembers Gambler's Brew discards (8KD7 F11 T2: Jev re-asked, took Fire Barrier over Bash+, line broken, 0 damage).~~ fixed 9729bdb (batch H, v3 389bdb7)

From fix batch G (2026-09-29 20:32; line numbers at step1-bugfix = v3 d32b992), not fixed:
- ~~map.ts:342 White Beast Statue: code still discards the weakest potion on the map — same pattern as the Little Mailbox (0c71951); reuse that discard-variant mechanism so the decider chooses.~~ fixed cc0d26d (discard variant before fight nodes; route-plan/review name slots; auto-walk asks map/statue-potion) (batch H, v3 389bdb7)
- ~~turn-solver.ts:1168 Feel No Pain block ignores random exhausts (unupgraded True Grit); Dark Embrace already counted.~~ fixed de0e3e5 (batch H, v3 389bdb7)
- ~~To verify: rollout.ts:1132 Test Subject phase revive doesn't clear Demise (game behaviour unknown).~~ skipped: no Test Subject fight with Demise in the logs (batch H, v3 389bdb7)
- ~~deepseek.ts:374 recovering an unknown option from the reasoning keeps route but drops `discard` → a recovered discard option is judged invalid and falls back.~~ fixed e504cdf (batch H, v3 389bdb7)

From experience update 2026-09-29.6 (2026-09-29 20:51; line numbers at v3 2f72f9a):
- ~~Giant "block needed after the kill ≤13: 18 of 33 won 17" is stale (with Y36H 19 of 34 won 18) in ironclad-guide.md:55, :120, ds-handbook.md:71, run-journal.ts:181, boss-clock.ts:85 — compute it from data like 22109ed did for the kill-turn record.~~ fixed 7819a1a (computed from boss-damage.json: 33 fights, ≤13 18/19, ≥20 3/14) (batch H, v3 389bdb7)
- ~~ironclad-guide.md:54, run-journal.ts:180 count unupgraded True Grit as clearing Soul Fysh's Beckon; unupgraded True Grit exhausts a random card (experience card-true-grit).~~ fixed a85c413 (batch H, v3 389bdb7)
- ~~Investigate: ARKG "calc mismatch" in the logs — cause not located.~~ not a bug: mod's end_turn_will_kill_player ignores Beckon in hand; annotation now states the cause (14520e0) (batch H, v3 389bdb7)
- Experience text vs code (potion entries, wait for Dai's potion-entry decision): potion-code-discard (Little Mailbox part outdated since 0c71951; White Beast Statue still true), potion-fysh-oil (full-belt discard, unverified after G), potion-swift ("valued 0", outdated).

From fix batch H (2026-09-29 21:30; line numbers at v3 389bdb7), not fixed:
- ~~combat-plan.ts:~1478 if a combat frame is logged after Liquid Memories and before the selection screen, the next step's generated card isn't in hand → line re-planned (old; not seen in 8KD7).~~ fixed 529cbc2 (wait up to 4 s) (batch I, v3 3899c2a)
- ~~Giant kill-turn record still hard-coded in ironclad-guide.md:55, :120, ds-handbook.md:71 ("A8 27 … A9 10 won 3") — use a placeholder like {GIANT_BLOCK_RECORD} (7819a1a); batch-f tests read the old text.~~ fixed fe82439 ({GIANT_KILLS_A8}/{GIANT_KILLS_A9}) (batch I, v3 3899c2a)
- ~~"solver says dead, mod says safe" with the gap from blockable hand damage (Burn) still labelled calc mismatch.~~ fixed 4cb8b8b (heldDamage) (batch I, v3 3899c2a)
- ~~rest.ts:158, event.ts:261 duplicate the discard note text (use DISCARD_ANSWER_NOTE). Cosmetic.~~ fixed 3901494 (batch I, v3 3899c2a)
- Experience entry potion-code-discard ("White Beast Statue still discards by code") now outdated → next experience update (potion entry; numbers/facts only).

From post-mortems 7YT0 9CDE VTRE V6TW (2026-09-29 21:31; line numbers at v3 389bdb7):
- ~~Liquid Bronze potion unmodelled: not in card-model.ts:702-815 POTION_EFFECTS (only a value in potion-values.ts:33), so combat questions show it as "effect not simulated" (combat-plan.ts:2006). VTRE: listed in 37 Jev questions F19–F33, never picked, still held at death; V6TW: 29 questions, drunk only at F33 T4 when every line died.~~ fixed 1966f0a (Thorns +3 per drink, whole fight; retaliation now reduces enemy HP in the rollout) (batch I, v3 3899c2a)
- ~~Red Skull and Self-Forming Clay not in the solver/rollout (only text in run-brief.ts:106/:110). VTRE F33 T6 Strength 2→5 at 33/80; V6TW F33 T2/T3 6 Clay block each turn.~~ fixed 246d2be (Red Skull +3 Str at ≤50%; Clay +3 block next turn per HP loss) (batch I, v3 3899c2a)
- ~~Plating card text shown to DeepSeek/Jev has no decay ("获得4层覆甲"): 7YT0 F12 took Stone Armor for "48 block over 12 turns" (real ~10, Plating −1/turn), QBCV F16 the same. Add the decay fact to the card text/facts.~~ fixed d7dab83, cff33ba (fact only) (batch I, v3 3899c2a)
- ~~shop.ts:330 one-shot shop plan judged invalid when DeepSeek puts the list into `choice` (VTRE F6) → step-by-step fallback cost 150.8 s. Accept/recover the list from `choice`.~~ fixed 1fdbb97 (batch I, v3 3899c2a)

From fix batch I (2026-09-29 22:07; line numbers at v3 3899c2a), not fixed:
- ~~Unmodelled potions seen in the logs: STABLE_SERUM (66 questions show "effect not simulated"), ENTROPIC_BREW. Also card-model.ts:1014 modelPotion returns null for Distilled Chaos / Glowwater / Gambler's Brew / Bottled Potential when the draw pile is unknown (Chaos potion "not simulated" 22×) — model with an expected draw.~~ fixed eff3b52 (Stable Serum = retain hand 2 turns), 5032430 (Entropic Brew fills all slots, re-plan after), 7c48194 (draw potions expected pool) (batch J, v3 59b83c2)
- ~~rollout.ts:1417 / turn-solver.ts:2138 retaliation (Thorns, Flame Barrier) ignores Slippery (1 per hit) and Hardened Shell's cap → overcounted on those enemies.~~ fixed 1229629 (batch J, v3 59b83c2)
- ~~turn-solver.ts:1996 Clay ignores start-of-turn HP loss (Crimson Mantle, Inferno 1) → block a turn late. Minor.~~ fixed 6620d2c (batch J, v3 59b83c2)
- tests/logged.ts game-data.json is a subset, so code_value of logged boards differs from the logged value (7YT0 F12 Stone Armor 71 logged vs 65) — tests can't assert code_value.

From post-mortems DHGT JJ65 ULQP (2026-09-29 22:08; line numbers at v3 3899c2a):
- ~~rollout-live.ts:587 skips the rollout when both draw and discard piles are empty ("no draw/discard piles in the state") — ULQP F6 T2 after Glowwater drew the whole deck; Jev answered at 0.18 with no rollout numbers. Simulate with the exhaust/hand only (reshuffle of nothing).~~ fixed a1877f5 (batch J, v3 59b83c2)
- ~~Shuriken and Captain's Wheel not simulated (only text in run-brief.ts:104-111). DHGT F33: T1 predicted 116, did 132 (Strength 0→1→2 after the 3rd and 6th attacks); T3 started with the Wheel's 18 block, rollouts had −9.7 for that turn.~~ fixed 86621f8 (Shuriken 90/95, Wheel 19/20 verified) (batch J, v3 59b83c2)
- Stable Serum: also seen DHGT F33 T1 (Jev drank at 0.08) — already queued under batch I leftovers.
- ~~ops/report.py:181-182 (:196) a fight's end HP comes from the last combat decision, so damage after it is missed: DHGT F17 auto note 86→61 (−25), real 86→33 (−53 incl. the Giant's −28 explosion); death fights miss the final hit.~~ fixed in the workspace ops/report.py (batch J; --selftest) (batch J, v3 59b83c2)
- ~~Recurring: DHGT F9 and F23 answers without a route field ("the answer has no route") on 2f72f9a (after adb9ec9/0809eb7) — find which path still drops it.~~ fixed 5afb91f (reply format lists extra fields; route recovered from the reasoning) (batch J, v3 59b83c2)

From fix batch J (2026-09-29 23:36; line numbers at v3 59b83c2), not fixed:
- ~~RULE CHECK (Dai: potions = 0-cost cards, no cost, no filter, no veto): (a) unmodelled potions (now incl. Entropic Brew) are offered only under conditions (e.g. heavy T1 loss) while random potions are always options (Dai 09-28) — make every potion an option; (b) the batch J agent says "the existing potion cost still counts" for Stable Serum in the solver score — find any potion cost in solver scoring and remove it if it exists (ETYC 09-29 said potions have no cost; verify).~~ fixed 4f57bbd (T1 12% gate removed: every drinkable potion is an option, unsimulated ones without numbers) and d79f14f (POTION_LASTING hallway/unknown 0.25 discount removed) (batch K, v3 d75c189)
- ~~tests/logged-states/batch-j/dhgt-f33-t2-wheel.json: the solver gives Jev's line −29 this turn, logged and actual −20 (also before J). Suspect missing screenMemory.facing in the test (startFacing fallback → different back-attack math); check.~~ fixed 0e74544 (fixture facing; live code gap queued) (batch K, v3 d75c189)
- ~~Stable Serum rollout approximation: cards drawn mid-turn still go to discard, not kept; DHGT F22 "Uppercut + Serum" rollout identical to the no-drink line (unexplained).~~ fixed 9ab47eb (F22 identity is correct: T2 kills anyway in 7/8) (batch K, v3 d75c189)
- ~~Shuriken count misses Hellraiser auto-played Strikes and duplicated/replayed attacks (turn-solver.ts play() attack branch, same as Kusarigama).~~ fixed 0bc06d4 (relics count every play incl. replays/auto-plays; verified on Pen Nib/Kunai/Nunchaku/Kusarigama) (batch K, v3 d75c189)
- ~~To verify: retaliation vs enemy block gained on its own turn.~~ verified no change: enemy block gained on its turn doesn't stop Thorns/Flame Barrier (~60 turns) (batch K, v3 d75c189)
- ~~deepseek.ts recoverRoute ignores negation ("don't keep the route" read as keep); takes the last route mention.~~ fixed 5518d8b (batch K, v3 d75c189)
- ops/report.py: a full-HP reward screen after an in-fight heal (Feast) topped by Burning Blood gives only a lower bound (DHGT F20 shows 86, real 88).

From fix batch K (2026-09-30 00:16; line numbers at v3 d75c189), not fixed:
- ~~Back-attack facing lost or stale: the per-card fallback in combat.ts doesn't update screenMemory.facing on targeted plays (only combat-plan.ts:902 noteIntent does); after a mid-fight restart facing falls back to startFacing (:2595). Record facing on every successful targeted action (loop.ts ~:1286) and persist it in the journal.~~ fixed 0bef203 (facing recorded per targeted action, restored by journal replay) (batch L, v3 c52587c)
- ~~To verify: turn-solver.ts:1089 Stomp cost reduction uses attacksPlayed incl. Hellraiser auto-plays (the game's attacks_played_this_turn excludes them).~~ verified: Stomp's discount counts Hellraiser auto-plays (8/8 vs 4/4); only the comment was wrong (2f2d97b) (batch L, v3 c52587c)
- ~~Dead potion-cost plumbing: potionCost/useCost (turn-solver.ts:2304, :2669, card-model potionShell) and potionLimit (:2596) are always 0/null — delete so they can't be re-enabled; turn-solver.test.ts still passes useCost 4/5/15.~~ removed 94f81aa (batch L, v3 c52587c)

From post-mortems RRMY 5LRZ 5PHF UNRL (A8 window 1–4; 2026-09-30 00:19; line numbers at v3 d75c189):
- ~~White Beast Statue discard question has only "keep all" / "discard first" (map.ts:1048-1073); no "drink now" option (potions usable on the map), and :1068 doesn't say Fruit Juice is auto-drunk on the next fight's first frame (combat-plan.ts:1599-1603). 5LRZ F37→F38: DeepSeek discarded Fruit Juice (+5 max HP lost); "keep all" would have drunk it next fight.~~ fixed 2f6ae4c (go:drink<slot> options; Fruit Juice auto-drink stated) (batch L, v3 c52587c)
- ~~Discard question potion descriptions keep raw placeholders ({MaxHp}, {HealPercent}, {StrengthPower}/{DexterityPower}): potion-discard.ts:41, :124 bypass fillPotionText (potion-values.ts:60). 5LRZ, 3 statue questions.~~ fixed 2adcb92 (also shop/chest relic summaries) (batch L, v3 c52587c)
- ~~Shop removal order puts basics before curses: selection.ts:362 gives run-plan removal targets +40 (:201 likewise) and shop.ts:553-558 orders by it → Strike 120, Defend 110 above the Injury curse 100. UNRL F14: DeepSeek's reasoning chose Injury (93 s) but the step executed code's order and removed a Strike; Injury then in 9 opening hands. The one-shot plan's named removal target must be executed as named.~~ f8aef72: execution was already by name (UNRL F14 DeepSeek's final answer was remove:c0 Strike, following code's order); now the score is shown split ("110 = 70 + 40 run-plan target") and the order marked a reference; ranking unchanged (valuation → Dai) (batch L, v3 c52587c)
- ~~combat-plan.ts:1768 Sandpit-at-1 lethal described as "0 HP lost in all, 0 of it the enemy hits after block" (UNRL F33 T8) — mention the Sandpit. Minor.~~ fixed 353e31b (batch L, v3 c52587c)
- ~~Single-choice answer with two cards ("card2,card1", RRMY F24) judged failed and passed to Jev — accept the first or re-ask with the format.~~ fixed 7eb1de7 (first valid key taken, noted; "pick 2 of 2: one card per answer") (batch L, v3 c52587c)

From post-mortems 2WRU 79YR 86C3 (A8 window 9–11; 2026-09-30 03:32; line numbers at v3 c52587c):
- ~~selection.ts:492, :496 with Rupture the Disintegration cost is set to −1, bypassing the "Disintegration that eats the remaining HP goes last" gate (contradicts :449-450, :233-234). 79YR F33 T5 at 17 HP: rationale "DISINTEGRATION Rupture: Strength; SLOTH 0"; by :490 7×6.9+20=68>17 it should rank last. T6 slap 19 + Disintegration 7 vs 17 HP, all lines died (Sloth would have lived T6 at 3).~~ fixed 556a99c (batch M, v3 950cbf5)
- ~~DeepSeek replies truncated mid-"reason" with a complete plan are judged non-JSON: 79YR F6 one-shot shop (plan array complete) → step-by-step fallback +145.8 s, third item changed. Recover the JSON prefix when the required fields are complete.~~ fixed f26ae1a (not truncated: two JSON objects joined by a comma; comma-joined objects parsed, and prefix recovery for choose/choosePlan) (batch M, v3 950cbf5)
- ~~Run plan reply empty with all output spent on reasoning (79YR F30, 6,791 tokens) — check max output tokens / effort for run-plan questions and retry once.~~ fixed fa46f6c, 524fc96 (not truncated: empty content with the plan at the end of the reasoning; recover from reasoning, else ask once more; finish_reason logged) (batch M, v3 950cbf5)
- ~~selection.ts:198-201 the standalone removal screen still shows +40 unsplit (f8aef72 only split the shop order and the one-shot eligible cards). Minor.~~ fixed 16559ba (batch M, v3 950cbf5)
- ~~combat-plan.ts:1394 "mod says dead, solver says alive" still labelled plain calc mismatch without the cause (86C3 F25 T5: 28 vs 28 HP, solver counted Plating 2 end-of-turn block). Display only.~~ fixed 8f31fa8 (endTurnGuards) (batch M, v3 950cbf5)
- ~~Prompt cache: the guide/handbook placeholders are filled from data refreshed after every run, so the DeepSeek system prompt hash changes every run → first question per run hits 6.7–9.1%. Consider freezing the filled numbers per day or moving the data-filled facts out of the cached prefix.~~ fixed 8546fde (filled guide facts frozen per local day and template hash in logs/guide-facts/) (batch M, v3 950cbf5)
- experience.json:389 still carries the old Giant numbers (A8 27 fights 13/15) next to the data-filled guide (29 fights 14/17) in the same DeepSeek input (2WRU) — experience text numbers drift; next experience update.

From post-mortems YVYZ Q8XR 3RME NH8A (A8 window 5–8; 2026-09-30 03:33; line numbers at v3 c52587c):
- ~~Music Box unmodelled (only text in run-brief.ts:112; nothing in src/strategy): YVYZ F48 T3 an extra Strike appeared after playing Strike → code re-planned 3× that turn; T7 an extra Pommel Strike. The extra cards also aren't counted for the Aeonglass Wither "one per 6 cards" rule.~~ fixed 617e504 (first attack each turn adds an ethereal copy; counts for Wither/Sloth) (batch M, v3 950cbf5)
- ~~"ending now kills" note calls every held damage card Burn (combat-plan.ts:1396): YVYZ F48 T6 was Wither, 3RME F30 T3/T5 and NH8A F31 T5 Toxic ×2. Text only.~~ fixed 91bce31 (batch M, v3 950cbf5)
- ~~Double minus on heals: "hp --8" (Q8XR F11 T2), "hp --5" (NH8A F21 T1) — combat-plan.ts:2029, :2325. Text only.~~ fixed 5e19d7a (batch M, v3 950cbf5)

From fix batch M (2026-09-30 04:14; line numbers at v3 950cbf5), not fixed:
- ~~combat-plan.ts:2040, :2351 "loses ${hpLoss} HP" prints "loses -8 HP" on heals (use hpText). Text only.~~ fixed a28b435 (batch N, v3 6e7611f)
- ~~rollout.ts:1331 applyPlan skips the Music Box copy (not in the pile), so a played copy never returns to discard/draw in later turns. Minor. To verify: does a Hellraiser auto-played Strike count as the turn's first attack for Music Box?~~ fixed 5d23509 (Hellraiser × Music Box unverifiable: no run with both) (batch N, v3 6e7611f)
- ~~askJson retry-on-empty also applies to fight plans (no format check) — at worst one extra call's wait (FIGHT_PLAN is off).~~ fixed f6ce421 (isFightPlanReply) (batch N, v3 6e7611f)
- A choice reply of complete JSON followed by prose (selection/add 09-29 10:15) still fails by an existing test's design — decide whether to accept.

From post-mortems MZFV S1MU 5HHL (A8 window 12–14, two wins; 2026-09-30 05:21; line numbers at v3 8b24187):
- ~~deepseek.ts:589-603 choosePlan throws on an empty reply and loop.ts:831 falls back to step-by-step; fa46f6c's "recover from the end of the reasoning" only covers askJson (:629-646). MZFV F24 shop: 56.2 s, 10,661 tokens all reasoning, empty content; the reasoning ended with a plan (True Grit for 25 gold), step-by-step (37.3 s) chose leave.~~ fixed 7b54237 (shared emptyReplyRetry; plan validated by the screen's resolve) (batch N, v3 6e7611f)
- ~~boss-clock.ts:828-829, :839, :855 underestimate self-damage engines: Rupture+ (+2 per self-damage) counted as +1 (Demon Form reads dynValue, Rupture doesn't); Inferno is a power so card-model.ts:538 gives it 0 self-loss and its per-turn HP loss isn't counted as self-damage; Inferno's AOE and Juggernaut damage are absent from the clock. S1MU: DeepSeek quoted "Rupture fed by 2/4/5 self-damage cards (~+0.2/0.3/0.4/turn)", real +2/turn; Knowledge Demon estimate 20–21 vs 51.0 actual, Aeonglass 21 vs 76.4. (Fixes the clock's model inputs; the calibration method stays Dai's.)~~ fixed 70d020d (Rupture reads its value; Inferno/Crimson Mantle 1 HP loss per turn; Inferno AOE and Juggernaut as power_damage; S1MU Knowledge Demon 21→29–33 vs 51 actual; calibration unchanged) (batch N, v3 6e7611f)
- ~~combat-plan.ts:1420 + turn-solver.ts:2017-2018 "ending now kills" note omits HP loss from held Beckon cards (5HHL F17 T7: "37 in all, 25 enemy hits", 12 from two Beckons unexplained). Text only.~~ fixed 050fb36, 7a93e34 (batch N, v3 6e7611f)

From fix batch N (2026-09-30 05:51; line numbers at v3 6e7611f), not fixed:
- boss-clock.ts:986, :968 Knowledge Demon's Sloth cap (3 cards a turn) multiplies the whole estimate, including the new Inferno/Juggernaut power damage; Sloth limits card plays, not power triggers — apply the cap to card damage only.
- To verify: boss-clock.ts:960 Inferno/Juggernaut damage not multiplied by VULNERABLE_UPTIME (does Vulnerable apply to power damage in STS2? check logs).
- deepseek.ts:649, :684 recovery from the reasoning takes the last object that validates, even if a later (final) one failed validation. Minor.
