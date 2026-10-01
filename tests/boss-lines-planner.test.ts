/**
 * B2 in the combat question (docs/boss-sim.md §11). The switch and scope: with BOSS_SIM_LINES=off a boss fight's combat question and its
 * resolution (the ranking behind rollout_best, the HP guard, code's fallback, the decision log) are byte for byte what
 * they were before B2, and a fight that is not a boss fight is the same with the switch on. Pinned as digests of the
 * whole decision (question, Jev's view, every answer's resolution) computed on the pre-B2 planner, on logged boards,
 * with fake clocks and the knowledge data the planner reads pinned (tests/boss-lines-data/pinned-knowledge.json: the
 * monster DB and move model trimmed to these boards' enemies; any other knowledge file reads as absent), so the
 * digests do not move when the data is refreshed. No model call, nothing written. CAPTURE=1 prints new digests (only
 * meaningful on a planner known to be the pre-B2 one). With B2 on (the same pinned data, few samples, in this thread):
 * the facts on every option, rollout_best from the simulation's ranking for a trusted boss and from the rollout for a
 * low-trust one, code's fallback, the decision log, and the fight plan on the turns it is shown.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE = resolve(HERE, "..", "src", "knowledge");
const unpinned = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "boss-lines-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(KNOWLEDGE + "/") && path.endsWith(".json")) {
      const name = resolve(path).slice(KNOWLEDGE.length + 1);
      if (name in pinned) return JSON.stringify(pinned[name]);
      unpinned.add(name);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...rest);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});

const { logged, loggedEnv } = await import("./logged.js");
const { planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions, BOSS_LINES_SAMPLES } = await import("../src/sim/boss-lines.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;

/** The whole decision as data: the question, Jev's view, and each option's (and no answer's) resolution. */
function digestOf(name: string, jevContext: "off" | "v1"): string {
  const env = loggedEnv(logged(name), { jevContext });
  const decision = planCombatTurn(env);
  if (!decision || decision.kind !== "ask") return JSON.stringify(decision ?? null);
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;
  const low = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.3 }, confidence: 0.3, raw: {} } }) as AnswerSet;
  const res = (answers: AnswerSet) => {
    const { apply: _apply, ...rest } = ask.resolve(answers);
    return rest;
  };
  const view = {
    label: ask.label,
    state: ask.state,
    questions: ask.questions,
    jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key))]), ...keys.map((key) => [`${key}@0.3`, res(low(key))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope"))]]),
  };
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

// 3sbp is a Vantom board, a monster the logged game data (tests/logged-states/game-data.json) does not list: the planner
// sees no boss there, so its digests pin a question B2 never touches.
const BOARDS = ["3sbp-f17-t3-flex", "k8tc-f17-t5", "xmy2-f17-t1", "8v0h-f17-t2-saturated", "ez2l-f48-t2"] as const;

/**
 * Digests of the pre-B2 planner (bd606d9 with the B2 simulator fixes, which leave the planner as it was). The two
 * saturated boards (8v0h, ez2l) re-pinned at fix-queue-v4 #1: the saturated ranking's order and its text changed;
 * 8v0h again at #2 (its Blood Potion line: this turn's loss before the heal).
 */
const GOLDEN: Record<string, string> = {
  "3sbp-f17-t3-flex:off": "54195aef830cffc934ee84d6f8ae5e75",
  "3sbp-f17-t3-flex:v1": "3c062fccc02d0de61026fe8f1b229fec",
  "k8tc-f17-t5:off": "5db5f843d737fd9bef50dd7f9890dfbd",
  "k8tc-f17-t5:v1": "db378ae176302d722581163726dfd044",
  "xmy2-f17-t1:off": "32a8a233cfeb57945f29c8db3a282c89",
  "xmy2-f17-t1:v1": "9f60a44dc7cb4816699ad8053f9715f9",
  "8v0h-f17-t2-saturated:off": "8b438468c96718c5ceccd0e6721c790a",
  "8v0h-f17-t2-saturated:v1": "3e8bd1db016185cc173b00efb6a66b97",
  "ez2l-f48-t2:off": "47ffd87e31b2dff42b0fb6937c4b3ef2",
  "ez2l-f48-t2:v1": "cdaa92575b7d7984b6a937dd7a0b82cb",
  "2mk4-f8-t2-ask:v1": "07448a5e8359434d51b955b91d956810",
};

describe("B2 off: the boss question as before", () => {
  afterEach(() => {
    rolloutLiveOptions.now = null;
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
    bossLinesOptions.enabled = false;
  });

  it("BOSS_SIM_LINES=off: every logged boss board's decision is the pre-B2 one, byte for byte", () => {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = false;
    const got: Record<string, string> = {};
    for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digestOf(name, ctx);
    got["2mk4-f8-t2-ask:v1"] = digestOf("2mk4-f8-t2-ask", "v1");
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN);
    // The rest of the knowledge the planner asked for read as absent (so the digests never follow the refreshed data).
    expect([...unpinned].sort()).toEqual(["fight-value-gates.json", "fight-value.json", "jev-hints.json"]);
  }, 120_000);

  it("a fight that is not a boss fight: the same decision with B2 on", () => {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = true;
    const on = digestOf("2mk4-f8-t2-ask", "v1");
    bossLinesOptions.enabled = false;
    expect(on).toBe(digestOf("2mk4-f8-t2-ask", "v1"));
    expect(on).toBe(GOLDEN["2mk4-f8-t2-ask:v1"]);
  }, 60_000);
});

describe("B2 on: the boss question", () => {
  afterEach(() => {
    rolloutLiveOptions.now = null;
    potionMcOptions.now = null;
    bossLinesOptions.enabled = false;
    bossLinesOptions.serial = false;
    bossLinesOptions.samples = BOSS_LINES_SAMPLES;
    bossLinesOptions.holdHp = null;
  });

  function ask(name: string, enabled: boolean): { decision: AskDecision; criteria: Record<string, Record<string, unknown>> } {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = enabled;
    bossLinesOptions.serial = true;
    bossLinesOptions.samples = 16;
    bossLinesOptions.holdHp = () => null;
    const decision = planCombatTurn(loggedEnv(logged(name), { jevContext: "off" })) as AskDecision;
    const raw = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
    return { decision, criteria: Object.fromEntries(Object.entries(raw).map(([key, text]) => [key, text ? (JSON.parse(text) as Record<string, unknown>) : {}])) };
  }
  const flagged = (criteria: Record<string, Record<string, unknown>>) => Object.keys(criteria).filter((key) => criteria[key]!["rollout_best"] === true);
  const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

  it("a boss it is trusted on (The Kin, turn 5): every line's whole-fight numbers, rollout_best by the simulated win rate, the log", () => {
    const { decision, criteria } = ask("k8tc-f17-t5", true);
    const planKeys = Object.keys(criteria).filter((key) => key.startsWith("plan"));
    for (const key of planKeys) expect(String(criteria[key]!["whole_fight_sim"])).toMatch(/^win \d+% \((the best line|vs the best line [−+±]\d+ ± \d+ pts(, tied on win rate)?)\), .*; 16 samples$/);
    expect(String(decision.state["whole_fight_sim"])).toContain("rollout_best is the line with the highest simulated win rate");
    // The 5-turn rollout's numbers stay.
    for (const key of planKeys) expect(criteria[key]!["rollout"]).toBeDefined();
    const log = decision.resolve(pick("plan1")).log as { boss_sim: { best: string | null; tied: string[]; samples: number; ranked: string[] }; rollout: { best: string | null } };
    expect(log.boss_sim.samples).toBe(16);
    // rollout_best is the simulation's best (or none, when its best lines read the same).
    expect(flagged(criteria)).toEqual(log.boss_sim.best ? [log.boss_sim.best] : []);
    expect(log.rollout.best).toBe(log.boss_sim.best);
    // Turn 5: no fight plan (turn 1 and every 3rd turn after: 4, 7, ...).
    expect(decision.state["whole_fight_plan"]).toBeUndefined();
    // No usable answer: code plays the simulation's best potion-free line.
    expect(decision.resolve({} as AnswerSet).rationale).toContain("using the whole-fight simulation's best potion-free plan");
  }, 120_000);

  it("a low-trust boss (the Queen): the numbers as information, rollout_best still the 5-turn rollout's", () => {
    const off = ask("ez2l-f48-t2", false);
    const on = ask("ez2l-f48-t2", true);
    expect(flagged(on.criteria)).toEqual(flagged(off.criteria));
    for (const key of Object.keys(on.criteria).filter((k) => k.startsWith("plan"))) expect(String(on.criteria[key]!["whole_fight_sim"]).startsWith("low confidence: ")).toBe(true);
    expect(String(on.decision.state["whole_fight_sim"])).toContain("Low confidence for this boss");
    expect(on.decision.resolve({} as AnswerSet).rationale).toBe(off.decision.resolve({} as AnswerSet).rationale);
  }, 120_000);

  it("turn 1: the fight plan from the best line's samples", () => {
    const { decision } = ask("xmy2-f17-t1", true);
    expect(String(decision.state["whole_fight_plan"])).toMatch(/^the simulation's best line, from its samples \(information, not an order\): .*(the boss dies ~T\d+|no plan wins in most samples)/);
  }, 120_000);
});
