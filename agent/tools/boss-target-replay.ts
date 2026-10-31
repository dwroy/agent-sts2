/** Reconstruct complete fixed messages with the production constructors. No game, model or publishing calls. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { asRecord, str, type JsonValue } from "../src/core/util/json.js";
import { userMessage } from "../src/brain/message.js";
import { withBossPlanningRequest, attachBossDossier, bossDossierScope } from "../src/brain/boss-dossier.js";
import { bossReviewRequired } from "../src/brain/boss-target.js";
import { pickSpec, shopPlanSpec, routePlanSpec, runPlanSpec, carriesRunPlan, withRunPlanField } from "../src/brain/specs.js";
import { codexKindSchema, codexSchema } from "../src/brain/engines/codex.js";
import { withRunPlanTask } from "../src/memory/run-plan-merge.js";
import { ENDGAME_OBJECTIVE } from "../src/memory/endgame-plan.js";
import { BOSS_MARGIN_NOTE } from "../src/sim/boss-margin.js";
import type { AnswerSpec, BrainRequest } from "../src/brain/types.js";
import type { AskDecision } from "../src/memory/types.js";

type Row = Record<string, any>;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
function specFor(input: Row, payload: unknown): AnswerSpec {
  const r = input.request, kind = input.kind;
  let spec = kind === "shop" ? shopPlanSpec(r.label, r.options, payload) : kind === "route" ? routePlanSpec(r.label, payload)
    : kind === "run-plan" ? runPlanSpec(r.label, payload) : pickSpec(r.label, r.options, payload);
  if (kind !== "pick" && kind !== "run-plan" && carriesRunPlan(payload)) spec = withRunPlanField(spec, payload);
  if (spec.schema.properties?.["reason"]) spec = { ...spec, schema: { ...spec.schema, properties: { ...spec.schema.properties,
    reason: { type: "string", description: "一句中文构筑理由，不超过20字" } } } };
  return spec;
}
function wire(req: BrainRequest, options: Row) {
  const schema = codexSchema(codexKindSchema(req.spec, { fields: options.schema_fields ?? "used", reasonLast: false }), {
    routeReason: options.route_reason ?? "drop", maxFieldChars: options.max_field_chars ?? 600, routePattern: options.route_pattern ?? true, routeReasonOnChange: req.spec.routeReasonOnChange });
  const user = userMessage(req), bytes = { system: Buffer.byteLength(req.system), user: Buffer.byteLength(user), schema: Buffer.byteLength(JSON.stringify(schema)) };
  return { system: req.system, user, schema, tools: (req.tools ?? []).map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    bytes: { ...bytes, total: bytes.system + bytes.user + bytes.schema }, sha256: { system: sha(req.system), user: sha(user), schema: sha(JSON.stringify(schema)) } };
}
export function replayBossQuestion(input: Row, directory: string) {
  const r = input.request;
  if (!/^[a-z0-9_-]+$/.test(input.id) || !bossDossierScope(input.context, r.label)) throw Error("invalid fixed replay scope");
  if (typeof r.system !== "string" || !sha(r.system).startsWith(input.original_system_sha) || r.system.length !== input.original_system_chars) throw Error("reconstructed system differs from original logged SHA/length");
  const before: BrainRequest = { ...r, spec: specFor(input, r.payload) };
  const projected = attachBossDossier(input.context, r.payload, r.label, directory)!;
  let payload = projected.payload, question = str(r.question);
  // Rebuild the existing task suffix with the real constructor, retaining the frozen query cues unchanged.
  const planTask = asRecord(payload["run_plan_task"]), goal = question.indexOf(ENDGAME_OBJECTIVE);
  const cueCandidates = [question.indexOf("\n本题有", goal), question.indexOf("\n\n本题经验实际检索匹配数", goal)].filter(i => i >= 0);
  const cueStart = cueCandidates.length ? Math.min(...cueCandidates) : question.length;
  const cues = question.slice(cueStart);
  if (goal < 0 || !Object.keys(planTask).length) throw Error("fixed sample must contain the original endgame task");
  const shell = { kind: "ask", label: r.label, state: payload, deepseek: { question: "q" },
    questions: { q: { type: "choice", instructions: question.slice(0, goal).trimEnd(), criteria: r.options } } } as unknown as AskDecision & { deepseek: NonNullable<AskDecision["deepseek"]> };
  const rebuilt = withRunPlanTask(shell, { ...planTask, ...(bossReviewRequired(payload) ? { boss_reveal_update: true } : {}) } as Record<string, JsonValue>);
  payload = rebuilt.state; question = (rebuilt.questions["q"] as { instructions: string }).instructions;
  const prepared = withBossPlanningRequest({ ...before, payload, question, spec: specFor(input, payload) }, input.context, directory);
  const after = { ...prepared, question: prepared.question + cues };
  const a = wire(before, input.codex ?? {}), b = wire(after, input.codex ?? {});
  const oldSim = asRecord(asRecord(r.payload.facts)["act_boss_sim"]), newSim = asRecord(asRecord(after.payload)["facts"])["act_boss_sim"];
  const { boss_margin_objective: _removed, ...kept } = oldSim;
  if (JSON.stringify(kept) !== JSON.stringify(newSim)) throw Error("act_boss_sim facts changed");
  if (b.user.includes(BOSS_MARGIN_NOTE) || JSON.stringify(after.payload).includes('"boss_margin_objective"')) throw Error("S objective survived");
  const timings: number[] = [];
  for (let i = 0; i < 100; i++) { const start = performance.now(); attachBossDossier(input.context, r.payload, r.label, directory); timings.push(performance.now() - start); }
  timings.sort((a, b) => a - b);
  return { id: input.id, source: input.source, before: a, after: b,
    audit: after.bossDossier, measurement: { dossier_bytes: after.bossDossier!.dossier_bytes, complete_message_delta: b.bytes.total - a.bytes.total,
      warm_projection_n: timings.length, warm_projection_p50_ms: (timings[49]! + timings[50]!) / 2, warm_projection_p95_ms: timings[94]!, model_calls: 0 },
    checks: { original_system_short_sha_and_length_match: true, tools_and_memory_from_frozen_original: true, sim_except_objective_equal: true,
      dossier_le_1500: after.bossDossier!.dossier_bytes <= 1500, boss_target_required: after.spec.schema.required?.includes("boss_target") === true,
      current_boss: after.bossDossier!.context.act_boss, final_bosses: after.bossDossier!.context.final } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); if (args.length !== 6 || args[0] !== "--input" || args[2] !== "--knowledge" || args[4] !== "--out") throw Error("usage: --input frozen.json --knowledge DIR --out NEW_DIR");
  const raw = readFileSync(args[1]!, "utf8"), input = JSON.parse(raw), output = resolve(args[5]!);
  if (input.schema !== "boss-target-replay-input-v1" || !Array.isArray(input.cases)) throw Error("invalid fixed replay input");
  mkdirSync(output, { recursive: false });
  const results: ReturnType<typeof replayBossQuestion>[] = input.cases.map((c: Row) => replayBossQuestion(c, resolve(args[3]!)));
  for (const r of results) {
    writeFileSync(join(output, r.id + ".before.json"), JSON.stringify(r.before, null, 2) + "\n", { flag: "wx" });
    writeFileSync(join(output, r.id + ".after.json"), JSON.stringify(r.after, null, 2) + "\n", { flag: "wx" });
  }
  writeFileSync(join(output, "report.json"), JSON.stringify({ input_sha256: sha(raw), results: results.map(({ before, after, ...r }: Row) => r),
    limitation: "真实消息/任务/schema构造器，零模型/游戏调用。before系统按原短SHA/字符数核重建；原生传输未重放。raw context仅由原题已记录字段重建，非完整mod状态；M/O用明确冻结聚合，原有题面选项/模拟数值逐字保留。固定投影耗时不代自然决策延迟。" }, null, 2) + "\n", { flag: "wx" });
  process.stdout.write(JSON.stringify(results.map(r => ({ id: r.id, ...r.measurement, checks: r.checks }))) + "\n");
}
