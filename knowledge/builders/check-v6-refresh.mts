/** Read-only checks using the production contracts; no new knowledge rules. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { validateBuildCoreFile } from "../../agent/src/v6/build-core.js";
import { v6HistoryPackSchema } from "../../agent/src/sim/v6-history-pack.js";
import { validate } from "../../agent/src/v6/schema.js";
const [kind, path, character, ...extra] = process.argv.slice(2);
if (!path || !character || extra.length || !["cores", "history"].includes(kind ?? ""))
  throw new Error("check-v6-refresh.mts cores|history PATH CHARACTER");
const bytes = readFileSync(path), value: unknown = JSON.parse(bytes.toString("utf8"));
const sha = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
if (kind === "cores") {
  const result = validateBuildCoreFile(value);
  if (!result.ok) throw new Error(result.issues.join("; "));
  if (result.value.character !== character) throw new Error("core character mismatch");
} else {
  const result = validate(v6HistoryPackSchema, value);
  if (!result.ok) throw new Error(result.issues.join("; "));
  if (result.value.data.character !== character || result.value.content_sha256 !== sha(JSON.stringify(result.value.data))
    || Date.parse(result.value.generated_at) < Date.parse(result.value.data.cutoff)) throw new Error("history scope/hash/time mismatch");
}
console.log(JSON.stringify({ kind, path, character, bytes: bytes.length, sha256: sha(bytes), valid: true }));
