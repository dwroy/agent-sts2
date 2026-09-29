/**
 * Judges every arm's final answer with the LIVE resolvers (no API calls): the same replay as the dataset,
 * then, per question, the screen's own resolve() (option questions, with route review / act route / cards),
 * the shop's plan resolver (parseShopPlan + first-step check) or parseRunPlan (run plans), exactly as
 * loop.ts would apply them. Writes data/judged.jsonl: one row per (question, arm).
 *
 * Usage (worktree root): npx tsx experiments/dsh/judge.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { AnswerSet } from "../../src/jev/answers.js";
import { parseRunPlan, type RunPlanTrigger } from "../../src/strategy/run-plan.js";
import { captureAll, DATA, setup, type Target } from "./lib/capture.js";

type Row = Record<string, unknown>;
const targets = JSON.parse(readFileSync(join(DATA, "targets.json"), "utf8")) as Target[];
const results = readFileSync(join(DATA, "results.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Row);
const byId = new Map<string, Row[]>();
for (const row of results) {
  const list = byId.get(String(row["id"])) ?? [];
  list.push(row);
  byId.set(String(row["id"]), list);
}
const { knowledge } = setup();

function finalOf(row: Row): Record<string, unknown> | null {
  if (row["arm"] === "C") return (row["accepted"] as Record<string, unknown> | null) ?? null;
  return (row["final"] as Record<string, unknown> | null) ?? null;
}

const out: Row[] = [];
captureAll(
  targets.filter((t) => byId.has(t.id)),
  (c) => {
    const rows = byId.get(c.target.id) ?? [];
    for (const row of rows) {
      const answer = finalOf(row);
      const judged: Row = { id: c.target.id, arm: row["arm"], label: c.label, kind: c.kind };
      if (c.skipped) {
        judged["error"] = `capture skipped: ${c.skipped}`;
      } else if (!answer) {
        judged["accepted"] = false;
        judged["why"] = "no answer (the arm failed or fell back)";
      } else if (c.kind === "run-plan") {
        const plan = parseRunPlan(answer, c.state, knowledge, (c.runPlanTrigger ?? "review") as RunPlanTrigger);
        const empty = !plan.archetype && plan.want.length === 0 && plan.avoid.length === 0 && !plan.summary;
        judged["accepted"] = true; // the live code accepts any parsed object as the new plan
        judged["empty_plan"] = empty;
        judged["dropped_ids"] = ["want", "avoid", "remove"].map((f) => (Array.isArray(answer[f]) ? (answer[f] as unknown[]).length : 0) - (plan[f as "want" | "avoid" | "remove"] as string[]).length).reduce((a, b) => a + b, 0);
        judged["plan"] = { archetype: plan.archetype, want: plan.want, avoid: plan.avoid, remove: plan.remove, elites: plan.elites, rest: plan.rest, blockTarget: plan.blockTarget };
      } else if (c.kind === "shop-plan") {
        const resolved = c.decision!.deepseek!.plan!.resolve(answer);
        judged["accepted"] = !("invalid" in resolved) && Boolean(resolved.intent);
        judged["why"] = "invalid" in resolved ? resolved.invalid : resolved.rationale.slice(0, 200);
        if (!("invalid" in resolved) && resolved.plan) judged["steps"] = resolved.plan.steps;
      } else {
        const ask = c.decision!;
        const spec = ask.deepseek!;
        const choice = String(answer["choice"] ?? "");
        const raw: Record<string, unknown> = { escalated: "deepseek" };
        if (Array.isArray(answer["cards"]) && (answer["cards"] as unknown[]).length > 0) raw["cards"] = answer["cards"];
        if (typeof answer["route"] === "string" && answer["route"]) raw["route"] = answer["route"];
        if (typeof answer["route_reason"] === "string" && answer["route_reason"]) raw["route_reason"] = answer["route_reason"];
        const picked = ask.resolve({ [spec.question]: { type: "choice", choice, probabilities: { [choice]: 1 }, confidence: 1, raw } } as unknown as AnswerSet);
        judged["accepted"] = Boolean(picked.intent) && !(spec.oneshot && picked.fallback);
        judged["why"] = picked.rationale.slice(0, 200);
        if (picked.plan) judged["steps"] = picked.plan.steps;
        if (picked.routeReview) judged["route_review"] = { answer: picked.routeReview.answer, outcome: picked.routeReview.outcome, ...(picked.routeReview.invalid ? { invalid: picked.routeReview.invalid } : {}) };
      }
      out.push(judged);
    }
  },
  { only: new Set(byId.keys()) },
);
writeFileSync(join(DATA, "judged.jsonl"), out.map((row) => JSON.stringify(row)).join("\n") + "\n");
const n = (arm: string) => out.filter((r) => r["arm"] === arm);
for (const arm of ["A", "B", "C"]) console.log(`${arm}: ${n(arm).filter((r) => r["accepted"]).length}/${n(arm).length} accepted by the live resolvers`);
