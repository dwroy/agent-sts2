/** Attach production predicates to frozen original plans; no solving, simulation, model or game calls. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { plain } from "../../src/v6/schema.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { combatEntriesState, combatEntryAudit, loadCombatEntries } from "../../src/reflex/jev/combat-entries.js";
import { prepareCombatEntryReplay, replayHash } from "../../src/reflex/jev/combat-entry-replay.js";
import type { Plan } from "../../src/reflex/turn-solver.js";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
function local(path: string) {
  const full = resolve(root, path), rel = relative(root, full);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || /(^|\/)\.env(?:\.|$)/.test(rel)) throw Error("local noncredential artifact required");
  let ancestor = full;
  while (!existsSync(ancestor)) ancestor = resolve(ancestor, "..");
  const actual = relative(realpathSync(root), realpathSync(ancestor));
  if (actual.startsWith("..") || isAbsolute(actual)) throw Error("artifact redirects outside worktree");
  return full;
}
function plan(value: unknown): Plan | null {
  if (value === null) return null;
  if (!plain(value) || !Array.isArray(value.steps) || value.steps.length > 512 || !plain(value.outcome)) throw Error("frozen Plan required");
  for (const key of ["damageDealt", "blockGained", "hpLoss", "energyLeft", "cardsDrawn"]) {
    if (typeof value.outcome[key] !== "number" || !Number.isFinite(value.outcome[key])) throw Error("Plan outcome field missing");
  }
  for (const step of value.steps) {
    if (!plain(step) || typeof step.cardId !== "string" || !step.cardId
      || ["cardIndex", "cost", "target"].some(k => step[k] !== undefined && (typeof step[k] !== "number" || !Number.isFinite(step[k])))) throw Error("invalid frozen step");
    if (step.pileCard !== undefined && !plain(step.pileCard)) throw Error("invalid frozen pile card");
  }
  return value as unknown as Plan;
}
export function captureCombatEntryReplay(raw: unknown, directory: string, selection?: string) {
  if (!plain(raw) || raw.schema !== "combat-entry-capture-input-v1" || !plain(raw.request) || !plain(raw.request.state)
    || !plain(raw.request.questions) || !plain(raw.plans)) throw Error("capture input required");
  const state = parseGameState(raw.state), request = structuredClone(raw.request);
  const session = loadCombatEntries(state, directory, { V6_COMBAT_ENTRIES: "on", V6_COMBAT_ENTRY_SELECTION: selection });
  if (!session || session.character !== "silent" || ![1, 2, 3].includes(session.act ?? -1)) throw Error("act 1/2/3 Silent knowledge/state required");
  const board = request.state as Record<string, unknown>, questions = request.questions as Record<string, unknown>;
  const ids = Object.keys(questions), q = questions[ids[0]!];
  if (ids.length !== 1 || !["plan", "pick"].includes(ids[0]!) || !plain(q) || q.type !== "choice" || !plain(q.criteria)) throw Error("one original plan/pick choice required");
  const keys = Object.keys(q.criteria);
  if (Object.keys(raw.plans).length !== keys.length || keys.some(k => !Object.hasOwn(raw.plans as object, k))) throw Error("exact candidate Plan coverage required, null only for unmodelled candidates");
  const brief = plain(board.run_brief) ? board.run_brief : {};
  const situation = plain(board.situation) ? board.situation : {};
  if (brief.floor !== state.run?.floor || situation.turn !== state.turn) throw Error("original request/state floor or turn mismatch");
  for (const key of keys) {
    const facts: unknown = JSON.parse(String(q.criteria[key]));
    if (!plain(facts) || Object.hasOwn(facts, "v6_combat_entry") || Object.hasOwn(facts, "combat_memory")) throw Error("original V5 candidate required");
    facts.v6_combat_entry = combatEntryAudit(session, plan(raw.plans[key]), null, null);
    q.criteria[key] = JSON.stringify(facts);
  }
  board.v6_combat_entries = combatEntriesState(session, typeof board.deepseek_plan === "string");
  // Enforce the same consumer contract before emitting a capture.
  prepareCombatEntryReplay(request);
  return { ...request, capture_provenance: { input_sha256: replayHash(raw),
    knowledge_sha256: replayHash(session.provenance), future_predicates: "unknown_without_original_structured_simulation", outcome_generated: false } };
}
export function main(argv = process.argv.slice(2)) {
  const { values: args } = parseArgs({ args: argv, options: { input: { type: "string" }, knowledge: { type: "string" }, out: { type: "string" }, selection: { type: "string" } } });
  if (!args.input || !args.knowledge || !args.out) throw Error("--input frozen.json --knowledge isolated-knowledge-root --out capture.json required");
  const bytes = readFileSync(local(args.input));
  const result = captureCombatEntryReplay(JSON.parse(bytes.toString()), local(args.knowledge), args.selection);
  const output = local(args.out);
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, JSON.stringify({ ...result, input_file_sha256: createHash("sha256").update(bytes).digest("hex") }, null, 2) + "\n", { flag: "wx", flush: true });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { console.error("Capture failed; verify frozen local state, original plans and isolated knowledge. Existing artifacts retained."); process.exitCode = 1; }
}
