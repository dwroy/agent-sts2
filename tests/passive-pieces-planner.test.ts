/**
 * PASSIVE_PIECES on the combat planner (src/strategy/passive-pieces.ts): the death-move logged boards and their pinned
 * knowledge (tests/death-move-data, as tests/death-move-planner.test.ts reads them). On and off, the boards holding none
 * of the relic pieces get the same question, Jev's view and resolutions byte for byte; the Kaiser Crab board holding
 * Ornamental Fan differs only in the rollout's numbers (its later turns gain the Fan's block), never in the options code
 * offers or the solver's own figures. Off is the pre-change planner: the golden digests of the other planner tests run
 * with it off. Nothing under logs/ or .cache is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "death-move-data");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
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
// PASSIVE_PIECES on the fresh module (each test sets it).
const { passivePiecesOptions } = await import("../src/strategy/passive-pieces.js");
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { setMonsterDbForTests } = await import("../src/knowledge/monster-db.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;

// The whole-fight boss lines (B2) are a worker pool on a wall clock: off here, the rest of the question is pinned.
bossLinesOptions.enabled = false;
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  state: Record<string, unknown>;
  screenMemory: { facing?: number; facingFight?: string };
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

/** A logged board's decision environment, with the Surrounded facing the loop had noted then. */
function envOf(name: string, over: Record<string, unknown> = {}): DecisionEnv {
  const fx = board(name);
  const state = parseGameState(fx.state);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], screenMemory: { ...createScreenMemory(state.screen), ...fx.screenMemory },
    ...over,
  } as DecisionEnv;
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
    label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
  };
}

function digest(view: unknown): string {
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}


const BOARDS = ["0u96-f48-t5-queen-kill", "5gka-f48-t2-queen-mine", "y3xt-f37-t1-shield", "nx48-f33-t7-crab"] as const;
/** The board holding a relic piece (Ornamental Fan); the others hold none of them. */
const WITH_PIECE = "nx48-f33-t7-crab";

function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  passivePiecesOptions.enabled = true;
  setMonsterDbForTests(null);
});

function views(on: boolean): Record<string, unknown> {
  frozen();
  passivePiecesOptions.enabled = on;
  const got: Record<string, unknown> = {};
  for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = viewOf(envOf(name, { jevContext: ctx }));
  return got;
}

/** The paths where two JSON values differ (a string holding a JSON object, an option's criteria, is looked into). */
function diffPaths(a: unknown, b: unknown, path = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (typeof a === "string" && typeof b === "string" && a.startsWith("{") && b.startsWith("{")) {
    try {
      return diffPaths(JSON.parse(a), JSON.parse(b), `${path}{}`);
    } catch {
      return [path];
    }
  }
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    return [...keys].flatMap((key) => diffPaths((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`));
  }
  return [path];
}

describe("PASSIVE_PIECES on the combat question", () => {
  it("boards without any relic piece: the same question, view and resolutions on and off; the Fan board only in the rollout's numbers", () => {
    const off = views(false);
    const on = views(true);
    for (const name of BOARDS) {
      for (const ctx of ["off", "v1"]) {
        const key = `${name}:${ctx}`;
        if (name !== WITH_PIECE) {
          expect(digest(on[key])).toBe(digest(off[key]));
          continue;
        }
        const paths = diffPaths(off[key], on[key]);
        if (process.env["CAPTURE"] === "1") console.log(key, paths);
        expect(paths.length).toBeGreaterThan(0);
        // Every difference is a rollout figure (the per-option rollout facts, the rollout's best line), never code's own.
        expect(paths.filter((p) => !/rollout|history_estimate/.test(p))).toEqual([]);
      }
    }
    expect([...touched]).toEqual([]);
  }, 900_000);
});
