/**
 * THIEF_FACTS (docs/thief.md, src/strategy/thief.ts): the Thieving Hopper's stolen card and the Gremlin Merc's stolen
 * gold as facts on the combat question, the thieves' escape in the rollout, and the options kept for a kill before
 * they leave. With the switch off the question, Jev's view and every answer's resolution are byte for byte what they
 * were before (digests computed on the planner of 894f245, the commit this branch started from, on logged A8 boards,
 * with fake clocks and the knowledge data the planner reads pinned from that commit: tests/thief-data/make-fixtures.py).
 * The setup files load some planner modules with the real node:fs before this file's mock is in place: the module
 * registry is reset so every module loads again under it. Nothing under logs/ or .cache is read, nothing is written.
 * CAPTURE=1 prints new digests (only meaningful on the pre-change planner).
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "thief-data");
const unpinned = new Set<string>();
const pinnedRead = new Set<string>();
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
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

vi.resetModules();
const { readFileSync } = await import("node:fs");
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = true;
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  source: string;
  state: Record<string, unknown>;
  fightStart: { fight: string; deck: { card_id: string; name: string; upgraded: boolean }[]; gold: number };
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

/** A logged board's decision environment; `memory` adds to its screen memory. */
function envOf(name: string, over: Partial<DecisionEnv> = {}, memory: Record<string, unknown> = {}): DecisionEnv {
  const fx = board(name);
  const state = parseGameState(fx.state);
  return {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: { ...createScreenMemory(state.screen), ...memory },
    shopDiscardPotions: [],
    ...over,
  };
}

/** The whole decision as data: the question, Jev's view, and each option's (and no answer's) resolution. */
function viewOf(env: DecisionEnv): unknown {
  const decision = planCombatTurn(env);
  if (!decision || decision.kind !== "ask") return decision ?? null;
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const pick = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
  const res = (answers: AnswerSet) => {
    const { apply: _apply, ...rest } = ask.resolve(answers);
    return rest;
  };
  return {
    label: ask.label,
    state: ask.state,
    questions: ask.questions,
    jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
  };
}

function digest(view: unknown): string {
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

const BOARDS = [
  "rpc6-f20-t2-hopper",
  "rpc6-f20-t3-hopper",
  "rpc6-f20-t4-hopper",
  "rpc6-f20-t5-hopper-escape",
  "8v0h-f19-t5-hopper-escape",
  "4lc3-f21-t4-hopper",
  "rpc6-f8-t2-merc",
  "rpc6-f8-t4-gremlins",
  "jf8n-f9-t3-gremlins",
] as const;

/** Digests of the planner before THIEF_FACTS (894f245), on the boards above (JEV_CONTEXT off and v1). */
const GOLDEN: Record<string, string> = {
  "rpc6-f20-t2-hopper:off": "bbeb3e9d8e11e2a5584f4512f847af3a",
  "rpc6-f20-t2-hopper:v1": "95a78375dd9fb9cb64dc7cce43dfb67c",
  "rpc6-f20-t3-hopper:off": "55da5a71377f822be079e44789580725",
  "rpc6-f20-t3-hopper:v1": "23ce9973e8e8df02c91e31ed53197071",
  "rpc6-f20-t4-hopper:off": "277713e71df22fde2d4b66f727024d94",
  "rpc6-f20-t4-hopper:v1": "1bc2ed5be499bc16776cb773f4dcf715",
  "rpc6-f20-t5-hopper-escape:off": "9562f6dab38409ab7689d6084ea39e8e",
  "rpc6-f20-t5-hopper-escape:v1": "9e769628db5d163053a6f2ba40ac32f3",
  "8v0h-f19-t5-hopper-escape:off": "dd7cb595e0725206391c4f22e582959e",
  "8v0h-f19-t5-hopper-escape:v1": "67cde2d01f7751b757bb926e2bbeae33",
  "4lc3-f21-t4-hopper:off": "71cf857eec957ca3f67b55bd1bdeb625",
  "4lc3-f21-t4-hopper:v1": "e559259763a5b3691fbd9dce7bc8f7a8",
  "rpc6-f8-t2-merc:off": "ad9c4d95dfafdf445b2eef2183e9ec39",
  "rpc6-f8-t2-merc:v1": "73e2dbb49c848b86a946aeeedad38435",
  "rpc6-f8-t4-gremlins:off": "c0859e071aefde70cd9fcef0addf87d5",
  "rpc6-f8-t4-gremlins:v1": "3b60df447400a2b42288dcdbba574631",
  "jf8n-f9-t3-gremlins:off": "01d7fbe9a929cec11e10e4c606f2da86",
  "jf8n-f9-t3-gremlins:v1": "1a7c01185219bd4a461f487b536e7118",
};

/** Fake clocks: the rollout and the random potions' Monte Carlo run their full schedules, the same every time. */
function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
});

describe("THIEF_FACTS off: the combat question as before", () => {
  it("every logged thief board's decision is the pre-change one, byte for byte", () => {
    frozen();
    const got: Record<string, string> = {};
    for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digest(viewOf(envOf(name, { jevContext: ctx })));
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN);
    expect([...touched]).toEqual([]);
  }, 300_000);
});
