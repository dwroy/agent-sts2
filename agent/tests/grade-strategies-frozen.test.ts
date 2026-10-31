/** Synthetic frozen revisions; no new gameplay evidence is created. */
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import { classificationDigest, canonical } from "../src/knowledge/runtime/classification.js";
import { gradedBodyEligible } from "../src/knowledge/strategy-grading.js";
import { gradeCandidate, regradeFrozen } from "../tools/grade-strategies.js";

const dirs: string[] = [], sha = (s: string) => createHash("sha256").update(s).digest("hex");
afterEach(() => dirs.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })));
function fixture() {
 const entries = ["route", "build"].map(id => ({ id, version: "unchanged-source-version", strategy: "完整合成规则，不是游戏知识。", trigger: { question_types: ["rest"] },
  evidence: [{ type: "own", run: "FIXTURE00001", floor: 1, role: "support" }], source: "own", consumer_readback: "pending",
  prior_texts: [{ strategy: "保留历史原文", confidence: .99 }] }));
 const input: any = { schema: "issue79-regrading-input-v1", original_batch: "synthetic", fixed_base: `K1-${"a".repeat(64)}`,
  source_document_sha256: "b".repeat(64), entries, classifications: [{ target_sha256: null, note: "future owner rebinds" }] };
 const assessments: any = { schema: "strategy-reassessments-v1", entries: entries.map((e, i) => ({ id: e.id, source_sha256: classificationDigest(e),
  grade: i ? "B−" : "B+", category: i ? "构筑组合" : "路线资源", evidence_type: i ? "原观察/策略（仅引用）" : "单臂统计",
  summary: i ? "仅引用的合成主张。" : "单臂统计，非对照：合成总体。", single_observation_window: false,
  claim_population: i ? null : { n: 10, source: "own", unit: "independent_runs" }, consistency: i ? null : 1, limitations: ["合成限制；非因果。"] })) };
 const bind = () => {
  const inputText = JSON.stringify(input), assessmentsText = JSON.stringify(assessments), body = "[Claude] #85 重判两条合并对象\nSynthetic authority fixture.";
  const authority: any = { schema: "strategy-regrading-authority-v1", url: "https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6539128264", author: "dwroy",
   body, body_sha256: sha(body), input: { sha256: sha(inputText), base: input.fixed_base, document_sha256: input.source_document_sha256, original_batch: input.original_batch },
   assessments_sha256: sha(assessmentsText), entries: input.entries.map((e: any) => ({ id: e.id, source_sha256: classificationDigest(e),
    assessment_sha256: classificationDigest(assessments.entries.find((a: any) => a.id === e.id)) })) };
  return { inputText, assessmentsText, authority };
 };
 return { input, assessments, bind };
}
it("binds new content and computes new grades while preserving every non-grading field and full revision identity", () => {
 const f = fixture(), b = f.bind(), result = regradeFrozen(b.inputText, b.assessmentsText, b.authority);
 expect(result.schema).toBe("strategy-regrading-receipt-v1"); expect(result.production_published).toBe(false);
 expect(result.entries[0].confidence).toBe(.058333); expect(result.entries[1].confidence).toBe(0);
 expect(gradedBodyEligible(result.entries[0])).toBe(true); expect(gradedBodyEligible(result.entries[1])).toBe(false);
 for (const [i, e] of result.entries.entries()) {
  for (const k of Object.keys(f.input.entries[i])) expect(e[k]).toEqual(f.input.entries[i][k]);
  expect(result.revisions[i].final_sha256).toBe(classificationDigest(e));
  expect(result.revisions[i].runtime_revision).toBe(sha("characters/silent/strategy-entries.json\n" + canonical(e)));
  expect(e.grading.basis.original_entry_sha256).toBe(classificationDigest(f.input.entries[i]));
 }
 expect(result.source_classifications_sha256).toBe(classificationDigest(f.input.classifications));
});
it("rejects unbound file bytes, object hashes, verdicts, old grading fields and authorization changes", () => {
 const f = fixture(), b = f.bind();
 expect(() => regradeFrozen(b.inputText + "\n", b.assessmentsText, b.authority)).toThrow();
 const changed = JSON.parse(b.inputText); changed.entries[0].strategy += " changed";
 const changedText = JSON.stringify(changed);
 expect(() => regradeFrozen(changedText, b.assessmentsText, { ...b.authority, input: { ...b.authority.input, sha256: sha(changedText) } })).toThrow("unbound");
 expect(() => regradeFrozen(b.inputText, b.assessmentsText + " ", b.authority)).toThrow();
 const changedAssessment = JSON.parse(b.assessmentsText); changedAssessment.entries[0].grade = "A";
 const changedAssessmentText = JSON.stringify(changedAssessment);
 expect(() => regradeFrozen(b.inputText, changedAssessmentText, { ...b.authority, assessments_sha256: sha(changedAssessmentText) })).toThrow("unbound");
 for (const patch of [{ author: "external" }, { url: "https://example.com" }, { body: b.authority.body + " changed" }])
  expect(() => regradeFrozen(b.inputText, b.assessmentsText, { ...b.authority, ...patch })).toThrow();
 f.input.entries[0].confidence = .35; f.assessments.entries[0].source_sha256 = classificationDigest(f.input.entries[0]);
 const old = f.bind(); expect(() => regradeFrozen(old.inputText, old.assessmentsText, old.authority)).toThrow("unbound");
});
it("rejects duplicate identities and insufficient or inconsistent support instead of copying old confidence", () => {
 for (const patch of [{ n: 9, source: "own" }, { n: 49, source: "external:fixture" }]) {
  const f = fixture(); Object.assign(f.assessments.entries[0].claim_population, patch); const b = f.bind();
  expect(() => regradeFrozen(b.inputText, b.assessmentsText, b.authority)).toThrow("below threshold");
 }
 const f = fixture(); f.assessments.entries[0].consistency = 0; let b = f.bind();
 expect(() => regradeFrozen(b.inputText, b.assessmentsText, b.authority)).toThrow("population");
 f.input.entries[1] = structuredClone(f.input.entries[0]); b = f.bind();
 expect(() => regradeFrozen(b.inputText, b.assessmentsText, b.authority)).toThrow("identities");
});
it("keeps the old 173-entry guard and writes no receipt on a rejected native CLI invocation", () => {
 const f = fixture(), b = f.bind();
 expect(() => gradeCandidate({}, b.assessmentsText, b.authority)).toThrow("unapproved or mismatched frozen input");
 const dir = mkdtempSync(join(tmpdir(), "regrade-cli-")); dirs.push(dir);
 const paths = ["input.json", "assessments.json", "authority.json", "receipt.json"].map(n => join(dir, n));
 writeFileSync(paths[0]!, b.inputText); writeFileSync(paths[1]!, b.assessmentsText); writeFileSync(paths[2]!, JSON.stringify(b.authority));
 const invoke = () => spawnSync(process.execPath, ["--import", "tsx", resolve("tools/grade-strategies.ts"), "regrade-frozen", ...paths], { encoding: "utf8" });
 expect(invoke().status).toBe(0); const original = readFileSync(paths[3]!, "utf8");
 expect(invoke().status).not.toBe(0); expect(readFileSync(paths[3]!, "utf8")).toBe(original);
 rmSync(paths[3]!); writeFileSync(paths[0]!, b.inputText + "\n");
 expect(invoke().status).not.toBe(0); expect(() => readFileSync(paths[3]!)).toThrow();
});
