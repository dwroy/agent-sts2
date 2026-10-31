/** New offline candidate capture; never a reconstruction of a historical Jev request. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig } from "../../../agent/src/core/config.js";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { buildRunBrief } from "../../../agent/src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../../../agent/src/memory/types.js";
import { planCombatTurn, thiefTrace } from "../../../agent/src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../../../agent/src/reflex/rollout-live.js";
import { bossLinesOptions } from "../../../agent/src/sim/boss-lines.js";

const { values } = parseArgs({ options: { state: { type: "string" }, catalog: { type: "string" }, out: { type: "string" } } });
if (!values.state || !values.catalog || !values.out || process.env["V6_COMBAT_ENTRIES"] !== "off")
  throw Error("--state frozen.json --catalog frozen-game-data.json --out new-capture.json and V6_COMBAT_ENTRIES=off required");
if (["STS2_KNOWLEDGE_SNAPSHOT", "STS2_DATA_SNAPSHOT", "STS2_DATA_RUNTIME"].some(name => process.env[name]))
  throw Error("Repository knowledge only; do not borrow production runtime bindings");
const root = fileURLToPath(new URL("../../../", import.meta.url));
function local(name: string): string {
  const full = resolve(root, name), rel = relative(root, full);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)
    || /(^|\/)(?:\.env(?:\.|$)|[^/]*(?:api[_-]?key|credentials))/i.test(rel)) throw Error("Local noncredential artifact required");
  let ancestor = full;
  while (!existsSync(ancestor)) ancestor = resolve(ancestor, "..");
  const actual = relative(realpathSync(root), realpathSync(ancestor));
  if (actual.startsWith("..") || isAbsolute(actual)) throw Error("Artifact redirects outside this tree");
  return full;
}
function input(name: string): Buffer {
  const full = local(name);
  if (!statSync(full).isFile() || statSync(full).size > 32 * 1024 * 1024) throw Error("Frozen input must be <=32MiB");
  return readFileSync(full);
}
const bytes = input(values.state), document = JSON.parse(bytes.toString());
const raw = document.state ?? document;
const state = parseGameState(raw);
if (state.screen !== "COMBAT" || state.run?.raw["character_id"] !== "SILENT" || state.run.ascension !== 10 || state.run.act_id !== "1")
  throw Error("This batch is restricted to the observed Silent A10 Act 2 states");
const catalogBytes = input(values.catalog), catalog = JSON.parse(catalogBytes.toString());
const knowledge = makeKnowledge(catalog.collections ?? catalog, "cache");
const config = loadConfig({ MODE: "replay" });
const env: DecisionEnv = {
  state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds,
  runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
  combatPlanner: "turn", screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [],
  jevContext: "v1", buildDecider: "deepseek", thiefFacts: config.thiefFacts,
  thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  sl: { attempt: 1, maxAttempts: 5, previousAttempts: [], showSim: false },
};
// Capture only the existing solver's candidate set. No game, Jev, rollout, whole-fight pool or action execution.
rolloutLiveOptions.enabled = false;
bossLinesOptions.enabled = false;
thiefTrace.enabled = true;
const decision = planCombatTurn(env);
function trace() { return thiefTrace.last; }
const captured = trace();
if (!decision || decision.kind !== "ask" || !captured) throw Error("No complete offline plan question; preserve as an exclusion");
const wire = decision.jevView ?? decision;
const q = wire.questions["plan"];
if (!q || q.type !== "choice") throw Error("A single plan choice is required");
const keys = Object.keys(q.criteria);
if (Object.keys(wire.questions).length !== 1 || keys.length !== captured.shown.length
  || keys.some((key, index) => key !== `plan${index + 1}`))
  throw Error(`Initial batch excludes potion/unmodelled or nonstandard keys; never reconstruct a missing Plan: ${JSON.stringify({ keys, shown: captured.shown.length })}`);
const plans = Object.fromEntries(captured.shown.map((plan, index) => [`plan${index + 1}`, plan]));
const sha = (raw: Buffer) => createHash("sha256").update(raw).digest("hex");
writeFileSync(local(values.out), JSON.stringify({
  schema: "combat-entry-capture-input-v1", state: raw,
  request: { state: wire.state, questions: wire.questions }, plans,
  provenance: {
    kind: "new-offline-planner-capture", historical_question_reproduced: false,
    state_file: values.state, state_sha256: sha(bytes), catalog_sha256: sha(catalogBytes),
    options: { rollout: false, whole_fight: false, action_execution: false, jev_called: false },
    scope: "Conditional on the new frozen pure-plan candidate set, not historical Jev choices or production runtime equivalence",
  },
}, null, 2) + "\n", { flag: "wx", flush: true });
