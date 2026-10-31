/** Narrow, evidence-preserving three-way continuation for reviewed strategy/classification objects. */
import { canonical } from "./classification.js";
import { object, type Row } from "./validation.js";
import { createHash } from "node:crypto";
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export interface Delta { path: string; id: string; before: string | null; after: string }
export function mergeApprovedDelta(character: string, before: Record<string, string>, changes: Record<string, string>, current: Record<string, string>) {
 if (!/^[a-z0-9_]+$/.test(character) || ["migration", "common"].includes(character)) throw Error("unsupported continuation character");
 const files: Record<string, string> = {}, delta: Delta[] = [];
 for (const [path, text] of Object.entries(changes)) {
  if (!["strategy-entries.json", "classification.json"].some(name => path === `characters/${character}/${name}`)) throw Error("unsupported continuation document");
  const next = JSON.parse(text), old = before[path] ? JSON.parse(before[path]!) : { ...next, entries: [] }, head = current[path] ? JSON.parse(current[path]!) : { ...next, entries: [] };
  const header = (doc: Row) => Object.fromEntries(Object.entries(doc).filter(([key]) => key !== "entries"));
  const index = (doc: Row): Map<string, Row> => {
   if (!object(doc) || !Array.isArray(doc.entries) || doc.entries.some(e => !object(e) || typeof e.id !== "string" || !e.id)) throw Error("unsupported continuation shape");
   const map = new Map<string, Row>(doc.entries.map(e => [e.id, e]));
   if (map.size !== doc.entries.length) throw Error("duplicate continuation object");
   return map;
  };
  const b = index(old), n = index(next), h = index(head);
  if (canonical(header(old)) !== canonical(header(next)) || canonical(header(old)) !== canonical(header(head))) throw Error("continuation header change requires owner review");
  for (const id of b.keys()) if (!n.has(id) || !h.has(id)) throw Error("continuation cannot delete objects");
  const replacements = new Map<string, Row>();
  for (const [id, value] of n) {
   const prior = b.get(id);
   if (canonical(prior ?? null) === canonical(value)) continue;
   // Even identical concurrent edits are outside the reviewed disjoint-object contract.
   if (canonical(h.get(id) ?? null) !== canonical(prior ?? null)) throw Error("continuation object conflict");
   replacements.set(id, value);
   delta.push({ path, id, before: prior ? hash(prior) : null, after: hash(value) });
  }
  files[path] = JSON.stringify({ ...head, entries: [...h].map(([id, value]) => replacements.get(id) ?? value).concat([...replacements].filter(([id]) => !h.has(id)).map(([, value]) => value)) });
 }
 if (!delta.length) throw Error("no approved continuation delta");
 return { files, delta };
}
