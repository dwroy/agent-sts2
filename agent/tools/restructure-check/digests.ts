/**
 * Restructure check: per-board digests of the planner's decision on a fixed sample of logged boards (boards.json, picked
 * once by select-boards.py), for the same code before and after files move to be compared board by board. No model is
 * called, nothing is played, nothing under logs/ or data/ is written.
 *
 * Each board's whole decision as data, hashed: combat boards through planCombatTurn (the question, Jev's view and every
 * answer's resolution, as tools/plan-digests.ts), the other screens through planDecision (an act's intent and rationale; an
 * ask's state, questions and Jev view with each option's, no answer's and a bad answer's resolution). Clocks frozen (rollout,
 * random potions' Monte Carlo), B2's whole-fight lines off; the knowledge data is the checkout's own.
 *
 *   npx tsx tools/restructure-check/digests.ts --out D.json [--boards boards.json] [--root <dir with logs/ and data/>]
 *
 * Run it with a clean environment (env -i HOME=$HOME PATH=$PATH ...) so no process.env flag differs between the two runs.
 */
import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../../src/config.js";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/mod/schema.js";
import { buildRunBrief } from "../../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type Decision, type DecisionEnv } from "../../src/project/types.js";
import { planCombatTurn } from "../../src/screens/combat-plan.js";
import { planDecision } from "../../src/screens/index.js";
import { bossLinesOptions } from "../../src/sim/boss-lines.js";
import { potionMcOptions } from "../../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../../src/strategy/rollout-live.js";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

/** The first directory above this script holding logs/states.jsonl (the old code root or the new project root). */
function findRoot(): string {
  let dir = HERE;
  for (;;) {
    if (existsSync(join(dir, "logs", "states.jsonl"))) return dir;
    const up = dirname(dir);
    if (up === dir) throw new Error("no logs/states.jsonl above this script: pass --root");
    dir = up;
  }
}

interface Board {
  name: string;
  screen: string;
  label: string;
  off: number;
  len: number;
  sha: string;
}

const root = resolve(arg("root", "") || findRoot());
const gameData = [join(root, "data", "game-data.json"), join(root, ".cache", "game-data.json")].find((path) => existsSync(path));
if (!gameData) throw new Error(`no data/game-data.json under ${root}`);
const list = JSON.parse(readFileSync(arg("boards", join(HERE, "boards.json")), "utf8")) as Board[];

rolloutLiveOptions.enabled = true;
rolloutLiveOptions.now = () => 0;
potionMcOptions.now = () => 0;
bossLinesOptions.enabled = false;
const knowledge = makeKnowledge((JSON.parse(readFileSync(gameData, "utf8")) as { collections: Record<string, unknown[]> }).collections as never, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

type Answers = Parameters<AskDecision["resolve"]>[0];
const pick = (question: string, key: string, confidence: number) => ({ [question]: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as unknown as Answers;

function resolution(ask: AskDecision, answers: Answers): unknown {
  try {
    const { apply: _apply, ...rest } = ask.resolve(answers) as unknown as Record<string, unknown>;
    return rest;
  } catch (error) {
    return { threw: error instanceof Error ? error.message : String(error) };
  }
}

/** The decision as data: an act as it is; an ask with each question's options resolved (0.9 and 0.3), no answer and a bad key. */
function viewOf(decision: Decision | null): unknown {
  if (!decision || decision.kind !== "ask") return decision ?? null;
  const ask = decision;
  const resolved: Record<string, unknown> = { none: resolution(ask, {} as Answers) };
  for (const [question, spec] of Object.entries(ask.questions as Record<string, { criteria?: Record<string, unknown> }>)) {
    for (const key of Object.keys(spec.criteria ?? {})) {
      resolved[`${question}:${key}`] = resolution(ask, pick(question, key, 0.9));
      resolved[`${question}:${key}@0.3`] = resolution(ask, pick(question, key, 0.3));
    }
    resolved[`${question}:bad`] = resolution(ask, pick(question, "nope", 0.9));
  }
  return { ...ask, resolved };
}

const fd = openSync(join(root, "logs", "states.jsonl"), "r");
const out: Record<string, string> = {};
const counts: Record<string, number> = {};
for (const board of list) {
  const buffer = Buffer.alloc(board.len);
  readSync(fd, buffer, 0, board.len, board.off);
  if (createHash("sha256").update(buffer).digest("hex") !== board.sha) throw new Error(`board bytes differ from boards.json: ${board.name}`);
  const raw = (JSON.parse(buffer.toString("utf8")) as Record<string, unknown>)["state"] as Record<string, unknown>;
  let view: unknown;
  try {
    const state = parseGameState(raw);
    const env = {
      state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen),
      thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn",
      shopDiscardPotions: config.shop.discardPotions, jevContext: "v1", buildDecider: "deepseek", oneshot: config.buildOneshot, thiefFacts: config.thiefFacts,
      thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules, mechMoveRules: config.mechMoveRules, mechDeathMove: config.mechDeathMove,
      sandpitStart: config.sandpitStart,
    } as DecisionEnv;
    if (board.screen === "COMBAT") view = viewOf(planCombatTurn(env));
    else {
      const outcome = planDecision(env);
      view = outcome.kind === "decision" ? viewOf(outcome.decision) : outcome;
    }
  } catch (error) {
    view = { threw: error instanceof Error ? error.message : String(error) };
  }
  const text = JSON.stringify(view);
  out[board.name] = createHash("sha256").update(text).digest("hex").slice(0, 32);
  const kind = view && typeof view === "object" && "kind" in view ? String((view as { kind: unknown }).kind) : view && typeof view === "object" && "threw" in view ? "threw" : "null";
  counts[`${board.screen}:${kind}`] = (counts[`${board.screen}:${kind}`] ?? 0) + 1;
}
closeSync(fd);
const all = createHash("sha256").update(JSON.stringify(out)).digest("hex").slice(0, 32);
writeFileSync(arg("out", "digests.json"), `${JSON.stringify({ all, boards: list.length, counts, digests: out }, null, 1)}\n`);
console.log(`${list.length} boards, all ${all}\n${Object.entries(counts).map(([key, n]) => `  ${key} ${n}`).join("\n")}`);
