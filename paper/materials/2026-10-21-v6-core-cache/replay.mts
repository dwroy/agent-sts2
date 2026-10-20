/** Frozen production input/runtime replay. No API request or game action. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";
import { loggedEnv } from "../../../agent/tests/logged.js";
import { v6ProjectionInputs } from "../../../agent/src/v6/projection-input.js";
import { cardResultsContext } from "../../../agent/src/v6/card-results-input.js";
import { V6ProjectionRuntime, type V6CoreCacheEvent } from "../../../agent/src/v6/projection-runtime.js";
import { V6ProjectionEngine } from "../../../agent/src/sim/v6-projection.js";
import { V6CardResultsEngine, cardResultKnown } from "../../../agent/src/sim/v6-card-results.js";
import { SerialDeckRunner } from "../../../agent/src/sim/build-sim-pool.js";
import { restoreV6CardReward } from "../../../agent/src/v6/card-reward-scope.js";
import { buildV6CardPick } from "../../../agent/src/v6/card-pick.js";
import { cardCriteria } from "../../../agent/src/v6/card-criteria.js";

const prior = new URL("../2026-10-21-v6-card-criteria/frozen/", import.meta.url);
const output = new URL("../../../.artifacts/core-cache-r1/", import.meta.url);
mkdirSync(output, { recursive: true });
const get = (name: string) => JSON.parse(gunzipSync(readFileSync(new URL(name + ".json.gz", prior))).toString("utf8"));
const save = (name: string, value: unknown) => writeFileSync(new URL(name, output), JSON.stringify(value, null, 2) + "\n");
const countReasons = (rows: { unknown_reasons: string[] }[]) => rows.reduce<Record<string, number>>((a, row) => {
  for (const reason of new Set(row.unknown_reasons)) a[reason] = (a[reason] ?? 0) + 1;
  return a;
}, {});
for (const [key, value] of Object.entries({ V6_BUILD: "on", V6_CARD_DECIDER: "brain", V6_DIRECTION_REPLAN: "off",
  V6_COMBAT_ENTRIES: "off", V6_REFLEX: "off", V6_SHOP_DECIDER: "brain", V6_REST_DECIDER: "brain", V6_POTION_DECIDER: "brain" })) process.env[key] = value;
setKnowledgeCharacter("silent");
const gameDataPath = "/home/dw/Projects/agent-sts2/.worktrees/live/data/game-data.json";
const gameBytes = readFileSync(gameDataPath), data = JSON.parse(gameBytes.toString("utf8"));
save("replay-input.json", { game_data: { path: gameDataPath, sha256: createHash("sha256").update(gameBytes).digest("hex") },
  fixtures: ["new-states", "new-combats"].map(name => ({ name, sha256: createHash("sha256").update(readFileSync(new URL(name + ".json.gz", prior))).digest("hex") })),
  no_api: true, no_actions: true, background_allowance_ms: 5000, runner: "SerialDeckRunner" });
const knowledge = makeKnowledge(data.collections, "cache", { modVersion: data.mod_version });
const results: unknown[] = [];
for (const frame of get("new-states")) {
  const raw = frame.state, key = `${raw.run_id}-f${raw.run.floor}`;
  const env = loggedEnv({ source: key, decision: { label: "reward/card", decider: "brain", chosen: null, rationale: "" }, state: raw }, { knowledge });
  const combat = get("new-combats").find((x: any) => x.state.run_id === raw.run_id && x.state.run.floor === raw.run.floor);
  restoreV6CardReward(env.screenMemory, [combat, frame]);
  const runner = new SerialDeckRunner(), events: V6CoreCacheEvent[] = [];
  const runtime = new V6ProjectionRuntime(new V6ProjectionEngine(runner), async () => null, () => {}, v6ProjectionInputs(), {
    engine: new V6CardResultsEngine(runner), context: cardResultsContext, record: () => {}, recordBackground: (_env, event) => { events.push(event); },
  });
  const before = runtime.peekCompletedCore(env), started = performance.now();
  // The fixed timer stands for one already pending model response. It makes no model request.
  await runtime.duringModelWait(env, new Promise<void>(resolve => setTimeout(resolve, 5000)));
  const model_wait_ms = performance.now() - started;
  // Join only in this read-only measurement, after the original wait has returned.
  while (!events.length) await new Promise(resolve => setTimeout(resolve, 5));
  const warm = runtime.peekCompletedCore(env);
  if (!warm?.long_term.some(row => row.metrics.hp_loss !== null)) throw Error(`No numeric B: ${key}`);
  process.env.V6_CARD_DECIDER = "jev";
  const foreground = performance.now(), table = await runtime.evaluateCard(env), evaluated = performance.now();
  env.v6CardResults = table;
  const pick = buildV6CardPick(env), formatted = performance.now();
  process.env.V6_CARD_DECIDER = "brain";
  if (!pick || !table) throw Error(`No card table/request: ${key}`);
  const bodies = Object.values(pick.decision.questions.pick!.criteria as Record<string, string>).map(v => JSON.parse(v));
  const request = { model: "typesafe/jev-1.14", state: pick.decision.state, questions: pick.decision.questions };
  const wire_bytes = Buffer.byteLength(JSON.stringify(request));
  if (wire_bytes > 24000) throw Error(`Request over byte budget: ${key}: ${wire_bytes}`);
  const row = { key, before, model_wait_ms, events, B_rows: warm.long_term.length,
    B_numeric: warm.long_term.filter(row => Object.values(row.metrics).some(Boolean)).length,
    B_reasons: countReasons(warm.long_term), A_ms: evaluated - foreground, format_ms: formatted - evaluated, wire_bytes,
    B_numeric_in_criteria: bodies.reduce((n, body) => n + body.B_progress.reduce((a: number, c: any) => a + c.results.length, 0), 0),
    known: ["card0", "card1", "card2", "skip"].map(id => cardResultKnown(table, id)), table, request };
  results.push(row); save("warm-results.json", results);
  console.log(JSON.stringify({ ...row, before: undefined, table: undefined, request: undefined }));
}
const sizes = get("tables-r2").map(({ key, table }: any) => {
  const names = Object.fromEntries(["card0", "card1", "card2", "skip"].map(id => [id, id]));
  const criteria = cardCriteria(names, table), bodies = Object.values(criteria).map(v => JSON.parse(v));
  return { key, bytes: Buffer.byteLength(JSON.stringify(criteria)), numeric_full: table.long_term.filter((r: any) => Object.values(r.metrics).some(Boolean)).length,
    numeric_criteria: bodies.reduce((n, b) => n + b.B_progress.reduce((a: number, c: any) => a + c.results.length, 0), 0),
    omitted: bodies.reduce((n, b) => n + b.B_progress.reduce((a: number, c: any) => a + (c.numeric_targets_omitted ?? 0), 0), 0) };
});
save("criteria-size-after.json", sizes);
