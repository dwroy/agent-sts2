/**
 * SL_JUDGE_ANY_DRAW (docs/sl.md §2.3; Dai 2026-10-03: SL only on a true certain death, so the draw veto may be lifted only
 * when the death holds for every draw): the planner's any-draw bound (combat-plan anyDrawBound) and the judge on it, on
 * logged boards (tests/sl-any-draw-data, make-fixtures.ts) and boards made from them, with the knowledge data the planner
 * reads pinned from v4 124fef7 (pinned-knowledge.json) and fake clocks, as tests/sl-early-planner.test.ts does. Nothing
 * under logs/ or .cache is read, nothing is written.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "sl-any-draw-data");
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
  const shared = [join(ROOT, "logs"), join(ROOT, ".cache")];
  const watch = (name: string, write: boolean) => {
    const original = (fs as unknown as Record<string, (...args: unknown[]) => unknown>)[name]!;
    return (path: unknown, ...rest: unknown[]) => {
      const at = typeof path === "string" ? resolve(path) : String(path);
      if (write || shared.some((dir) => at === dir || at.startsWith(dir + "/"))) touched.add(`${name} ${at}`);
      return original(path, ...rest);
    };
  };
  const wrapped: Record<string, unknown> = {};
  for (const name of ["existsSync", "statSync", "lstatSync", "readdirSync", "openSync"]) wrapped[name] = watch(name, false);
  for (const name of ["writeFileSync", "appendFileSync", "mkdirSync", "renameSync", "rmSync", "unlinkSync", "copyFileSync", "createWriteStream"]) wrapped[name] = watch(name, true);
  const read = watch("readFileSync", false);
  wrapped["readFileSync"] = (path: unknown, ...rest: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(KNOWLEDGE + "/") && path.endsWith(".json")) {
      const name = resolve(path).slice(KNOWLEDGE.length + 1);
      if (name in pinned) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return read(path, ...rest);
  };
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

vi.resetModules();
const { readFileSync } = await import("node:fs");
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = true;
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { anyDrawOptions, drawBoundOf, leastLossFactsOf, planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
const { judgeEndTurn, judgeLeastLossNow, LEAST_LOSS_LABEL } = await import("../src/sl/judge.js");
const { SlController } = await import("../src/sl/controller.js");
const { RunJournal } = await import("../src/project/run-journal.js");
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type GameState = import("../src/mod/schema.js").GameState;
type SlConfig = import("../src/config.js").SlConfig;
type Raw = Record<string, unknown>;

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);
const board = (name: string): Raw => structuredClone((JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as { state: Raw }).state);

function envOf(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], jevContext: "v1",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  } as DecisionEnv;
}

/** The planner's decision on a board, its least-loss facts and bound, and the judge with the switch off (no bound) and on. */
function judged(raw: Raw) {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  const env = envOf(raw);
  const decision = planCombatTurn(env);
  const facts = leastLossFactsOf(decision);
  const bound = drawBoundOf(facts);
  const context = { label: decision?.label ?? "", revives: [], knowledge };
  const off = judgeEndTurn(env.state, context);
  const on = judgeEndTurn(env.state, { ...context, ...(bound ? { drawBound: bound } : {}) });
  const early = (withBound: boolean) =>
    judgeLeastLossNow(env.state, { revives: [], facts, knownDrawsJudge: true, addedToPile: false, knowledge, ...(withBound && bound ? { drawBound: bound } : {}) });
  return { state: env.state, decision, facts, bound: bound?.() ?? null, off, on, early };
}

const saved = { ...anyDrawOptions };
afterEach(() => {
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  Object.assign(anyDrawOptions, saved);
});

/**
 * R764's board made into one where Offering does not kill (10 HP, the Knowledge Demon at 300 HP attacking for 18, its
 * curses and Daughter of the Wind gone): Offering leaves 4 HP and 3 energy, and the draw pile decides. `pile` keeps the
 * draw pile's lines whose card id it accepts.
 */
function offeringBoard(pile: (id: string) => boolean = () => true): Raw {
  const raw = board("r764-f33-t10-offering");
  const combat = raw["combat"] as Raw;
  const player = combat["player"] as Raw;
  player["current_hp"] = 10;
  ((combat["players"] as Raw[])[0] as Raw)["current_hp"] = 10;
  player["powers"] = (player["powers"] as Raw[]).filter((power) => power["power_id"] === "STRENGTH_POWER");
  const enemy = (combat["enemies"] as Raw[])[0]!;
  enemy["current_hp"] = 300;
  Object.assign((enemy["intents"] as Raw[])[0]!, { damage: 18, total_damage: 18, label: "18" });
  const run = raw["run"] as Raw;
  run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "DAUGHTER_OF_THE_WIND");
  const view = (raw["agent_view"] as Raw)["combat"] as Raw;
  view["draw"] = (view["draw"] as Raw[]).filter((line) => pile(String((line["card_ids"] as string[])[0])));
  return raw;
}
/** The draw pile without the block cards (Flame Barrier, Defend) and the cards the superset board does not simulate exactly (Primal Force reads the hand, the enchanted Sword Boomerang+). */
const noBlock = (id: string) => !["FLAME_BARRIER", "DEFEND_IRONCLAD", "PRIMAL_FORCE", "SWORD_BOOMERANG"].includes(id);

describe("the drawing card's own cost (ops 2026-10-03, R764HJWMJQ3V F33 T10: died with 6 attempts unused)", () => {
  it("5 HP, 3 block, 1 energy, only Offering (lose 6 HP) in hand against the Knowledge Demon's 24: certain, naming its own cost", () => {
    const { decision, facts, bound, off, on } = judged(board("r764-f33-t10-offering"));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    expect(decision?.kind === "act" && decision.intent.action).toBe("end_turn");
    expect(facts).toMatchObject({ draws: true, drawsKnown: false });
    expect(bound).toMatchObject({ drawing: ["祭品"], refused: null, fatal: [{ name: "祭品", hpLoss: 6 }] });
    // Switched off (no bound): the veto as at 124fef7.
    expect(off).toMatchObject({ certain: false, tier: null, reason: "the planner sees every line die, but 祭品 draws (unknown cards)" });
    expect(on.certain).toBe(true);
    expect(on.tier).toBe("least-loss");
    expect(on.reason).toMatch(/^the turn planner: every simulated line dies and ending the turn keeps the most HP; 24 incoming vs 5 HP \+ 3 block \+ 0 end-of-turn block; 祭品 draws, but dies with any draw: 祭品's own cost \(lose 6 HP\) kills us at 5 HP before a card is drawn; every line that plays it dies there \(\d+ ms\)$/);
    expect([...touched]).toEqual([]);
  }, 120_000);

  it("at 7 HP Offering leaves 1: no longer its own cost; the superset board decides (the Demon at 3 HP: a drawn Anger kills it)", () => {
    const raw = board("r764-f33-t10-offering");
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["current_hp"] = 7;
    ((combat["players"] as Raw[])[0] as Raw)["current_hp"] = 7;
    const { bound, on } = judged(raw);
    expect(bound?.fatal).toBeUndefined();
    expect(bound?.superset).toMatchObject({ cards: 22, drawPile: 22, allDie: false });
    expect(on.certain).toBe(false);
    expect(on.reason).toMatch(/not with any draw: a line lives on the superset board \(the hand \+ 22 card\(s\) of the draw pile\): some draw may save us$/);
  }, 120_000);
});

describe("the superset board: every card of the draw pile in hand once a drawing card is played", () => {
  it("a block card in the pile saves us (Offering, then Flame Barrier and a Defend): not certain", () => {
    const { decision, bound, on } = judged(offeringBoard());
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    expect(bound?.superset).toMatchObject({ allDie: false, truncated: false });
    expect(on.certain).toBe(false);
    expect(on.reason).toContain("a line lives on the superset board");
  }, 120_000);

  it("no card of the pile saves us: certain, naming the drawing card and the superset's size", () => {
    const { decision, bound, on, early } = judged(offeringBoard(noBlock));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    expect(bound?.superset).toMatchObject({ cards: 14, drawPile: 14, excluded: [], inexact: [], allDie: true, aliveAfterDraw: ["祭品"], truncated: false });
    expect(on.certain).toBe(true);
    expect(on.reason).toMatch(/祭品 draws, but dies with any draw: every line dies on the superset board, the hand \+ 14 card\(s\) of the draw pile \(\d+ positions, \d+ ms\)$/);
    // The early reload: the same bound lifts its "a line draws cards not exactly known".
    expect(early(false).reason).toMatch(/draws \(unknown cards\)$/);
    expect(early(true)).toMatchObject({ certain: true, early: true });
  }, 120_000);

  it("its search cut short (the node limit): not certain", () => {
    anyDrawOptions.maxNodes = 3;
    const { bound, on } = judged(offeringBoard(noBlock));
    expect(bound?.superset).toMatchObject({ truncated: true, timedOut: false });
    expect(on.certain).toBe(false);
    expect(on.reason).toContain("not with any draw: the superset board's search was cut short (3 positions;");
  }, 120_000);

  it("an unmodelled card in the pile, and a line living past the draw: not certain", () => {
    const raw = offeringBoard(noBlock);
    (((raw["agent_view"] as Raw)["combat"] as Raw)["draw"] as Raw[]).push({ line: "神秘之牌 [1费]：发生了一些事。", card_ids: ["MYSTERY_CARD"], keywords: [], mods: [] });
    const { bound, on } = judged(raw);
    expect(bound?.superset?.inexact).toContain("MYSTERY_CARD is not modelled");
    expect(bound?.superset?.aliveAfterDraw).toEqual(["祭品"]);
    expect(on.certain).toBe(false);
    expect(on.reason).toContain("MYSTERY_CARD is not modelled not simulated exactly, and a line has HP left after 祭品");
  }, 120_000);

  it("the pile's own numbers (NJSZDS6U5X9G F25 T9: Perfected Strike 18 in the pile, 6 in the deck entry; Battle Trance drew it and the Beetle died): not certain", () => {
    const { decision, bound, on, early } = judged(board("njsz-f25-t9-battle-trance"));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    expect(bound?.superset).toMatchObject({ allDie: false });
    expect(on.certain).toBe(false);
    expect(on.reason).toContain("a line lives on the superset board");
    expect(early(true).certain).toBe(false);
  }, 120_000);

  it("24UZ3PZNLKTQ F17 T12 (9 HP against 23, Shrug It Off draws): every line dies with all 5 pile cards in hand: certain, early too", () => {
    const { decision, bound, on, early } = judged(board("24uz-f17-t12-shrug"));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    expect(bound?.superset).toMatchObject({ cards: 5, inexact: [], allDie: true, truncated: false });
    expect(on.certain).toBe(true);
    expect(on.reason).toContain("耸肩无视 draws, but dies with any draw: every line dies on the superset board, the hand + 5 card(s) of the draw pile");
    expect(early(true)).toMatchObject({ certain: true, early: true });
    expect(early(false).certain).toBe(false);
  }, 120_000);

  it("a number worked out in play (Perfected Strike's Strikes) or a relic changing a card (Pael's Legion's block) is not exact: the bound needs no line living past the draw", () => {
    const raw = offeringBoard(noBlock);
    (((raw["agent_view"] as Raw)["combat"] as Raw)["draw"] as Raw[]).push({ line: "完美打击 [2费]：造成6点伤害。 你每有一张名字中含有“打击”的牌，伤害+2。", card_ids: ["PERFECTED_STRIKE"], keywords: [], mods: [] });
    const { bound, on } = judged(raw);
    expect(bound?.superset?.inexact).toContain("完美打击's number is worked out in play");
    expect(on.certain).toBe(false);
    const legion = offeringBoard(noBlock);
    ((legion["run"] as Raw)["relics"] as Raw[]).push({ index: 20, relic_id: "PAELS_LEGION", name: "佩尔的士兵", description: "将你从一张卡牌中获得的[gold]格挡[/gold]翻倍，然后此遗物会休眠[blue]{Turns}[/blue]回合。", stack: null });
    (((legion["agent_view"] as Raw)["combat"] as Raw)["draw"] as Raw[]).push({ line: "防御 [1费]：获得5点格挡。", card_ids: ["DEFEND_IRONCLAD"], keywords: ["格挡"], mods: [] });
    const withLegion = judged(legion);
    expect(withLegion.bound?.superset?.inexact).toContain("PAELS_LEGION changes 防御");
    expect(withLegion.on.certain).toBe(false);
  }, 120_000);

  it("W5PTC48C3B1H F33 T9: Battle Trance left in hand under No Draw: nothing can be drawn: certain", () => {
    const { decision, bound, off, on } = judged(board("w5pt-f33-t9-no-draw"));
    expect(decision?.label).toBe(LEAST_LOSS_LABEL);
    expect(bound).toMatchObject({ refused: null, noDraw: "No Draw" });
    expect(off.certain).toBe(false);
    expect(on.certain).toBe(true);
    expect(on.reason).toContain("战斗专注 draws, but dies with any draw: nothing can be drawn this turn (No Draw)");
  }, 120_000);
});

describe("SlController with SL_JUDGE_ANY_DRAW on and off (R764 F33 T10, no retry left: the verdict is only said)", () => {
  bossLinesOptions.enabled = false;
  const slConfig = (judgeAnyDraw: boolean): SlConfig => ({
    enabled: true, bossRetries: 0, eliteRetries: 0, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw, reloadEarly: true,
    retryKnownInserts: true, retryKnownTop: true, retryExplore: false, retryExploreB2: false, retryExploreBossPotions: false, retryExploreOrder: false, retryExploreReplay: false,
    retryExploreCanon: false, retryExploreTurn: false, retryExploreWhole: false, retryKnownPicks: true, log: null, stepTimeoutMs: 5_000,
  });
  const run = async (judgeAnyDraw: boolean) => {
    const raw = board("r764-f33-t10-offering");
    const { decision, facts, state } = judged(raw);
    const notes: string[] = [];
    const client = { state: async (): Promise<GameState> => state, act: async () => { throw new Error("no action expected"); } };
    const sl = new SlController({ config: slConfig(judgeAnyDraw), knowledge, client: client as never, note: (message) => notes.push(message) });
    const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
    sl.observe(state, memory);
    const outcome = await sl.beforeEndTurn(state, { label: decision!.label, screenMemory: memory.screenMemory, journal: memory.journal, facts });
    return { outcome, notes, describe: sl.describe() };
  };

  it("on: certain (no retry left, the turn ends as usual and says why); off: the veto as at 124fef7", async () => {
    const on = await run(true);
    expect(on.outcome).toEqual({ handled: false });
    expect(on.describe).toMatchObject({ judge_any_draw: true });
    expect(on.notes.at(-1)).toMatch(/^SL: certain death foreseen at F33 T10 attempt 1\/1 \(.*祭品's own cost \(lose 6 HP\) kills us at 5 HP before a card is drawn.*\); no retry left, the turn ends as usual$/);
    const off = await run(false);
    expect(off.outcome).toEqual({ handled: false });
    expect(off.describe).toMatchObject({ judge_any_draw: false });
    expect(off.notes.at(-1)).toBe("SL: ending the turn may be lethal (F33 T10 attempt 1/1), not certain: the planner sees every line die, but 祭品 draws (unknown cards)");
  }, 120_000);
});
