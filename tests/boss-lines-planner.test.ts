/**
 * B2 in the combat question (docs/boss-sim.md §11). The switch and scope: with BOSS_SIM_LINES=off a boss fight's combat question and its
 * resolution (the ranking behind rollout_best, the HP guard, code's fallback, the decision log) are byte for byte what
 * they were before B2, and a fight that is not a boss fight is the same with the switch on. Pinned as digests of the
 * whole decision (question, Jev's view, every answer's resolution) computed on the pre-B2 planner, on logged boards,
 * with fake clocks and the knowledge data the planner reads pinned (tests/boss-lines-data/pinned-knowledge.json, made
 * by make-pinned.py from a fixed commit's data: the monster DB and move model trimmed to these boards' enemies and the
 * monsters of the lessons shown, the experience base whole, the boss records and the potion table trimmed to these
 * boards' bosses and potions; any other knowledge file reads as absent), so the digests do not move when the data is
 * refreshed. The setup files (vitest.config.ts) import planner modules before this file's mock is in place, and those
 * modules (the potion table, boss-clock's boss records, the experience base, the monster DB) bound the real node:fs
 * then: the module registry is reset below so every module loads again under the mock. Nothing under logs/ or .cache
 * is read and nothing is written (checked). No model call. CAPTURE=1 prints new digests (only meaningful on a planner
 * known to be the pre-B2 one). With B2 on (the same pinned data, few samples, in this thread): the facts on every
 * option, rollout_best from the simulation's ranking for a trusted boss and from the rollout for a low-trust one,
 * code's fallback, the decision log, and the fight plan on the turns it is shown.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const unpinned = new Set<string>();
const pinnedRead = new Set<string>();
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "boss-lines-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
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
      if (name in pinned) {
        pinnedRead.add(name);
        return JSON.stringify(pinned[name]);
      }
      unpinned.add(name);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return read(path, ...rest);
  };
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

// Load every module again, now under the mock (the setup files had loaded some with the real node:fs), and redo the
// potion-cost setup on the fresh module (setup-potion-cost.ts: costs off).
vi.resetModules();
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = false;
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
 * 8v0h again at #2 (its Blood Potion line: this turn's loss before the heal); ez2l, k8tc, xmy2 at #4 (their random
 * potions' Monte Carlo counts the lasting value a sample sets up: its facts and log). Every board at #12: a line's
 * rollout fact shows the win chance and the value it is ranked on.
 * 2026-10-01 (the knowledge data refreshed after every run broke these on the live branch): the setup files had loaded
 * the potion table and boss-clock's records (the numbers filled into the lessons) with the real node:fs, so
 * potion_worth_in_act_boss and the lessons' counts, and the monster DB and experience base too, followed the live
 * files; the registry is now reset under the mock and those files pinned from 69a33f9's data, the data these digests
 * were captured on. CAPTURE=1 on the current planner (whose off path is the pre-B2 one with the fix-queue changes
 * above) gave every digest unchanged.
 */
const GOLDEN: Record<string, string> = {
  "3sbp-f17-t3-flex:off": "dccd163df08174647e3c1cdcd4bcf9c4",
  "3sbp-f17-t3-flex:v1": "ab67ba3e9749da3925216e5fd2386a20",
  "k8tc-f17-t5:off": "5596bcc903bff54b339142bbb803f04f",
  "k8tc-f17-t5:v1": "f384927f7a7eb8ea80042a0997231940",
  "xmy2-f17-t1:off": "ccf70183bb58499c1e90534f573e3ec3",
  "xmy2-f17-t1:v1": "d8ef465061a61dd7ae4326cf65e80e33",
  "8v0h-f17-t2-saturated:off": "8b438468c96718c5ceccd0e6721c790a",
  "8v0h-f17-t2-saturated:v1": "3e8bd1db016185cc173b00efb6a66b97",
  "ez2l-f48-t2:off": "c6de5775368dfdf499e362edb02feb22",
  "ez2l-f48-t2:v1": "5ce33d7f7a81fa513856c48a7120381d",
  "2mk4-f8-t2-ask:v1": "a8c6b59e8bca465e9e48beac868692c2",
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
    // Every pinned file was read through the mock, the rest of the knowledge the planner asked for read as absent (so
    // the digests never follow the refreshed data), and no log or cache was touched, nothing written.
    expect([...pinnedRead].sort()).toEqual(["boss-damage.json", "experience.json", "monster-db.json", "move-model.json", "potion-equivalents.json"]);
    expect([...unpinned].sort()).toEqual(["fight-value-gates.json", "fight-value.json", "jev-hints.json"]);
    expect([...touched]).toEqual([]);
  }, 120_000);

  it("a fight that is not a boss fight: the same decision with B2 on", () => {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = true;
    const on = digestOf("2mk4-f8-t2-ask", "v1");
    bossLinesOptions.enabled = false;
    expect(on).toBe(digestOf("2mk4-f8-t2-ask", "v1"));
    expect(on).toBe(GOLDEN["2mk4-f8-t2-ask:v1"]);
    expect([...touched]).toEqual([]);
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
    bossLinesOptions.lowTrust = "retry";
  });

  function ask(name: string, enabled: boolean, over: Partial<import("../src/project/types.js").DecisionEnv> = {}): { decision: AskDecision; criteria: Record<string, Record<string, unknown>> } {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = enabled;
    bossLinesOptions.serial = true;
    bossLinesOptions.samples = 16;
    bossLinesOptions.holdHp = () => null;
    const decision = planCombatTurn(loggedEnv(logged(name), { jevContext: "off", ...over })) as AskDecision;
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

  it("BOSS_SIM_LOW_TRUST=retry (default): a low-trust boss's first attempt is not simulated at all; the question and every answer as with B2 off, the log says why", () => {
    const off = ask("ez2l-f48-t2", false);
    const on = ask("ez2l-f48-t2", true);
    const asked = (d: AskDecision) => JSON.stringify({ label: d.label, state: d.state, questions: d.questions, jevView: d.jevView ?? null });
    expect(asked(on.decision)).toBe(asked(off.decision));
    for (const answers of [...Object.keys(on.criteria).map(pick), {} as AnswerSet]) {
      const a = on.decision.resolve(answers);
      const b = off.decision.resolve(answers);
      const { boss_sim: sim, ...log } = (a.log ?? {}) as Record<string, unknown>;
      expect({ ...a, apply: null, log }).toEqual({ ...b, apply: null, log: b.log ?? {} });
      expect(JSON.stringify(sim ?? null)).toMatch(/SL retries only/);
    }
  }, 120_000);

  it("BOSS_SIM_LOW_TRUST=always: a low-trust boss (the Queen, V4.2): no whole-fight number or plan in Jev's question, the question and ranking as with B2 off; the log keeps the numbers", () => {
    bossLinesOptions.lowTrust = "always";
    const off = ask("ez2l-f48-t2", false);
    const on = ask("ez2l-f48-t2", true);
    const asked = (d: AskDecision) => JSON.stringify({ label: d.label, state: d.state, questions: d.questions, jevView: d.jevView ?? null });
    expect(asked(on.decision)).toBe(asked(off.decision));
    expect(asked(on.decision)).not.toContain("whole_fight");
    expect(flagged(on.criteria)).toEqual(flagged(off.criteria));
    // Every answer resolves as with B2 off; the log adds boss_sim (every shown line's numbers, marked low trust).
    for (const answers of [...Object.keys(on.criteria).map(pick), {} as AnswerSet]) {
      const a = on.decision.resolve(answers);
      const b = off.decision.resolve(answers);
      const { boss_sim: sim, ...log } = (a.log ?? {}) as Record<string, unknown>;
      expect({ ...a, apply: null, log }).toEqual({ ...b, apply: null, log: b.log ?? {} });
      const logged = sim as { low_trust: boolean; boss: string; samples: number; lines: Record<string, { win: number; won_loss: number | null }> };
      expect(logged).toMatchObject({ low_trust: true, boss: "QUEEN" });
      expect(logged.samples).toBeGreaterThan(0);
      for (const key of Object.keys(on.criteria).filter((k) => k.startsWith("plan"))) expect(typeof logged.lines[key]!.win).toBe("number");
    }
  }, 120_000);

  it("an SL retry of a low-trust boss (SL_RETRY_SHOW_SIM on): the numbers shown and labelled 低可信, the ranking unchanged; the previous attempts in the question", () => {
    const sl = { attempt: 2, maxAttempts: 4, previousAttempts: { note: "the earlier attempt" }, showSim: true };
    const plain = ask("ez2l-f48-t2", true);
    const retry = ask("ez2l-f48-t2", true, { sl });
    expect(retry.decision.state["previous_attempts"]).toEqual({ note: "the earlier attempt" });
    expect(String(retry.decision.state["whole_fight_sim_trust"])).toMatch(/^低可信 \(low trust\): .*no option is ranked by them/);
    expect(String(retry.decision.state["whole_fight_sim"])).toContain("rollout_best is the line with the highest simulated win rate");
    for (const key of Object.keys(retry.criteria).filter((k) => k.startsWith("plan"))) expect(String(retry.criteria[key]!["whole_fight_sim"])).toMatch(/^low confidence: win \d+%/);
    // The ranking is the low-trust one (the rollout's), as without SL.
    expect(flagged(retry.criteria)).toEqual(flagged(plain.criteria));
    // SL_RETRY_SHOW_SIM off: the question without SL plus the previous attempts, nothing else.
    const noSim = ask("ez2l-f48-t2", true, { sl: { ...sl, showSim: false } });
    const { previous_attempts: previous, ...rest } = noSim.decision.state;
    expect(previous).toEqual({ note: "the earlier attempt" });
    expect(JSON.stringify({ state: rest, questions: noSim.decision.questions })).toBe(JSON.stringify({ state: plain.decision.state, questions: plain.decision.questions }));
  }, 240_000);

  it("turn 1: the fight plan from the best line's samples", () => {
    const { decision } = ask("xmy2-f17-t1", true);
    expect(String(decision.state["whole_fight_plan"])).toMatch(/^the simulation's best line, from its samples \(information, not an order\): .*(the boss dies ~T\d+|no plan wins in most samples)/);
  }, 120_000);
});
