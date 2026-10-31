/** Source approvals bind archives by bytes and publishable objects by exact content. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { canonical, classificationDigest, validateClassifications } from "./classification.js";
import { object, rows, type Row } from "./validation.js";

export type Approval = Array<{ id: string; path: string; sha256?: string; bytes?: number } & Row>;

function readApproved(item: Approval[number]): Buffer {
 if (!object(item) || typeof item.id !== "string" || !item.id.trim() || typeof item.path !== "string") throw Error("invalid source approval");
 const raw = readFileSync(item.path), sha256 = createHash("sha256").update(raw).digest("hex");
 // Non-JSON evidence never grants object permission and must have a frozen byte identity.
 if (extname(item.path).toLowerCase() !== ".json" && (item.sha256 === undefined || item.bytes === undefined)
  || item.sha256 !== undefined && item.sha256 !== sha256 || item.bytes !== undefined && item.bytes !== raw.length) throw Error("continuation approval changed or missing archive checksum");
 return raw;
}

/** Preserve all original fields and checksums, including evidence-only Markdown destinations. */
export function approvalEvidence(approved: Approval): Row[] {
 if (!Array.isArray(approved) || !approved.length) throw Error("continuation requires original approved artifacts");
 return approved.map(item => {
  const raw = readApproved(item);
  return { ...item, sha256: createHash("sha256").update(raw).digest("hex"), bytes: raw.length };
 });
}

/** External callbacks may publish only exact approved objects or explicitly linked strategy metadata. */
export function auditApprovedChanges(before: Record<string, string>, changes: Record<string, string>, approved: Approval): void {
 if (!Array.isArray(approved)) throw Error("invalid source approval");
 const permitted = new Set(approved.flatMap(item => {
  const raw = readApproved(item);
  if (extname(item.path).toLowerCase() !== ".json") return [];
  // Malformed JSON approvals remain errors; archives are never guessed from a parse failure.
  const body: unknown = JSON.parse(raw.toString("utf8"));
  const entries = Array.isArray(body) ? body : object(body) && Array.isArray(body.entries) ? body.entries : [body];
  return entries.filter(e => object(e) && e.id === item.id).map(canonical);
 }));
 const all = { ...before, ...changes };
 let count = 0;
 for (const [path, text] of Object.entries(changes)) {
  const next = JSON.parse(text) as Row;
  if (!Array.isArray(next.entries)) throw Error("reference-artifact updates require owner review");
  const old = new Map(rows(JSON.parse(before[path] ?? '{"entries":[]}') as Row).map(e => [e.id, canonical(e)]));
  const classification = /^(?:characters\/[a-z0-9_]+|common)\/classification\.json$/.test(path);
  // Validate the declarative identity, role, type and exact target digest before deriving any permission.
  if (classification) validateClassifications(path, next, all);
  for (const entry of rows(next)) if (old.get(entry.id) !== canonical(entry)) {
   let allowed = permitted.has(canonical(entry));
   if (!allowed && classification && entry.target.type === "strategy") {
    const target = entry.target;
    const prefix = path.slice(0, -"classification.json".length);
    if (target.path === prefix + "strategy-entries.json" && target.parent_id === undefined) {
     const strategy = rows(JSON.parse(all[target.path]!)).find(e => e.id === target.id);
     allowed = !!strategy && classificationDigest(strategy) === target.sha256 && permitted.has(canonical(strategy));
    }
   }
   if (!allowed) throw Error(`change is absent from frozen-source artifacts: ${entry.id}`);
   count++;
  }
 }
 if (!count) throw Error("no new content; use original no-change completion");
}
