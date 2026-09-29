/**
 * Fix batch H (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-h, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, DecisionEnv } from "../src/project/types.js";
import { actOfFloor, planMap } from "../src/screens/map.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planSelection } from "../src/screens/selection.js";
import { noteScreenChange } from "../src/loop.js";
import { parseGameState } from "../src/mod/schema.js";
import { DeepSeekAnswerError, DeepSeekClient } from "../src/llm/deepseek.js";
import { planRest } from "../src/screens/rest.js";
import { bossMechanic, bossProfile, giantBlockRecord, giantBlockText, setUnblockedSharesForTests, type GiantKillRow } from "../src/strategy/boss-clock.js";
import { bossNote } from "../src/project/run-journal.js";
import { sendJson, startTestServer, type TestServer } from "./support.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { distinctPlans, solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { logged, loggedEnv, type Logged } from "./logged.js";

type Raw = Record<string, unknown>;

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}
const strike = (i: number, damage = 6) => card(i, "STRIKE_IRONCLAD", { name: "打击", damage, damageBase: damage });
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

const keysOf = (decision: AskDecision): string[] => {
  const question = decision.questions["pick"]!;
  return Object.keys(question.type === "choice" ? question.criteria ?? {} : {}).sort();
};
const criteriaOf = (decision: AskDecision, key: string): Raw => {
  const question = decision.questions["pick"]!;
  return JSON.parse(String(question.type === "choice" ? question.criteria[key] : "{}")) as Raw;
};
/** A DeepSeek answer as the loop hands it to resolve (its extra fields in raw). */
const deepseekPick = (key: string, raw: Raw = {}): AnswerSet => ({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...raw } } }) as AnswerSet;
const jevPick = (key: string, nouls: Record<string, number> = {}): AnswerSet =>
  ({
    pick: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} },
    ...Object.fromEntries(Object.entries(nouls).map(([question, noul]) => [question, { type: "noul", noul, raw: {} }])),
  }) as AnswerSet;

describe("1. White Beast Statue: code no longer discards a potion on the map; a fight node gets \"discard, then travel\" for the decider (CRY9LDHSKVFB F18)", () => {
  const potions = (fx: Logged): Raw[] => (fx.state["run"] as Raw)["potions"] as Raw[];

  it("the logged F18 map (full belt, two Monsters ahead): Jev's route question carries a discard variant per node, code discards nothing", () => {
    const fx = logged("batch-h/cry9-f18-map-white-beast");
    const env = loggedEnv(fx);
    const decision = planMap(env);
    expect(decision?.label).not.toBe("map/discard-potion");
    expect(decision?.kind).toBe("ask");
    const ask = decision as AskDecision;
    expect(keysOf(ask)).toEqual(["n0", "n0:discard", "n1", "n1:discard"]);
    expect(String(criteriaOf(ask, "n0")["potion_slots"])).toMatch(/^White Beast Statue drops a potion after every fight/);
    expect(criteriaOf(ask, "n0:discard")["discardable_potions"]).toMatchObject({ "0": expect.stringMatching(/^迅捷药水/), "1": expect.stringMatching(/^镣铐药水/) });
    expect(Object.keys(ask.questions).sort()).toEqual(["discard_p0", "discard_p1", "pick"]);
    // Jev keeps its potions: the plain node.
    expect(ask.resolve(jevPick("n1")).intent).toEqual({ action: "choose_map_node", option_index: 1 });
    // Jev discards the Swift Potion, then travels to n1 once the slot is empty.
    const resolved = ask.resolve(jevPick("n1:discard", { discard_p0: 0.8, discard_p1: 0.1 }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 0 });
    resolved.apply?.();
    expect(planMap({ ...loggedEnv(fx), screenMemory: env.screenMemory })).toBeNull();
    potions(fx)[0] = { index: 0, occupied: false, can_discard: false };
    expect(planMap({ ...loggedEnv(fx), screenMemory: env.screenMemory })).toMatchObject({ kind: "act", label: "map/after-discard", intent: { action: "choose_map_node", option_index: 1 } });
  });

  it("DeepSeek's route plan heading into a Monster: travel on or discard first is asked; its failure keeps the plain move", () => {
    const fx = logged("batch-h/cry9-f18-map-white-beast");
    const env: DecisionEnv = { ...loggedEnv(fx), buildDecider: "deepseek" };
    env.screenMemory.routePlan = { runId: "CRY9LDHSKVFB", act: actOfFloor(18), floor: 18, hpPct: 0.8, path: [{ row: 1, col: 4, type: "Monster", hpOnArrival: 0.8 }], summary: "Monster" };
    const decision = planMap(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    expect(decision.label).toBe("map/statue-potion");
    expect(keysOf(decision)).toEqual(["go", "go:discard"]);
    expect(decision.deepseek?.baseline).toMatchObject({ kind: "act", label: "map/route-follow", intent: { action: "choose_map_node", option_index: 1 } });
    expect(decision.resolve(deepseekPick("go")).intent).toEqual({ action: "choose_map_node", option_index: 1 });
    const discard = decision.resolve(deepseekPick("go", { discard: [1] }));
    expect(discard.intent).toEqual({ action: "discard_potion", option_index: 1 });
    // Two slots for one potion is no answer (code does not trim it for the decider).
    expect(decision.resolve(deepseekPick("go:discard", { discard: [0, 1] }))).toMatchObject({ intent: null, fallback: true });
  });

  it("no statue, or a free slot, or a rest site ahead: nothing is added", () => {
    const fx = logged("batch-h/cry9-f18-map-white-beast");
    potions(fx)[1] = { index: 1, occupied: false, can_discard: false };
    expect(keysOf(planMap(loggedEnv(fx)) as AskDecision)).toEqual(["n0", "n1"]);
    const rest = logged("batch-h/cry9-f18-map-white-beast");
    const nodes = ((rest.state["map"] as Raw)["available_nodes"] as Raw[]).map((node) => ({ ...node, node_type: "RestSite" }));
    (rest.state["map"] as Raw)["available_nodes"] = nodes;
    const decision = planMap(loggedEnv(rest));
    expect(decision?.kind === "ask" ? keysOf(decision) : []).not.toContain("n0:discard");
  });
});

describe("2. Pael's Tear: a line ending with energy unspent gives the next turn +2 energy, in the solver and the rollout (Y36HXZ80A8LL F19-F25)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("solver: with the relic, a Strike held back leaves 1 energy for +2 next turn, valued and kept among the distinct lines", () => {
    const hand = [strike(0), strike(1), strike(2)];
    const input = (paelsTears?: number): SolverInput => ({ hand, player: player(paelsTears ? { paelsTears } : {}), enemies: [enemy({ hp: 100, maxHp: 100, attacks: [{ damage: 5, hits: 1 }] })], fightKind: "monster", turn: 2 });
    const plans = solveTurn(input(2)).plans;
    const two = plans.find((plan) => plan.steps.length === 2)!;
    const three = plans.find((plan) => plan.steps.length === 3)!;
    expect(two.outcome.energyLeft).toBe(1);
    expect(two.outcome.nextTurnEnergy).toBe(2);
    expect(three.outcome.nextTurnEnergy).toBeUndefined();
    expect(distinctPlans(plans, 4)).toContain(two);
    // Without the relic the held-back energy is worth nothing: the 2-Strike line is dominated by the 3-Strike one.
    const plain = solveTurn(input()).plans;
    const plainTwo = plain.find((plan) => plan.steps.length === 2)!;
    expect(plainTwo.outcome.nextTurnEnergy).toBeUndefined();
    expect(two.score - plainTwo.score).toBeGreaterThan(0);
    expect(distinctPlans(plain, 4)).not.toContain(plainTwo);
  });

  it("rollout: ending the turn with the energy unspent makes next turn's 3-cost card playable (1 base energy + 2)", () => {
    const WAIT: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const META: FightMeta = { act: 1, t: 1, asc: 9, kind: "hallway", enc: "X", deck: { n: 10, atk: 10, skl: 0, pow: 0, junk: 0, dmg: 30, blk: 0, up: 0 }, relics: 1, max_en: 1 };
    const poke = card(0, "POKE", { damage: 1, damageBase: 1 });
    const big = (i: number) => card(i, "BIG", { cost: 3, damage: 30, damageBase: 30 });
    const run = (paelsTears?: number) => {
      const solver: SolverInput = { hand: [poke], player: player({ energy: 1, ...(paelsTears ? { paelsTears } : {}) }), enemies: [enemy({ hp: 20, maxHp: 20 })], fightKind: "monster", turn: 1 };
      const endTurn = solveTurn(solver).plans.find((plan) => plan.steps.length === 0)!;
      let t = 0;
      return rolloutDecision({
        solver,
        plans: [endTurn],
        enemies: [{ index: 0, id: "X", move: "WAIT", strength: 0, powers: {} }],
        tables: { X: WAIT },
        piles: { draw: Array.from({ length: 10 }, (_, i) => big(10 + i)), discard: [], handBase: [poke] },
        meta: META,
        playerPowers: {},
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 1, horizon: 3, samples: 4, now: () => (t += 0.01) },
      }).lines[0]!;
    };
    const tears = run(2);
    expect(tears.wins).toBe(4);
    expect(tears.turnsToWin).toBe(2);
    expect(run().wins).toBe(0);
  });

  it("the logged F21 T2 board (Battle Trance drawn, 3 energy): a line keeping energy for Pael's Tear is offered and says so", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const decision = planCombatTurn(loggedEnv(logged("batch-h/y36h-f21-t2-paels-tears")));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    const question = decision.questions["plan"]!;
    const lines = Object.values(question.type === "choice" ? question.criteria : {}).map((text) => JSON.parse(String(text)) as Raw);
    const kept = lines.filter((line) => line["next_turn_energy"] !== undefined);
    expect(kept.length).toBeGreaterThan(0);
    for (const line of kept) {
      expect(Number(line["energy_unused"])).toBeGreaterThan(0);
      expect(String(line["next_turn_energy"])).toMatch(/^\+2 energy next turn \(Pael's Tear/);
    }
  });
});

describe("3. Liquid Memories drunk mid-line: the selection takes the card the line named, and the line goes on with it (8KD7ENEY773Y F11 T2)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("Jev's \"Stone Armor, Liquid Memories, Bash+ from it\": the drink notes Bash+, the screen takes Bash+ (not asked), and Bash+ is played next", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const env0 = loggedEnv(logged("batch-h/8kd7-f11-t2-ask"));
    const memory = env0.screenMemory;
    const ask = planCombatTurn(env0);
    if (ask?.kind !== "ask") throw new Error(`expected an ask, got ${ask?.kind}`);
    const question = ask.questions["plan"]!;
    const criteria = question.type === "choice" ? question.criteria : {};
    const key = Object.keys(criteria).find((k) => /液态记忆/.test(String(JSON.parse(String(criteria[k]))["plays"])) && /痛击\+ from 液态记忆/.test(String(JSON.parse(String(criteria[k]))["plays"])));
    expect(key).toBeDefined();
    const chosen = ask.resolve({ plan: { type: "choice", choice: key!, probabilities: { [key!]: 0.9 }, confidence: 0.9, raw: {} } } as AnswerSet);
    expect(chosen.intent).toMatchObject({ action: "play_card" });
    chosen.apply?.();
    // Stone Armor played: the drink, and the card it is for noted.
    const drink = planCombatTurn({ ...loggedEnv(logged("batch-h/8kd7-f11-t2-drink")), screenMemory: memory });
    expect(drink).toMatchObject({ kind: "act", label: "combat/plan-continue", intent: { action: "use_potion", option_index: 0 } });
    expect(memory.potionTake).toMatchObject({ cardId: "BASH", upgraded: true });
    // The "put a card into your hand" screen: Bash+ (index 0), code's, as the line named it.
    const take = logged("batch-h/8kd7-f11-t2-take");
    noteScreenChange(memory, parseGameState(take.state));
    const picked = planSelection({ ...loggedEnv(take), screenMemory: memory });
    expect(picked).toMatchObject({ kind: "act", label: "selection/take-planned", intent: { action: "select_deck_card", option_index: 0 } });
    if (picked?.kind === "act") picked.apply?.();
    expect(memory.potionTake).toBeUndefined();
    // Back in combat with Bash+ (free this turn) in hand: the line goes on, Bash+ at the Cultist.
    const after = logged("batch-h/8kd7-f11-t2-after");
    const hand = (after.state["combat"] as Raw)["hand"] as Raw[];
    const uppercut = logged("batch-h/8kd7-f11-t2-ask");
    const target = ((uppercut.state["combat"] as Raw)["hand"] as Raw[]).find((card) => card["card_id"] === "UPPERCUT")!;
    const at = hand.findIndex((card) => card["card_id"] === "FLAME_BARRIER");
    const bash = ((take.state["selection"] as Raw)["cards"] as Raw[])[0]!;
    hand[at] = { ...target, ...bash, index: at, energy_cost: 0, selected: undefined, playable: true, can_play_result: true };
    noteScreenChange(memory, parseGameState(after.state));
    const next = planCombatTurn({ ...loggedEnv(after), screenMemory: memory });
    expect(next).toMatchObject({ kind: "act", label: "combat/plan-continue", intent: { action: "play_card", card_index: at, target_index: 0 } });
  });
});

describe("4. DeepSeek: an unknown option recovered from the reasoning keeps the answer's \"discard\" slots (batch G note, deepseek.ts)", () => {
  let server: TestServer | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });

  it("\"heal\" is no key, the reasoning concludes o0, the answer names slot 2: the recovered answer discards slot 2, then heals", async () => {
    server = await startTestServer((req, res) => {
      req.on("data", () => undefined);
      req.on("end", () =>
        sendJson(res, 200, { choices: [{ message: { content: '{"choice": "heal", "discard": [2], "reason": "heal; drop the Block Potion for the mailbox"}', reasoning_content: "HP 30/80.\nDecision: o0." } }], usage: { prompt_tokens: 900, completion_tokens: 200 } }),
      );
    });
    const log = join(mkdtempSync(join(tmpdir(), "ds-discard-")), "reasoning.jsonl");
    const client = new DeepSeekClient({ apiKey: "k", baseUrl: server.url, model: "m", timeoutMs: 5000, reasoningEffort: "max", reasoningLog: log });
    // The logged F11 rest (Tiny Mailbox, one free slot for two potions): o0 heal, o0:discard, o1 smith.
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const env: DecisionEnv = { ...loggedEnv(fx), buildDecider: "deepseek", oneshot: "off" };
    const decision = planRest(env) as AskDecision;
    const question = decision.questions["pick"]!;
    const criteria = question.type === "choice" ? question.criteria : {};
    expect(Object.keys(criteria).sort()).toEqual(["o0", "o0:discard", "o1"]);
    const error = await client.choose({}, "Rest?", criteria, { label: "rest/choose" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeepSeekAnswerError);
    const failed = error as DeepSeekAnswerError;
    expect(failed.detail.discard).toEqual([2]);
    const recovered = failed.recoverFrom(criteria)!;
    expect(recovered.option).toBe("o0");
    const answer = failed.answerFrom(recovered);
    expect(answer).toMatchObject({ choice: "o0", discard: [2] });
    // As the loop's accept hands it to resolve: the discard variant, slot 2 first.
    const resolved = decision.resolve(deepseekPick(answer.choice, answer.discard ? { discard: answer.discard } : {}));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 2 });
  });
});

describe("5. The Giant's block-needed record is counted from the fight data, not written in (was \"33 kills, 13 or less 18 won 17\")", () => {
  const KNOWLEDGE = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge");
  const row = (turn: number | null, won: boolean, hp?: number, stacks?: number): GiantKillRow => ({ turn, won, ...(hp === undefined ? {} : { hp, stacks }) });
  // A fixed set (not the refreshing boss-damage.json): need (stacks - HP) 5, 13, 13 won; 17 lost; 20 won, 30 lost; not killed.
  const a8 = [row(7, true, 25, 30), row(9, true, 23, 36), row(9, false, 19, 36), row(null, false)];
  const a9 = [row(9, true, 28, 41), row(7, true, 15, 35), row(12, false, 20, 50)];

  it("the text: kills with HP and stacks, by the block they left to find", () => {
    expect(giantBlockText([...a8, ...a9], "zh")).toBe("A8/A9 有击杀的 6 场：所需格挡（层数 − HP）≤13 的 3 场赢 3，14–19 的 1 场赢 0，≥20 的 2 场赢 1");
    expect(giantBlockText([...a8, ...a9], "en")).toBe("A8/A9 kills (6): block needed (stacks - HP) 13 or less 3/3 won, 14-19 0/1, 20 or more 1/2");
    expect(giantBlockText([row(null, false)], "zh")).toBe("A8/A9 没有记下击杀时 HP 的巨兽对局");
  });

  it("the boss note, the boss mechanic and the guides carry the counted record", () => {
    setUnblockedSharesForTests({ WATERFALL_GIANT: { unblocked_share: 0.3, fights: 7, turns: 70, kills: { "8": a8, "9": a9 } } });
    try {
      const zh = giantBlockRecord("zh");
      const note = bossNote("WATERFALL_GIANT_BOSS", 9)!;
      expect(note).toContain(`（${zh}）`);
      expect(note).not.toContain("18 场赢 17");
      const mechanic = bossMechanic(bossProfile("WATERFALL_GIANT_BOSS")!, 9);
      expect(mechanic).toContain(giantBlockRecord("en"));
      expect(mechanic).not.toContain("17/18");
      for (const name of ["ironclad-guide.md", "ds-handbook.md"]) {
        const text = readFileSync(join(KNOWLEDGE, name), "utf8");
        expect(text, name).toContain("{GIANT_BLOCK_RECORD}");
        expect(text, name).not.toContain("18 场赢 17");
      }
      const client = new DeepSeekClient({ apiKey: "k", baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1000, guideFile: join(KNOWLEDGE, "ironclad-guide.md"), handbookFile: join(KNOWLEDGE, "ds-handbook.md") });
      expect(client.systemPrompt).not.toContain("{GIANT_BLOCK_RECORD}");
      expect(client.systemPrompt.split(zh).length - 1).toBe(3);
    } finally {
      setUnblockedSharesForTests(null);
    }
  });
});
