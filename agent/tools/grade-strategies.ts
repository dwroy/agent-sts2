/** Offline candidate construction only. Publishing remains the normal CAS-controlled ops transaction. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonical, classificationDigest } from "../src/knowledge/runtime/classification.js";
import { validateDocuments, validateUpdate } from "../src/knowledge/runtime/validation.js";
import { gradingDigest, strategyGrading, type StrategyGrading } from "../src/knowledge/strategy-grading.js";
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

/** A separately authorized content revision never inherits the old checkpoint's judgment. */
export function regradeFrozen(inputText: string, assessmentsText: string, authority: Row): Row {
  const input = JSON.parse(inputText), assessments = JSON.parse(assessmentsText);
  const allowedUrl = "https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6539128264";
  const forbidden = ["confidence", "grading", "grading_origin", "grading_population", "grading_limitations", "evidence_type", "formal_publication", "prior_strategy", "prior_review_display"];
  if (authority.schema !== "strategy-regrading-authority-v1" || authority.url !== allowedUrl || authority.author !== "dwroy"
    || typeof authority.body !== "string" || !authority.body.startsWith("[Claude] #85 重判两条合并对象")
    || authority.body_sha256 !== sha(authority.body) || authority.input?.sha256 !== sha(inputText)
    || authority.assessments_sha256 !== sha(assessmentsText)
    || input.schema !== "issue79-regrading-input-v1" || input.fixed_base !== authority.input.base
    || input.source_document_sha256 !== authority.input.document_sha256 || input.original_batch !== authority.input.original_batch
    || assessments.schema !== "strategy-reassessments-v1" || !Array.isArray(input.entries) || !Array.isArray(assessments.entries)
    || !Array.isArray(authority.entries) || input.entries.length !== authority.entries.length || input.entries.length !== assessments.entries.length)
    throw Error("unapproved or mismatched regrading input");
  const bindings = new Map<string, Row>(authority.entries.map((a: Row) => [a.id, a]));
  const judgments = new Map<string, Row>(assessments.entries.map((a: Row) => [a.id, a]));
  if (!input.entries.length || bindings.size !== input.entries.length || judgments.size !== input.entries.length
    || new Set(input.entries.map((e: Row) => e.id)).size !== input.entries.length) throw Error("incomplete regrading identities");
  const revisions: Row[] = [];
  const entries = input.entries.map((original: Row) => {
    const binding = bindings.get(original.id), a = judgments.get(original.id), sourceSha = classificationDigest(original);
    if (!binding || !a || forbidden.some(k => Object.hasOwn(original, k)) || sourceSha !== binding.source_sha256
      || a.source_sha256 !== sourceSha || classificationDigest(a) !== binding.assessment_sha256) throw Error("unbound regrading object or assessment");
    const p = a.claim_population;
    let confidence: number | null;
    if (a.grade === "B−") confidence = 0;
    else if (a.grade === "B+" && a.evidence_type === "机制事实" && a.original_verified === true) confidence = null;
    else {
      if (a.consistency !== 1 || !p || !Number.isInteger(p.n) || p.n <= 0) throw Error("unverified scoring population");
      if (a.grade === "B+") {
        if (p.n < (p.source === "own" ? 10 : 50)) throw Error("descriptive population below threshold");
        confidence = Number((.35 * p.n / (p.n + 50)).toFixed(6));
      } else if (a.grade === "A" && Array.isArray(p.arms) && p.arms.length >= 2 && p.arms.every((v: Row) => Number.isInteger(v.n) && v.n >= 200)
        && p.n === Math.min(...p.arms.map((v: Row) => v.n))) confidence = Number((.49 * p.n / (p.n + 200)).toFixed(6));
      else throw Error("unsupported regrading judgment");
    }
    const grading: StrategyGrading = { schema: "strategy-grading-v1", grade: a.grade, category: a.category,
      evidence_type: a.evidence_type, summary: a.summary, single_observation_window: a.single_observation_window,
      basis: { checkpoint_sha256: sha(assessmentsText), original_entry_sha256: sourceSha, assessment_sha256: classificationDigest(a) } };
    const e: Row = { ...original, confidence, evidence_type: a.evidence_type, grading, grading_population: p ?? null,
      grading_limitations: a.limitations, grading_origin: { knowledge_version: input.fixed_base, path,
        document_sha256: input.source_document_sha256, id: original.id, source_content_sha256: sourceSha, source_input_sha256: sha(inputText) },
      formal_publication: { schema: "strategy-publication-v1", status: a.grade === "B−" ? "reference_only" : "published",
        authorization: authority.url, authorization_sha256: authority.body_sha256, grading_sha256: gradingDigest(grading) } };
    if (!strategyGrading(e) || !Array.isArray(a.limitations) || !a.limitations.length) throw Error("invalid new grading");
    if (Object.keys(original).some(k => canonical(original[k]) !== canonical(e[k]))) throw Error("non-grading content changed");
    const finalSha = classificationDigest(e);
    revisions.push({ id: e.id, version: e.version, source_sha256: sourceSha, assessment_sha256: classificationDigest(a),
      final_sha256: finalSha, runtime_revision: sha(path + "\n" + canonical(e)), grade: a.grade, confidence,
      formal_status: e.formal_publication.status, production_published: false });
    return e;
  });
  const doc = (values: Row[]) => ({ [path]: JSON.stringify({ schema: "brain-strategies-v1", character: "silent", entries: values }) });
  validateDocuments(doc(entries)); validateUpdate(doc(input.entries), doc(entries));
  return { schema: "strategy-regrading-receipt-v1", original_batch: input.original_batch, base: input.fixed_base,
    source_input_sha256: sha(inputText), assessments_sha256: sha(assessmentsText), authority_sha256: classificationDigest(authority),
    authorization: authority.url, status: "graded-awaiting-original-79-admission", production_published: false,
    classifications_unchanged: true, source_classifications_sha256: classificationDigest(input.classifications), entries, revisions };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2), regrading = args[0] === "regrade-frozen";
  const [base, checkpoint, authority, destination] = regrading ? args.slice(1) : args;
  if (!base || !checkpoint || !authority || !destination || args.length !== (regrading ? 5 : 4)) throw Error("expected regrade-frozen input assessments authority destination; legacy: base-files checkpoint authority destination");
  const result: Row = regrading ? regradeFrozen(readFileSync(base, "utf8"), readFileSync(checkpoint, "utf8"), JSON.parse(readFileSync(authority, "utf8")))
    : gradeCandidate(JSON.parse(readFileSync(base, "utf8")), readFileSync(checkpoint, "utf8"), JSON.parse(readFileSync(authority, "utf8")));
  writeFileSync(destination, JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify(regrading ? { schema: result.schema, entries: result.entries.length, production_write: false }
    : { id: result.id, documents: Object.keys(result.files), entries: 173, production_write: false }));
}
