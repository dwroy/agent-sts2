/** Hosted public research is independent of shell networking and gameplay tools. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EngineName } from "./engines.js";
import { captureStartupLease } from "./startup-recovery.js";
import { LearnerUsageError, type TaskSpec } from "./task.js";

export function publicWebPermission(spec: TaskSpec, engine: EngineName, character: string, cwd: string, root: string, env: NodeJS.ProcessEnv): "sts2" | undefined {
  if (!spec.publicWeb) return undefined;
  const lease = captureStartupLease(env, root, cwd);
  if (engine !== "codex" || character !== "silent" || spec.name !== "strategy-proposal" || !lease) {
    throw new LearnerUsageError("public_web 只支持 Codex/Silent 已登记的纯内容 strategy-proposal 批次；其他引擎未接入");
  }
  const batch = JSON.parse(readFileSync(env.LEARNER_STATE_FILE!, "utf8")).batches[lease.batch];
  const sha = createHash("sha256").update(readFileSync(spec.path)).digest("hex");
  const contract = batch.public_web;
  if (batch.task !== spec.name || batch.character !== character || batch.reason !== "ops" || batch.runs?.length !== 0 ||
      batch.proposal_ids?.length || batch.proposal_repair || batch.research_request || batch.implementation_request || batch.external_source || batch.backfill_source ||
      contract?.schema !== "public-web-research-v1" || contract.template_sha256 !== sha ||
      !batch.knowledge_runtime?.enabled || !env.STS2_KNOWLEDGE_RUNTIME ||
      batch.knowledge_runtime.directory !== resolve(env.STS2_KNOWLEDGE_RUNTIME) || !lease.current()) {
    throw new LearnerUsageError("public_web 缺原任务SHA/纯内容权限/runtime绑定，不能扩大旧批次权限");
  }
  return "sts2";
}

/** Preserve native evidence, including failed/empty calls, without claiming retrieved page bytes. */
export function publicWebEvent(event: Record<string, unknown>): Record<string, unknown> | undefined {
  const payload = event.payload as Record<string, unknown> | undefined;
  const item = event.item as Record<string, unknown> | undefined;
  if ((event.type === "response_item" && payload?.type === "web_search_call") ||
      (event.type === "event_msg" && ["web_search_begin", "web_search_end"].includes(String(payload?.type))) ||
      (["item.started", "item.completed"].includes(String(event.type)) && item?.type === "web_search")) {
    const raw = JSON.stringify(event);
    return { schema: "public-web-event-v1", sha256: createHash("sha256").update(raw).digest("hex"), event_json: raw, event };
  }
  return undefined;
}
