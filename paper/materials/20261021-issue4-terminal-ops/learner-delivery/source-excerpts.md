# 冻结源码有界对照

只用于解释测量/表示；不执行源码，不由代码断言游戏机制。

## agent/src/sim/boss-start.ts

原清单 SHA 与 Git blob 一致；SHA256 `01ef66ce210a3d022f1e28e34188b7005c7a88aa2b020e6f242f4030a95aee02`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
10:  *     boardRolloutInput), on a combat frame made from the run: the deck, the relics, the potions (modelled ones are
11:  *     0-cost cards in hand, as in any boss fight), the entry HP; the fight-start relics this module knows
12:  *     (FIGHT_START_RELICS: their Strength, Dexterity, block, energy, draw and the enemies' Vulnerable/Weak on turn 1,
13:  *     measured on the logged boss fights' first frames) are on that frame; other relics with a combat text are listed
14:  *     as not modelled;
15:  *   - then every card goes to the draw pile and the start turn draws 5 (plus the turn-1 draw relics) in each sample.
16:  * Offline and deterministic: no clock, no files written, no model call. The live planner's code is only called.
17:  */
45: export const INNATE_POWER_SHARE = 0.8;
46: // Strength is gained by moves (logged on turn 1 only after a buff or from our Brimstone), never a boss's own at the start.
47: const OUR_DEBUFFS = new Set(["VULNERABLE_POWER", "WEAK_POWER", "POISON_POWER", "FRAIL_POWER", "SHRINK_POWER", "DEMISE_POWER", "DOOM_POWER", "STRENGTH_POWER"]);
48: 
49: /**
50:  * Relics that act at the start of a fight, as the logged boss fights' first frames show them (A7-A9, 435 fights,
51:  * experiments/boss-sim/raw/fights.jsonl turn 1 before any card; n = fights holding the relic): Vajra Strength 1 (31 of
52:  * 38 exactly 1, the others with more Strength from elsewhere), Girya its lifts, Ember Tea 2 while it has fights left,
74: }
75: 
76: export const FIGHT_START_RELICS: Record<string, (stack: number | null) => FightStartRelic | null> = {
77:   VAJRA: () => ({ strength: 1 }),
78:   GIRYA: (stack) => (stack && stack > 0 ? { strength: stack } : null),
79:   EMBER_TEA: (stack) => (stack && stack > 0 ? { strength: 2 } : null),
80:   TOASTY_MITTENS: () => ({ strength: 1 }),
81:   BRIMSTONE: () => ({ strength: 2, enemyStrength: 1 }),
117:   return enabled && (PASSIVE_SIM_RELICS as readonly string[]).includes(id);
118: }
119: /** A relic text that acts in fights (the ones outside FIGHT_START_RELICS and MODELLED_ELSEWHERE are listed as not modelled). */
120: const FIGHT_TEXT = /战斗开始时|战斗中|回合开始时|回合结束时|每回合|每当|第\s*\d+\s*回合|打出|格挡|力量|敏捷|能量|抽|伤害|at the start of|each turn|whenever|combat/i;
121: 
122: /** Names of the bosses the game data has no single monster for (several parts), or shows with a tag (#C24). */
123: export const BOSS_NAMES: Record<string, string> = { THE_KIN: "同族", KAISER_CRAB: "帝王蟹", TEST_SUBJECT: "实验体" };
124: 
181: }
182: 
183: function isRandomPotion(id: string | null): boolean {
184:   return id !== null && (id in CHOICE_POTIONS || id in DRAW_POTIONS);
185: }
186: 
187: /** The monster DB boss key of a run's boss id (THE_KIN_BOSS -> THE_KIN). */
188: export function bossKey(bossId: string): string {
212:   if (!byAsc || !found) return null;
213:   const entry = byAsc[found.key]!;
214:   const fightsAt = (key: string) => byAsc[key]?.fights ?? 0;
215:   const counts = Object.entries(entry.parts ?? {}).map(([id, range]) => ({ id, count: Math.max(1, Math.round(range.count_per_fight ?? 1)) }));
216:   if (counts.length === 0) return null;
217:   const order = BOSS_POSITIONS[key] ?? [];
218:   const minion = (id: string) => Object.keys(db.monsters[id]?.powers ?? {}).includes("MINION_POWER");
219:   const ids = order.length > 0 && order.every((id) => counts.some((c) => c.id === id))
239:     const estimated: Record<string, string> = {};
240:     for (const [powerId, power] of Object.entries(mon?.powers ?? {})) {
241:       if (OUR_DEBUFFS.has(powerId)) continue;
242:       const byTurn = Object.entries(power.turn_at_first_sight_by_asc ?? {}).filter(([key]) => fightsAt(key) > 0);
243:       const onTurn1 = byTurn.reduce((sum, [, turns]) => sum + (turns["1"] ?? 0), 0);
244:       const fights = byTurn.reduce((sum, [key]) => sum + fightsAt(key), 0);
245:       if (fights === 0 || onTurn1 < INNATE_POWER_SHARE * fights) continue;
246:       // At the run's ascension: as logged there, else the nearest logged one's moved by the measured change.
247:       const at = startAmountAt(db.monsters, id, powerId, asc);
248:       const amount = at?.value ?? Number(modeKey(power.amount_at_first_sight) ?? 1);
273:       unmodelled.push(SILENT_EARRING_OPENING_LIMIT);
274:     }
275:     const rule = FIGHT_START_RELICS[id];
276:     if (rule) {
277:       const effect = rule(typeof raw["stack"] === "number" ? (raw["stack"] as number) : null);
278:       if (effect) {
279:         for (const [k, v] of Object.entries(effect) as [keyof FightStartRelic, number][]) total[k] += v;
280:         applied.push(name);
504:   const { handBase: _handBase, solver, ...boardInput } = board;
505:   // Random potions (a card choice, draws) stay out of the fight as in any logged board: potion-mc prices them live.
506:   const potions = solver.hand.filter((card) => card.type === "Potion" && !isRandomPotion(potionIdOf(card.cardId)));
507:   const meta = { ...fightMetaOf(s, knowledge, createScreenMemory("COMBAT")), kind: "boss" as const, t: 1 };
508:   const input: RolloutInput = {
509:     ...boardInput,
510:     ...(observedRoyalPoisonOpeningLoss(state) > 0 ? { openingHpLoss: observedRoyalPoisonOpeningLoss(state) } : {}),
511:     solver: { ...solver, hand: potions, cardsPlayedThisTurn: 0, turn: 1, player: { ...solver.player, hp: s.run?.current_hp ?? entryHp } },
517:     gates: null,
518:     fightRelics: fightRelicsOf(asRecord(s.run?.raw), 1),
519:     options: { drawFirst: synth.draw },
520:   };
521:   return { input, boss: opening, relics: { applied: synth.relics.applied, unmodelled: synth.relics.unmodelled }, entryHp: s.run?.current_hp ?? entryHp, maxHp: s.run?.max_hp ?? entryHp };
522: }
```

## agent/tools/boss-sim/backtest-board.ts

原清单 SHA 与 Git blob 一致；SHA256 `0146ae6016a4b8063ecac6b762ace0f92cf4f4ec1da23e856912e19c86eff05d`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
85:   const pileCtx = { enemyTargets: targets, strength: 0, weak: false };
86:   const view = asRecord(asRecord(state.raw["agent_view"])["combat"]);
87:   const hasPiles = Array.isArray(view["draw"]) || Array.isArray(view["discard"]);
88:   let draw = hasPiles ? pileCardModels(state, knowledge, "draw", pileCtx) : [];
89:   const discard = hasPiles ? pileCardModels(state, knowledge, "discard", pileCtx) : [];
90:   if (!hasPiles) {
91:     const left = deckModels(state, knowledge);
92:     for (const card of solver.hand) {
93:       const at = left.findIndex((c) => cardKey(c) === cardKey(card));
94:       if (at >= 0) left.splice(at, 1);
95:     }
96:     draw = left;
97:   }
98:   const { handBase, ...boardInput } = board;
101:   const fightRelics = fightRelicsOf(asRecord(state.run?.raw), solver.turn ?? meta.t);
102:   const input: RolloutInput = { ...boardInput, plans: result.plans, piles: { draw, discard, handBase }, meta, mm, model: null, gates: null, fightRelics, ...(random.sources.length > 0 ? { randomPotions: random.sources } : {}) };
103:   return { input, solver, plans: result.plans, piles: hasPiles ? "logged" : "deck-minus-hand" };
104: }
105: 
106: 
107: /**
108:  * The kill order the sim's later turns follow where the fight's plan is known (experience queen-plan, the boss clock's
```

## agent/src/v6/card-results-input.ts

原清单 SHA 与 Git blob 一致；SHA256 `e97693610a7a0f71eb21df7d2f7d624576ce47f2d4cd66ab9fd45e98f4165de4`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
32:       return built ? { ...built, labels: [...built.labels, "immediate_entry_hp_assumed_current_hp_not_route_forecast"] } : null;
33:     },
34:     prepareElite(target, option) {
35:       const encounter = db.encounters[target.boss]; if (!encounter?.by_asc) return null;
36:       // Reuse the observed boss-opening builder's HP, move and power rules with this encounter's recorded parts.
37:       // Encounter keys are the builder's exact turn-one initial IDs, joined by "+";
38:       // spawned minions in monsters[].encounters must not be added to that opening.
39:       const counts = new Map<string, number>();
48:       }));
49:       if (!Object.keys(byAsc).length) return null;
50:       const models = { db: { ...db, bosses: { ...db.bosses, [target.boss]: byAsc } } };
51:       const built = v6ProjectionStart({ state: input.situation.state, knowledge: env.knowledge,
52:         targets: { character: r.character as Character, ascension: r.ascension, act: r.act, floor: target.floor,
53:           visible: [{ act: r.act, floor: target.floor, boss: target.boss }], observations: [], doubleBoss: null },
54:         currentRouteHp: env.state.run?.current_hp ?? null, doubleBoss: null, models }, { ...target, kind: "current" }, option.state);
55:       if (!built) return null;
```

## agent/src/knowledge/monster-db.ts

原清单 SHA 与 Git blob 一致；SHA256 `4a7e53cb17630b19e835e0da272fe52cc283633ef3a646d03f1f2935a772d81c`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
123:  * records at all, and an older combined file (pinned test data) keeps its own.
124:  */
125: export function mergeMonsterRecords(common: Record<string, unknown>, records: Record<string, unknown> | null): Record<string, unknown> {
126:   if (!records) return common;
127:   const threat = isObject(records["threat_by_asc"]) ? records["threat_by_asc"] : {};
128:   const monsters: Record<string, unknown> = {};
129:   for (const [id, entry] of Object.entries(isObject(common["monsters"]) ? common["monsters"] : {})) {
130:     if (!isObject(entry)) {
149:     ...(meta !== undefined ? { meta } : {}),
150:     bosses: isObject(records["bosses"]) ? records["bosses"] : {},
151:     encounters: isObject(records["encounters"]) ? records["encounters"] : {},
152:     monsters,
153:     ...rest,
154:   };
155: }
156: 
```

## agent/tools/logdb/extract.py

Git HEAD 对照，原运行时清单未覆盖此 helper；不是额外冻结证明；SHA256 `57fd2d330e4c5ac9d5b284bb4addda240eab246d15abf9ba48e7a5e1b4304545`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
189: 
190: 
191: def parse_state_line(raw):
192:     """The state entry without its agent_view copy (a second rendering of the same state, about a third of the
193:     line): the part before `,"agent_view":` closed with "}}". Falls back to the full line."""
194:     cut = raw.rfind(AGENT_VIEW)
195:     if cut > 0:
196:         try:
```

## agent/src/sim/boss-sim.ts

原清单 SHA 与 Git blob 一致；SHA256 `f30a0c5bdd66d63b7ccd962947735ca2dfded2eaec76dd364f5e90fec0aafac6`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
312:     timeUp,
313:     turns: records.length,
314:     hpLoss: died ? lossCap : Math.min(lossCap, Math.max(0, lost)),
315:     revived: records.reduce((sum, r) => sum + (r.revived ?? 0), 0),
316:     drunk: records.flatMap((r) => r.drunk ?? []),
317:     enemyHpLeft: Math.round(enemyHpLeft * 10) / 10,
318:     lossByTurn: records.map((r) => Math.round(r.loss * 10) / 10),
319:     dmgByTurn: records.map((r) => Math.round(r.dmg * 10) / 10),
320:     incomingByTurn: records.map((r) => r.snap.E.reduce((sum, e) => sum + (e[5] ? e[7] : 0), 0)),
321:     enemyLossByTurn: records.map((r) => Math.round(r.enemyPart * 10) / 10),
322:     enemyHpByTurn: records.map((r) => (r.hpLeft ? Object.values(r.hpLeft).reduce((sum, hp) => sum + hp, 0) : r.snap.E.reduce((sum, e) => sum + (e[5] ? Math.max(0, e[2]) : 0), 0))),
323:     blockByTurn: records.map((r) => Math.round(r.blockGained ?? 0)),
324:     powers: records.flatMap((r, t) => (r.powers ?? []).map((id): [number, string] => [t + 1, id])),
325:     drinks: records.flatMap((r, t) => (r.drunk ?? []).map((id): [number, string] => [t + 1, id])),
326:     kills: killsOf(input, records),
327:     policyTurns,
328:     policyNodes,
```

## agent/src/reflex/rollout.ts

原清单 SHA 与 Git blob 一致；SHA256 `4e7dbe020d98526aa2ca033302894deb77a817916449ff7e7b1a55bc2e57d5a4`；commit `cf3372505b85e8df72e99cb9b5455c9f42b25e1a`。

```text
979:  * the pile leave the pile shuffled as before (the caller built them from this pile; never expected).
980:  */
981: export function sampledDrawPile(piles: RolloutInput["piles"], random: () => number): CardModel[] {
982:   const top = piles.drawTop;
983:   if (!top || top.length === 0) return shuffle(piles.draw, random);
984:   const valid = top.every((at, i) => Number.isInteger(at) && at >= 0 && at < piles.draw.length && top.indexOf(at) === i);
985:   if (!valid) return shuffle(piles.draw, random);
986:   const known = new Set(top);
987:   // SL_RETRY_KNOWN_INSERTS: the added cards at random places among all of them (indices that do not name other distinct
988:   // cards of the pile: the known order as before, the added cards shuffled with the rest).
2890:       cards.push(withStrength(card, player, cards.length, targets));
2891:     }
2892:     const drawing = fullFight ? knownDraws(cards, piles, player, targets) : null;
2893:     const potions = noPotions ? [] : fullFight ? sampledPotions(held, input, seed, 0, cards, piles, player, targets, drawing?.known) : held;
2894:     firstHand = [...(drawing?.hand ?? cards), ...potions];
2895:     firstBase = [...bases, ...potions.map(() => null)];
2896:     firstKnown = drawing?.known;
2897:     // The decision turn's known pile top (SL_RETRY_KNOWN_DRAWS) is not this turn's: its draws come off the sample's pile.
3122:     const scale = withLookahead(policyWeights(opts, pSim, sims), fullFight ? lookaheadOf(opts, enemies, input, player, pSim.hp) : null);
3123:     // A whole fight: the draw cards draw known cards (knownDraws), which the line can play.
3124:     const drawing = fullFight ? knownDraws(hand, piles, player, targets) : null;
3125:     const played = drawing?.hand ?? hand;
3126:     const potionsNow = fullFight ? sampledPotions(potions, input, seed, h, played, piles, player, targets, drawing?.known) : potions;
3127:     const turnSolver: SolverInput = { ...rest, ...focus, ...wither, ...scale, hand: [...played, ...potionsNow], player: pSim, enemies: sims, turn: (s.turn ?? 1) + h, cardsPlayedThisTurn: 0, maxNodes: policyNodes,
3128:       ...(Number.isFinite(deadline) ? { deadline: budget.start + deadline, deadlineNow: budget.now } : {}) };
3129:     const solved = solveTurn(turnSolver);
```
