/** Offline candidate construction only. Publishing remains the normal CAS-controlled ops transaction. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classificationDigest } from "../src/knowledge/runtime/classification.js";
import { validateDocuments, validateUpdate } from "../src/knowledge/runtime/validation.js";
import { gradingDigest, type StrategyGrading } from "../src/knowledge/strategy-grading.js";
import type { Candidate } from "../src/knowledge/runtime/store.js";

export const ISSUE85_BASE = "K1-0725587f50e671013f48f93e6c3e6b7f27d3d05638c40f33b460c9aeda7c7c46";
const path = "characters/silent/strategy-entries.json";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
type Row = Record<string, any>;
const cards: Record<string, [number, number, number, number]> = {
  "issue80-cards-leg_sweep-act1-s4": [26, 30, 44, 76],
  "issue80-cards-noxious_fumes-act1-s2": [15, 26, 17, 39],
  "issue80-cards-blur-act2-s6": [19, 35, 21, 52],
  "issue80-cards-cloak_and_dagger-act3-s6": [32, 100, 11, 69],
  "issue80-cards-backflip-act3-s6": [43, 95, 22, 66],
};
export function gradeCandidate(files: Record<string, string>, checkpointText: string, authority: Row): Candidate {
  const checkpoint = JSON.parse(checkpointText), original = files[path];
  if (!original || sha(original) !== checkpoint.source_document_sha256 || checkpoint.entries.length !== 173
    || authority.url !== "https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6512932583"
    || !authority.body?.startsWith("[Claude] #85 检查点核过")) throw Error("unapproved or mismatched frozen input");
  const body = JSON.parse(original), assessments = new Map<string, Row>(checkpoint.entries.map((e: Row) => [e.id, e]));
  if (body.entries.length !== 173 || assessments.size !== 173) throw Error("incomplete grading");
  for (const e of body.entries) {
    const a = assessments.get(e.id);
    if (!a || a.version !== e.version) throw Error("missing original revision");
    const mechanism = a.evidence_type === "机制事实";
    // These approved summaries explicitly span several distinct signatures/windows.
    const multiple = [33, 50, 51, 59, 64, 65, 67, 74, 76, 78, 79, 81, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 102, 103, 104, 105, 106, 107, 108, 121, 151, 164, 165, 166, 167].includes(a.original_index);
    const single = mechanism && !multiple;
    let summary = mechanism ? `机制事实（已从原件复核）${single ? "；单次观察窗口" : "；限定原观察窗口"}：${a.limited_fact_if_eligible}`
      : `${a.grade === "B+" ? "非对照；" : ""}${a.evidence_type}：${e.review_observation?.summary ?? e.strategy}`;
    const card = cards[e.id];
    if (card) {
      const [wp, wn, lp, ln] = card;
      const d = e.review_observation.denominators;
      if (d.picked.wins !== wp || d.picked.offers - wp !== lp || d.declined.wins + wp !== wn
        || d.declined.offers - d.declined.wins + lp !== ln) throw Error("card pick-rate denominator mismatch");
      summary = `${a.grade === "B+" ? "非对照；" : ""}赢家做法：${e.id.split("-cards-")[1]}，赢家拿牌 ${wp}/${wn}，败者拿牌 ${lp}/${ln}；玩家自选关联，非因果。原拿/不拿的整局胜率差仅作历史注记，不作动作收益。`;
      e.review_observation.winner_pick_rates = { winners: { picked: wp, offered: wn }, losers: { picked: lp, offered: ln }, unit: "uploads", observational: true };
    }
    const grading: StrategyGrading = { schema: "strategy-grading-v1", grade: a.grade, category: a.category,
      evidence_type: a.evidence_type, summary, single_observation_window: single,
      basis: { checkpoint_sha256: sha(checkpointText), original_entry_sha256: a.original_entry_audit_sha256, assessment_sha256: sha(JSON.stringify(a)) } };
    const oldPublication = e.formal_publication;
    e.grading_origin = { knowledge_version: ISSUE85_BASE, path, document_sha256: checkpoint.source_document_sha256, id: e.id };
    e.prior_strategy = e.strategy;
    e.strategy = mechanism ? summary : card ? summary : e.strategy;
    e.confidence = mechanism ? null : a.confidence;
    e.evidence_type = a.evidence_type;
    e.grading = grading;
    e.grading_population = a.claim_population;
    e.grading_limitations = [a.rationale, "仅证据支持分/限定记录事实；不表示因果收益、胜率或已实现自然采用。原反例、条件、版本和分母原样保留。"];
    e.formal_publication = { schema: "strategy-publication-v1", status: a.grade === "B−" ? "reference_only" : "published",
      authorization: authority.url, authorization_sha256: sha(authority.body), grading_sha256: gradingDigest(grading),
      ...(oldPublication !== undefined ? { previous: oldPublication } : {}) };
    if (e.review_observation) {
      const r = e.review_observation;
      e.prior_review_display = Object.fromEntries(["summary", "rule_candidate", "confidence", "status", "limitations"].filter(k => Object.hasOwn(r, k)).map(k => [k, r[k]]));
      r.summary = summary;
      if (mechanism || card) r.rule_candidate = summary;
      r.confidence = e.confidence;
      if (r.status) r.status = a.grade === "B−" ? "reference_only" : "published";
      const stale = (v: string) => /仅review-only，未发布|待Roy审阅/.test(v)
        ? "历史审阅状态见原K1；本条已按#85分级，发布状态见formal_publication；消费者读回与自然收益仍另验。" : v;
      if (Array.isArray(r.limitations)) r.limitations = r.limitations.map(stale);
      if (Array.isArray(e.limits)) e.limits = e.limits.map(stale);
    }
  }
  const changed: Record<string, string> = { [path]: JSON.stringify(body) };
  for (const [p, raw] of Object.entries(files)) if (p.endsWith("/classification.json")) {
    const classification = JSON.parse(raw); let touched = false;
    for (const e of classification.entries) if (e.target.path === path) {
      const target = body.entries.find((v: Row) => v.id === e.target.id);
      if (!target) throw Error("classification target lost");
      e.target.sha256 = classificationDigest(target); touched = true;
    }
    if (touched) changed[p] = JSON.stringify(classification);
  }
  const after = { ...files, ...changed };
  validateDocuments(after); validateUpdate(files, after);
  return { schema: "knowledge-candidate-v1", id: "issue85-grading-v1", base: ISSUE85_BASE, character: "silent", source: authority.url, files: changed };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [base, checkpoint, authority, destination] = process.argv.slice(2);
  if (!base || !checkpoint || !authority || !destination) throw Error("expected base-files checkpoint authority destination");
  const candidate = gradeCandidate(JSON.parse(readFileSync(base, "utf8")), readFileSync(checkpoint, "utf8"), JSON.parse(readFileSync(authority, "utf8")));
  writeFileSync(destination, JSON.stringify(candidate, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ id: candidate.id, documents: Object.keys(candidate.files), entries: 173, production_write: false }));
}
