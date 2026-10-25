/** Local archival format probe: copy original bytes, do not infer or publish gameplay knowledge. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { KnowledgeStore, digest } from "../../../agent/src/knowledge/runtime/store.js";
import { closeIndexedReaders } from "../../../agent/src/knowledge/runtime/reader.js";
import { buildKnowledgeTools } from "../../../agent/src/brain/tools/agent-knowledge.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";

async function main() {
 const repo = resolve(process.argv[2]!), destination = resolve(process.argv[3]!), workspace = resolve(process.argv[4]!);
 const receiptPath = "paper/materials/20261026-finish053954-integrator/native-content-independent-readback.json";
 const receiptRaw = readFileSync(join(repo, receiptPath)), receipt = JSON.parse(receiptRaw.toString());
 const run = ".worktrees/codex-strategy-silent-20261026-053954/learner/runs/20261026-054011-891e9dbb-f77c-4c79-b903-6b26cad45d0f-strategy-proposal/scratch/";
 const proofs: any[] = [];
 const original = (name: string) => {
  const path = run + name, proof = receipt.source_refs.find((r: any) => r.path === path) ?? receipt.pages.find((r: any) => r.path === join(repo, path));
  assert(proof, `original source proof missing: ${name}`);
  const bytes = readFileSync(join(repo, path)); assert.equal(bytes.length, proof.bytes); assert.equal(digest(bytes.toString()), proof.sha256);
  proofs.push({ path, bytes: bytes.length, sha256: proof.sha256 }); return bytes.toString();
 };
 const candidateRaw = original("whole-run-candidate.json"), candidate = JSON.parse(candidateRaw);
 const book = original("whole-run-playbook.md"), trajectoriesRaw = original("trajectory-cases.json"), trajectories = JSON.parse(trajectoriesRaw);
 const ledgerRaw = original("source-ledger.json"), ledger = JSON.parse(ledgerRaw);
 assert.equal(candidate.original_text, book); assert.equal(candidate.runs.length, 0); assert.equal(trajectories.cases.length, 20);
 const paragraphs = Array.from(book.matchAll(/^([1-5])\. [^\n]+/gm), m => m[0]); assert.equal(paragraphs.length, 5);
 const attachment = (id: string, media_type: string, content: string) => ({ id, media_type, content, sha256: digest(content) });
 const attachments = [attachment("playbook", "text/markdown", book), attachment("trajectories", "application/json", trajectoriesRaw), attachment("source-ledger", "application/json", ledgerRaw),
  ...receipt.pages.map((page: any, i: number) => attachment(`page-${i}`, "application/json", original(`pages/${page.path.split("/").at(-1)}`)))];
 const entry = { id: candidate.id, revision: "format-probe-only", title: book.split("\n")[0]!.replace(/^# /, ""),
  scope: { character: "silent", ascensions: [10], game_version: candidate.version }, source: candidate.source,
  status: "candidate", confidence: 0, evidence_status: "unassessed", verified_complete_playbook: false, validation_status: "unverified",
  sources: [{ id: "original-source", source: ledger.source, url: ledger.provenance.url, game_version: ledger.version,
   sha256: ledger.provenance.database_sha256, downloaded_at: ledger.provenance.downloaded_at,
   sample: { n: ledger.model_read_trajectories, unit: "uploads", players: ledger.independent_players }, filters: ledger.provenance.filter,
   license: ledger.provenance.license, design: "observational", limitations: ledger.limitations }],
  evidence: [{ id: "original-archive", source_id: "original-source", role: "unassessed", ref: "artifact:playbook;artifact:trajectories;artifact:source-ledger",
   observation: "Archival format probe only. Original support/counterexamples/unknowns remain in the immutable attachments; no scientific reclassification.", limitations: trajectories.limitations }],
  phases: paragraphs.map((content, i) => ({ id: `original-phase-${i + 1}`, stage: ["START", "BOSS1", "TRANSITION", "RESOURCE", "FINAL"][i],
   acts: [], goals: [], evidence_ids: ["original-archive"], content })), limitations: trajectories.limitations,
  unknowns: [candidate.consumer_history_dto], original: { sha256: digest(candidateRaw), content: candidateRaw }, references: [], attachments };
 mkdirSync(join(workspace, ".artifacts"), { recursive: true });
 const scratch = mkdtempSync(join(workspace, ".artifacts/issue72-053954-"));
 const store = new KnowledgeStore(join(scratch, "isolated-runtime"));
 const envelope = { schema: "knowledge-candidate-v1" as const, id: "fixture053954", base: null, character: "silent", source: "format-probe-only",
  files: { "characters/silent/build-research.json": JSON.stringify({ schema: "build-research-v1", character: "silent", entries: [entry] }) } };
 writeFileSync(join(scratch, "format-candidate.json"), JSON.stringify(envelope));
 setKnowledgeCharacter("silent");
 try {
  store.submit(envelope); store.validate(envelope.id); const version = store.publish(envelope.id);
  const context = { knowledgeDir: String(store.bind("FIXTURE053954", "format-probe-only").snapshot), ascension: 10, logsDir: scratch };
  const tool = buildKnowledgeTools(context).find(t => t.name === "kb_build_research")!;
  let calls = 0, maxBytes = 0;
  const fetch = async (input: Record<string, unknown>) => {
   const chunks = new Map<string, string[]>(); let offset: number | null = 0, pages = 0;
   do {
    const result = await tool.run({ query: "*", id: entry.id, ...input, page_offset: offset }, context);
    assert(!result.isError, result.text); const bytes = Buffer.byteLength(result.text); assert(bytes <= 24000); maxBytes = Math.max(maxBytes, bytes); calls++;
    const page = JSON.parse(result.text); assert.equal(page.verified_complete_playbook, false); assert.equal(page.validation_status, "unverified");
    assert.equal(page.condition_evaluation, "not_evaluated"); assert.equal(page.selection.scope, "selected_section");
    assert.equal(page.evidence_read, "selected_section_only_not_complete_evidence");
    for (const s of page.sections) { const parts = chunks.get(s.pointer) ?? []; assert.equal(parts.length, s.part); parts.push(s.json_fragment); chunks.set(s.pointer, parts); }
    offset = page.next_page_offset; pages++;
   } while (offset !== null && pages < 1000);
   assert.equal(offset, null);
   if (chunks.has("/selected")) return { value: JSON.parse(chunks.get("/selected")!.join("")), pages };
   return { value: Array.from({ length: chunks.size }, (_, i) => JSON.parse(chunks.get(`/selected/${i}`)!.join(""))), pages };
  };
  assert.deepEqual((await fetch({ pointer: "/original" })).value, entry.original);
  for (let i = 0; i < 5; i++) assert.deepEqual((await fetch({ pointer: `/phases/${i}` })).value, entry.phases[i]);
  for (const artifact of attachments) {
   const fetched = await fetch({ artifact: artifact.id });
   if (artifact.media_type === "application/json") assert.deepEqual(fetched.value, JSON.parse(artifact.content));
   else assert.equal(fetched.value, artifact.content);
  }
  assert.deepEqual((await fetch({ artifact: "trajectories", pointer: "/columns" })).value, trajectories.columns);
  for (let i = 0; i < 20; i++) assert.deepEqual((await fetch({ artifact: "trajectories", pointer: `/cases/${i}` })).value, trajectories.cases[i]);
  assert.deepEqual((await fetch({ artifact: "trajectories", pointer: "/cases/0/phases/0/resources" })).value, trajectories.cases[0].phases[0].resources);
  const bad = await tool.run({ query: "*", id: entry.id, artifact: candidate.complete_histories_path }, context); assert.equal(bad.isError, true);
  assert.equal(store.db.prepare("SELECT count(*) n FROM business_items").get()!.n, 0);
  writeFileSync(destination, JSON.stringify({ kind: "isolated-original-format-probe", fixture_only: true, production_publication: false, source_tree_mutated: false,
   comment: "https://github.com/dwroy/agent-sts2/issues/72#issuecomment-6404052804", receipt: { path: receiptPath, sha256: digest(receiptRaw.toString()) }, raw_files: proofs,
   source_id: candidate.id, knowledge_version: version, source: candidate.source, game_version: candidate.version, independent_players: ledger.independent_players,
   formal_publication_original: candidate.formal_publication, consumer_readback_original: candidate.consumer_readback, original_runs: candidate.runs,
   verified_complete_playbook: false, executable_dto_created: false, dto_gap_original: candidate.consumer_history_dto, new_game_rules_original: candidate.new_game_rules,
   stages: 5, trajectories: 20, nodes: trajectories.cases.reduce((n: number, c: any) => n + c.phases.reduce((m: number, p: any) => m + p.nodes_complete_projection.length, 0), 0),
   availability_columns: trajectories.columns, attachments: attachments.length, complete_source_roundtrip: true, all_cases_and_adjacent_resources_addressable: true,
   calls, max_return_bytes: maxBytes, private_scratch: relative(workspace, scratch),
   license_preserved: true, raw_content_committed: false, implementation_note: "Raw bytes stay in ignored local scratch only; source owner must review any real candidate. Not a #60 release prerequisite." }, null, 2) + "\n");
 } finally { closeIndexedReaders(); store.close(); setKnowledgeCharacter(null); }
}
void main();
