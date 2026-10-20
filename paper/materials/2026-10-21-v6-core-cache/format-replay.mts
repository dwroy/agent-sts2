/** Repack saved numeric tables only. No simulation, API request, or action. */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";
import { loggedEnv } from "../../../agent/tests/logged.js";
import { restoreV6CardReward } from "../../../agent/src/v6/card-reward-scope.js";
import { buildV6CardPick } from "../../../agent/src/v6/card-pick.js";

const input = new URL("../../../.artifacts/core-cache-r1/", import.meta.url);
const prior = new URL("../2026-10-21-v6-card-criteria/frozen/", import.meta.url);
const get = (name: string) => JSON.parse(gunzipSync(readFileSync(new URL(name + ".json.gz", prior))).toString("utf8"));
for (const [key, value] of Object.entries({ V6_BUILD: "on", V6_CARD_DECIDER: "jev", V6_DIRECTION_REPLAN: "off", V6_REFLEX: "off" })) process.env[key] = value;
setKnowledgeCharacter("silent");
const data = JSON.parse(readFileSync("/home/dw/Projects/agent-sts2/.worktrees/live/data/game-data.json", "utf8"));
const knowledge = makeKnowledge(data.collections, "cache", { modVersion: data.mod_version });
const result = JSON.parse(readFileSync(new URL("warm-results.json", input), "utf8")).map((row: any) => {
  const frame = get("new-states").find((f: any) => `${f.state.run_id}-f${f.state.run.floor}` === row.key);
  const combat = get("new-combats").find((f: any) => f.state.run_id === frame.state.run_id && f.state.run.floor === frame.state.run.floor);
  const env = loggedEnv({ source: row.key, decision: { label: "reward/card", decider: "brain", chosen: null, rationale: "" }, state: frame.state }, { knowledge });
  restoreV6CardReward(env.screenMemory, [combat, frame]); env.v6CardResults = row.table;
  const start = performance.now(), pick = buildV6CardPick(env), format_ms = performance.now() - start;
  if (!pick) throw Error(`Missing request: ${row.key}`);
  const request = { model: "typesafe/jev-1.14", state: pick.decision.state, questions: pick.decision.questions };
  const wire_bytes = Buffer.byteLength(JSON.stringify(request));
  if (wire_bytes > 24_000) throw Error(`Oversize: ${row.key}`);
  const bodies = Object.values(pick.decision.questions.pick!.criteria as Record<string, string>).map(v => JSON.parse(v));
  const catalog = pick.decision.state.core_metrics as any[];
  const out = { key: row.key, format_ms, wire_bytes, core_catalog: catalog.map(c => c.id),
    A_targets_per_choice: bodies.map(b => b.A_vs_skip.length),
    B_numeric_in_shared_state: catalog.reduce((n, c) => n + (c.outcomes?.length ?? 0), 0),
    B_numeric_in_criteria: bodies.reduce((n, b) => n + b.B_progress.reduce((a: number, c: any) => a + c.results.length, 0), 0), request };
  if (out.core_catalog.length !== 17 || out.A_targets_per_choice.some(n => n !== 7)) throw Error(`Lost mandatory rows: ${row.key}`);
  console.log(JSON.stringify({ ...out, request: undefined }));
  return out;
});
writeFileSync(new URL("format-replay-r2.json", input), JSON.stringify(result, null, 2) + "\n");
