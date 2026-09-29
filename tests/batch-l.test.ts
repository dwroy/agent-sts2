/**
 * Fix batch L (notes/fix-queue.md "From fix batch K" and "From post-mortems RRMY 5LRZ 5PHF UNRL"): pure bugs. One
 * describe per fix; boards are synthetic or logged fixtures (tests/logged-states/batch-l, out of the rollout-live /
 * potion-mc sweeps), never the refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { DeepSeekClient, severalOptionKeys } from "../src/llm/deepseek.js";
import { endTurnLethalNote, facingFightOf, noteFacing, planCombatTurn } from "../src/screens/combat-plan.js";
import { replayRun } from "../src/project/journal-replay.js";
import { createScreenMemory } from "../src/project/types.js";
import { parseGameState } from "../src/mod/schema.js";
import type { JsonValue } from "../src/util/json.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { modelPotion, potionShell, type CardModel } from "../src/strategy/card-model.js";
import { solveTap, solveTurn, type Plan, type SolverInput } from "../src/strategy/turn-solver.js";
import { loggedKnowledge } from "./logged.js";
import { ask, board, decide, env as oneshotEnv } from "./oneshot-support.js";
import { pendingPickStep, selectingText } from "../src/screens/selection.js";
import { discardableSlots } from "../src/screens/potion-discard.js";
import { planMap, statuePotionOptions } from "../src/screens/map.js";
import { reachableNext, routeMapFromView } from "../src/strategy/route-map.js";
import type { PickOption } from "../src/screens/pick.js";
import { logged, loggedEnv } from "./logged.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;

/** The 5LRZ F37 map: White Beast Statue, a full belt (Fruit Juice, Vulnerable Potion), a Monster node next. */
function statueBoard() {
  const fx = logged("batch-l/5lrz-f37-statue");
  const env = loggedEnv(fx);
  const nodes = ((fx.state["map"] as Raw)["available_nodes"] as Raw[]).map((node) => ({ index: node["index"] as number, row: node["row"] as number, col: node["col"] as number, type: node["node_type"] as string }));
  const go: PickOption = { key: "go", label: "travel on", intent: { action: "choose_map_node", option_index: 0 }, score: 0, why: "the route plan's next node", summary: { travel: "the route plan's next node, keeping every potion" } };
  return { fx, env, nodes, go };
}

describe("3. The discard questions' potion texts have their numbers (5LRZ F37: 「获得{MaxHp}点最大生命值」 in three statue questions)", () => {
  it("discardableSlots fills the template: Fruit Juice +5 max HP, Vulnerable Potion 3", () => {
    const { env } = statueBoard();
    const slots = discardableSlots(env);
    expect(slots.map((slot) => slot.description)).toEqual(["获得5点最大生命值。", "给予3层易伤。"]);
  });

  it("the statue question's discard variant lists them filled, no placeholder left", () => {
    const { env, nodes, go } = statueBoard();
    const options = statuePotionOptions(env, nodes)(go);
    const variant = options.find((option) => option.key === "go:discard")!;
    const listed = (variant.summary as Raw)["discardable_potions"] as Record<string, string>;
    expect(listed).toEqual({ "0": "果汁: 获得5点最大生命值。", "1": "易伤药水: 给予3层易伤。" });
    expect(JSON.stringify(options)).not.toMatch(/\{[A-Za-z]+(?::[A-Za-z]+\(\d*\))?\}/);
  });

  it("an unmeasured value reads as unknown, not as a raw placeholder (Blood Potion's HealPercent is measured: 20%)", () => {
    const { fx } = statueBoard();
    const run = fx.state["run"] as Raw;
    run["potions"] = (run["potions"] as Raw[]).map((potion) =>
      potion["index"] === 0 ? { ...potion, potion_id: "BLOOD_POTION", name: "鲜血药水", description: "回复你最大生命值的[blue]{HealPercent}[/blue]%。" } : { ...potion, potion_id: "MYSTERY_POTION", name: "谜", description: "获得[blue]{Mystery}[/blue]点。" },
    );
    const slots = discardableSlots(loggedEnv(fx));
    expect(slots.map((slot) => slot.description)).toEqual(["回复你最大生命值的20%。", "获得?(数值未知)点。"]);
  });
});

describe("2. White Beast Statue with a full belt: a \"drink it now, then travel\" option for a potion usable on the map, and the Fruit Juice fact (5LRZ F37: Fruit Juice discarded, +5 max HP lost)", () => {
  it("the options: keep all, discard first, and drink Fruit Juice first (the Vulnerable Potion is combat-only: no drink option)", () => {
    const { env, nodes, go } = statueBoard();
    const options = statuePotionOptions(env, nodes)(go);
    expect(options.map((option) => option.key)).toEqual(["go", "go:discard", "go:drink0"]);
    const drink = options[2]!;
    expect(drink.intent).toEqual({ action: "use_potion", option_index: 0 });
    expect(drink.score).toBe(go.score);
    expect((drink.summary as Raw)["potion"]).toBe("果汁: 获得5点最大生命值。");
  });

  it("keep-all says Fruit Juice is drunk by code at the next fight's first decision (its slot is free before the drop), and names the drink option", () => {
    const { env, nodes, go } = statueBoard();
    const keep = statuePotionOptions(env, nodes)(go)[0]!;
    const summary = keep.summary as Raw;
    expect(summary["fruit_juice"]).toMatch(/code drinks 果汁 \(potion slot 0\) by itself at its first decision of the next fight/);
    expect(summary["potion_slots"]).toMatch(/option go:discard\), 果汁 is drunk now on the map \(option go:drink0\) or one is drunk in that fight/);
  });

  it("chosen, it drinks; once the slot shows empty the map travels to the node (map/after-drink)", () => {
    const { fx, env, nodes, go } = statueBoard();
    const drink = statuePotionOptions(env, nodes)(go)[2]!;
    drink.apply!();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "map", option: 0, slot: 0, via: "drink", title: "Monster (row 4, col 6)" });
    // The next frame: slot 0 empty.
    const run = fx.state["run"] as Raw;
    run["potions"] = (run["potions"] as Raw[]).map((potion) => (potion["index"] === 0 ? { ...potion, potion_id: null, name: null, description: null, occupied: false, can_use: false } : potion));
    const next = loggedEnv(fx, { screenMemory: env.screenMemory });
    const decision = planMap(next);
    expect(decision).toMatchObject({ kind: "act", label: "map/after-drink", intent: { action: "choose_map_node", option_index: 0 } });
  });

  it("no statue: no variant", () => {
    const { fx, go } = statueBoard();
    const run = fx.state["run"] as Raw;
    run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "WHITE_BEAST_STATUE");
    const env = loggedEnv(fx);
    expect(statuePotionOptions(env, [{ index: 0, row: 4, col: 6, type: "Monster" }])(go).map((option) => option.key)).toEqual(["go"]);
  });
});

describe("2b. V4 route plan (map/route-plan) with White Beast Statue and a full belt: the drink option rides on the route answer (\"drink\"), as the discard does", () => {
  /** The statue board asked as the V4 route plan, and a legal route from its next node to the boss. */
  function routePlan() {
    const { fx } = statueBoard();
    const env = loggedEnv(fx, { buildDecider: "deepseek" });
    const question = planMap(env) as Extract<ReturnType<typeof planMap>, { kind: "ask" }>;
    const routeMap = question.state["route_map"] as Raw;
    const map = routeMapFromView(routeMap)!;
    const route: string[] = [];
    let at: string | undefined = map.next[0];
    while (at) {
      route.push(at);
      if (map.bosses.includes(at)) break;
      at = reachableNext(map, at).find((id) => map.nodes.has(id));
    }
    return { env, question, routeMap, route: route.join(" ") };
  }

  it("the question lists the drinkable potions (Fruit Juice only: the Vulnerable Potion is combat-only) and the Fruit Juice fact", () => {
    const { question, routeMap } = routePlan();
    expect(question.label).toBe("map/route-plan");
    expect(routeMap["drinkable_potions"]).toEqual({ "0": "果汁: 获得5点最大生命值。" });
    expect(Object.keys(routeMap["discardable_potions"] as Raw)).toEqual(["0", "1"]);
    expect(routeMap["white_beast_statue"]).toMatch(/"drink": \[药水槽编号\]/);
    expect(routeMap["fruit_juice"]).toMatch(/code drinks 果汁 \(potion slot 0\)/);
  });

  it("\"drink\": [0] drinks it first, then the map travels to the route's first node once the slot is empty", () => {
    const { env, question, route } = routePlan();
    const resolved = question.deepseek!.plan!.resolve({ route, reason: "juice first", drink: [0] });
    if ("invalid" in resolved) throw new Error(resolved.invalid);
    expect(resolved.intent).toEqual({ action: "use_potion", option_index: 0 });
    resolved.apply!();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "map", slot: 0, via: "drink" });
    expect(env.screenMemory.routePlan).toBeDefined();
  });

  it("a potion that cannot be drunk here, two drinks, or a drink with a discard is invalid", () => {
    const { question, route } = routePlan();
    const resolve = question.deepseek!.plan!.resolve;
    expect(resolve({ route, reason: "", drink: [1] })).toMatchObject({ invalid: expect.stringMatching(/potion slot 1 cannot be drunk here \(drinkable: 0\)/) });
    expect(resolve({ route, reason: "", drink: [0, 1] })).toMatchObject({ invalid: expect.stringMatching(/drinks 2 potions/) });
    expect(resolve({ route, reason: "", drink: [0], discard: [1] })).toMatchObject({ invalid: expect.stringMatching(/both discards and drinks/) });
  });
});

describe("4. A one-option question answered with several keys (RRMY F24 \"card2,card1\", judged failed and passed to Jev): the first is taken, said so in the reason", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });
  // The RRMY F24 second pick of Feast's two commons (card5 True Grit taken on the first pick).
  const criteria = Object.fromEntries(
    ["card0", "card1", "card2", "card3", "card4", "card6", "card7"].map((key, at) => [key, JSON.stringify({ card: ["重击", "雷霆一击", "突破", "耸肩无视", "铁斩波", "愤怒", "双重打击"][at], code_value: 50 - at })]),
  );
  const reply = (content: string) =>
    startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () => sendJson(res, 200, { choices: [{ message: { content } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
    });

  it("severalOptionKeys: keys or names, comma / 、 / space separated, all must name an option", () => {
    expect(severalOptionKeys("card2,card1", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("card2, card1", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("突破、雷霆一击", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("card2 card1", criteria)).toEqual(["card2", "card1"]);
    expect(severalOptionKeys("card2,card5", criteria)).toBeNull(); // card5 is not offered any more
    expect(severalOptionKeys("card2", criteria)).toBeNull();
  });

  it("choose() acts on the first key and keeps the answer's words, with the note", async () => {
    server = await reply('{"choice":"card2,card1","reason":"Need AoE for Kaiser Crab: Breakthrough and Thunderclap hit both claws."}');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    const answer = await client.choose({ floor: 24 }, "Which card should I add?", criteria, { label: "selection/add" });
    expect(answer.choice).toBe("card2");
    expect(answer.reason).toBe("Need AoE for Kaiser Crab: Breakthrough and Thunderclap hit both claws. [the answer named 2 options (card2,card1) on a one-option question: the first, card2, taken]");
  });

  it("a JSON list as the choice reads the same", async () => {
    server = await reply('{"choice":["card1","card2"],"reason":"AoE"}');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    expect((await client.choose({}, "Which card should I add?", criteria, { label: "selection/add" })).choice).toBe("card1");
  });

  it("a part naming no option still fails as before", async () => {
    server = await reply('{"choice":"card2,读下封底","reason":"x"}');
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000 });
    await expect(client.choose({}, "Which card should I add?", criteria, { label: "selection/add" })).rejects.toThrow('chose unknown option "card2,读下封底"');
  });

  it("the selection's pick count says one card per answer (\"2 of 2\" read as \"pick two now\")", () => {
    expect(selectingText(1, 2, 2)).toBe("pick 2 of 2: one card per answer");
    expect(selectingText(0, 2, 2)).toBe("pick 1 of 2: one card per answer; the next pick is asked after this one");
    expect(selectingText(0, 0, 3)).toBe("pick 1 of 3 (at least 0): one card per answer; any further pick is asked after this one");
  });
});

describe("6. The end-turn lethal note names the Sandpit (UNRL F33 T8: Sandpit 1, \"0 HP lost in all, 0 of it the enemy hits after block\")", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });
  const endLine = (outcome: Partial<Plan["outcome"]>): Plan => ({ steps: [], score: 0, outcome: { dies: true, hpLoss: 0, incomingAfterBlock: 0, heldDamage: 0, sandpitAfter: null, ...outcome } }) as unknown as Plan;

  it("Sandpit at 0 after the enemy turn: said so", () => {
    expect(endTurnLethalNote(endLine({ sandpitAfter: 0 }), false, 80)).toBe(
      " [ending now kills by what the mod's lethal flag does not count: the Sandpit reaches 0 on the enemy turn and eats you whatever the HP (0 HP lost in all, 0 of it the enemy hits after block)]",
    );
  });

  it("other own losses read as before; agreement or a mismatch unchanged", () => {
    expect(endTurnLethalNote(endLine({ hpLoss: 51, incomingAfterBlock: 27 }), false, 40)).toBe(" [ending now kills by what the mod's lethal flag does not count: 51 HP lost in all, 27 of it the enemy hits after block]");
    expect(endTurnLethalNote(endLine({ sandpitAfter: 0 }), true, 80)).toBe("");
    expect(endTurnLethalNote(endLine({ dies: false, sandpitAfter: 2 }), true, 80)).toBe(" [calc mismatch: solver says ending now does not kill, mod says lethal]");
    expect(endTurnLethalNote(undefined, true, 80)).toBe("");
  });

  it(
    "the logged UNRL F33 T8 board: code's line carries the Sandpit note",
    () => {
      rolloutLiveOptions.enabled = false;
      const decision = planCombatTurn(loggedEnv(logged("batch-l/unrl-f33-t8-sandpit")));
      if (decision?.kind !== "act") throw new Error(`expected an act, got ${decision?.kind}`);
      expect(decision.rationale).toContain("the Sandpit reaches 0 on the enemy turn and eats you whatever the HP");
    },
    30_000,
  );
});

describe("7. No potion-cost plumbing left (potionCost / useCost / potionLimit were always 0 / null: deleted so they cannot be re-enabled)", () => {
  const strike = (index: number): CardModel => ({ ...potionShell("X", "x", 0, []), index, key: `c${index}`, cardId: "STRIKE_IRONCLAD", name: "Strike", type: "Attack", cost: 1, exhausts: false, target: "single", validTargets: [0], damage: 6 });
  const input = (): SolverInput => ({
    hand: [strike(0), strike(1), modelPotion("BLOCK_POTION", "block", 0, [])!, modelPotion("STRENGTH_POTION", "strength", 1, [])!],
    player: { hp: 59, maxHp: 68, block: 0, energy: 2, weak: false, vulnerable: false, intangible: false, strengthNow: 0 },
    enemies: [{ index: 0, name: "Boss", hp: 173, maxHp: 173, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 7, hits: 1 }] }],
    fightKind: "boss",
    turn: 1,
  });
  const drinks = (plan: Plan) => plan.steps.filter((step) => step.cardId.startsWith("POTION:")).length;

  it("a potion card has no use cost: an extra cost argument does nothing", () => {
    const withCost = (potionShell as (...args: unknown[]) => CardModel)("BLOCK_POTION", "block", 0, [], 15);
    expect(withCost.flatValue).toBe(0);
    expect((modelPotion as (...args: unknown[]) => CardModel | null)("BLOCK_POTION", "block", 0, [], 15)!.flatValue).toBe(0);
  });

  it("a plan's outcome carries no potionCost", () => {
    const plans = solveTurn(input()).plans;
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) expect("potionCost" in plan.outcome).toBe(false);
  });

  it("no per-turn potion cap: a potionLimit passed in is not read (lines drinking both potions stay)", () => {
    const capped = solveTurn({ ...input(), potionLimit: 0 } as SolverInput);
    expect(capped.plans.some((plan) => drinks(plan) === 2)).toBe(true);
  });
});

describe("5. Surrounded facing: every targeted action that went through turns us, and a restart mid-fight gets it back from the logs (was: only the plan's cards noted it; a restart fell back to startFacing)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
    solveTap.onSolve = null;
  });

  it("noteFacing: an in-combat action with a target sets it, tagged with the fight; no target, or out of combat, leaves it", () => {
    const fx = logged("batch-j/dhgt-f33-t2-wheel");
    const state = parseGameState(fx.state);
    const memory = createScreenMemory(state.screen);
    noteFacing(memory, state, { action: "end_turn" });
    expect(memory.facing).toBeUndefined();
    noteFacing(memory, state, { action: "play_card", card_index: 2, target_index: 1 });
    expect(memory).toMatchObject({ facing: 1, facingFight: "DHGT6Z3Q7VAP:1:33" });
    noteFacing(memory, state, { action: "use_potion", option_index: 0, target_index: 0 });
    expect(memory.facing).toBe(0);
    const map = parseGameState({ ...fx.state, in_combat: false, screen: "MAP" });
    noteFacing(memory, map, { action: "choose_map_node", option_index: 0, target_index: 1 } as never);
    expect(memory.facing).toBe(0);
  });

  /** DHGT F33: T1 (Dismantle -> the Crusher, index 0, logged and executed), then the T2 board a restart reads. */
  function restartLogs(result = "completed: Action completed.") {
    const t1 = logged("batch-j/dhgt-f33-t1-shuriken").state;
    const ts = "2026-09-29T13:07:50.000Z";
    const states = [{ ts, fingerprint: "t1", state: t1 as unknown as JsonValue }];
    const decisions = [{ ts, fingerprint: "t1", run_id: "DHGT6Z3Q7VAP", label: "combat/plan-choice", decider: "jev", chosen: { action: "play_card", card_index: 3, target_index: 0 }, rationale: "Jev chose Dismantle -> 碾碎爪", result }];
    return { runId: "DHGT6Z3Q7VAP", states, decisions: decisions as unknown as Record<string, JsonValue>[], runPlans: [] };
  }

  it("replayRun gives the fight's last facing; a failed action does not turn us; a later out-of-combat state clears it", () => {
    expect(replayRun(restartLogs(), loggedKnowledge).facing).toEqual({ fight: "DHGT6Z3Q7VAP:1:33", index: 0 });
    expect(replayRun(restartLogs("failed (timeout): x"), loggedKnowledge).facing).toBeNull();
    const logs = restartLogs();
    const t1 = logs.states[0]!.state as Record<string, JsonValue>;
    logs.states.push({ ts: "2026-09-29T13:09:00.000Z", fingerprint: "reward", state: { ...t1, in_combat: false, screen: "REWARD" } });
    expect(replayRun(logs, loggedKnowledge).facing).toBeNull();
  });

  it(
    "the restarted T2 board plans with the replayed facing (the Crusher), not startFacing (the Rocket)",
    () => {
      rolloutLiveOptions.enabled = false;
      const { screenMemory: _logged, ...fresh } = logged("batch-j/dhgt-f33-t2-wheel");
      const env = loggedEnv(fresh);
      const replayed = replayRun(restartLogs(), loggedKnowledge).facing!;
      expect(replayed.fight).toBe(facingFightOf(env.state));
      env.screenMemory.facing = replayed.index;
      const inputs: SolverInput[] = [];
      solveTap.onSolve = (input) => inputs.push(input);
      planCombatTurn(env);
      solveTap.onSolve = null;
      expect(inputs[0]!.player.facing).toBe(0);
    },
    30_000,
  );
});

describe("1. Shop removal: the card DeepSeek names is the one removed (UNRL F14: \"打击 120, 防御 110, 受伤 100\" read as code's verdict over the curse; V4 shows no code order)", () => {
  /** The U6RU F22 shop (5 Eternal Strikes) with an Injury curse added and a run plan that removes Defends. */
  function shop() {
    const raw = board("u6ru-f22-shop", "open");
    const run = raw["run"] as Raw;
    const deck = run["deck"] as Raw[];
    const defend = deck.find((card) => card["card_id"] === "DEFEND_IRONCLAD")!;
    deck.push({ ...defend, index: deck.length, card_id: "INJURY", name: "受伤", card_type: "Curse", rarity: "Curse", energy_cost: -1, resolved_rules_text: "不能被打出。", rules_text: "不能被打出。", dynamic_values: [] });
    const memory = createScreenMemory("SHOP");
    memory.runPlan = { remove: ["DEFEND_IRONCLAD"], want: [], avoid: [] } as never;
    const e = oneshotEnv(raw, memory);
    return { raw, e };
  }

  // V4 M2b (docs/v4-build-facts.md): code's removal order is not in the question at all, so there is no ranking to
  // read as a verdict (v3 f8aef72 said its run-plan part apart instead). Each removable card carries its facts.
  it("V4: no code removal order in the question; each removable card carries its outcome stats", () => {
    const { e } = shop();
    const question = ask(decide(e));
    expect(question.state["code_removal_order"]).toBeUndefined();
    expect(JSON.stringify(question.state)).not.toMatch(/removal target|code remove value|reference ranking/);
    const cards = question.state["your_cards"] as Record<string, string>;
    const stats = question.state["your_cards_outcome_stats"] as Record<string, string>;
    const injury = Object.keys(cards).find((key) => cards[key]!.includes("受伤"))!;
    expect(Object.keys(stats)).toContain(injury);
  });

  it("remove:<the curse> names the curse for the removal screen, and that screen removes it over the higher-ranked Defend", () => {
    const { raw, e } = shop();
    const question = ask(decide(e));
    const cards = question.state["your_cards"] as Record<string, string>;
    const injury = Object.keys(cards).find((key) => cards[key]!.includes("受伤"))!;
    const resolved = question.deepseek.plan!.resolve({ plan: [`remove:${injury}`], reason: "the curse" });
    if ("invalid" in resolved) throw new Error(resolved.invalid);
    resolved.apply!();
    expect(e.screenMemory.pendingPick).toMatchObject({ task: "remove", names: ["受伤"] });
    // The removal screen: every removable card offered, the Defends first.
    const deck = (raw["run"] as Raw)["deck"] as Raw[];
    const offered = deck.filter((card) => card["card_id"] !== "STRIKE_IRONCLAD" && card["card_id"] !== "ASCENDERS_BANE").map((card, index) => ({ ...card, index, selected: false }));
    const screen = { ...raw, screen: "CARD_SELECTION", selection: { kind: "deck_card_select", prompt: "选择1张牌移除。", cards: offered, selected: 0, min: 1, max: 1 } };
    const next = oneshotEnv(screen, e.screenMemory);
    const step = pendingPickStep(next, "deck_card_select", "选择1张牌移除。", 0, 1);
    expect(step).toMatchObject({ kind: "act", intent: { action: "select_deck_card", option_index: offered.findIndex((card) => card["card_id"] === "INJURY") } });
  });
});
