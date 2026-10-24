/** Capture the actual production request builder against a fixed in-process engine; never calls a model. */
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createBrain } from "../../../agent/src/brain/brain.js";
import { loadConfig } from "../../../agent/src/core/config.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";
import type { BrainRequest } from "../../../agent/src/brain/types.js";
import { RouteCalculationCache, routeBlockState } from "../../../agent/src/hand/screens/route-plan.js";
import { buildRouteMap } from "../../../agent/src/sim/route-map.js";
import { input, costs } from "../../../agent/tests/route-fixture.js";

setKnowledgeCharacter("silent");
const brain = createBrain(loadConfig({ BRAIN_LOG: "off" }), null);
brain.setToolContext({ ascension: 10, knowledgeDir: "/unavailable-fixture", logsDir: "/unused-fixture",
  state: { run_id: "FORMAT_FIXTURE", run: { character_id: "SILENT", ascension: 10 } } });
let captured: BrainRequest | undefined;
brain.router.decide = async request => {
  captured = request;
  return { engine: "codex", model: "fixed", answer: { choice: "a", reason: "格式复用" }, problems: [], attempts: 1,
    latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
};
const endgame = { core: "格式核心", gaps: "未知", scaling_damage: "未知", sustainable_defense: "未知", resources: "未知", win_condition: "未知", checkpoint: "" };
await brain.choose({ facts: { act: 1, your_run_plan: { archetype: "格式方向", summary: "格式计划", endgame } },
  run_plan_task: { endgame_objective: "格式终局目标", endgame_plan_required: false, plan_reuse: true } },
  "格式题：已有计划继续使用，仅在判断改线预期有利于胜率时给局部更新。", { a: "格式选项" }, { label: "reward/card" });
const directory = new URL("./", import.meta.url), request = captured!;
writeFileSync(new URL("system-prompt.txt", directory), request.system + "\n");
writeFileSync(new URL("registered-tools.json", directory), JSON.stringify(request.tools!.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })), null, 2) + "\n");
writeFileSync(new URL("request-fixture.json", directory), JSON.stringify({ label: request.label,
  system_sha256: createHash("sha256").update(request.system).digest("hex"), system_chars: request.system.length,
  question: request.question, payload: request.payload, schema: request.spec.schema,
  reused_answer_problems: request.spec.validate({ choice: "a", reason: "格式复用" }),
  limitation: "Actual production builder, fixed engine and format-only state. No model, game, natural acceptance or content quality claim." }, null, 2) + "\n");

const args = { map: buildRouteMap(input()), plan: ["r1c0", "r2c0", "r3c1", "r4c1", "r5c1"],
  start: { hp: 40, max: 80 }, costs, cache: new RouteCalculationCache() };
writeFileSync(new URL("route-reuse-fixture.json", directory), JSON.stringify({
  limitation: "Existing synthetic route-fixture costs only; not knowledge, gameplay evidence or decision quality.",
  initial: routeBlockState(args), repeated: routeBlockState({ ...args, plan: [...args.plan] }),
  rest_options_only: routeBlockState({ ...args, options: [{ label: "格式选项", hp: 50, max: 80 }] }),
  hp_changed: routeBlockState({ ...args, start: { hp: 30, max: 80 } }),
  route_changed: routeBlockState({ ...args, plan: ["r1c2", "r2c1", "r3c1", "r4c1", "r5c1"] }),
}, null, 2) + "\n");
