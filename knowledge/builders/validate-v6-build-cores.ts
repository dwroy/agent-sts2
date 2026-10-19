/** Read-only frozen-context self-check; no knowledge writes or model calls. */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { validateBuildCoreDraft } from "../../agent/src/v6/build-core-draft.js";
import { characterSchema } from "../../agent/src/v6/formats.js";
import { array, id, object, validate } from "../../agent/src/v6/schema.js";
const [draftPath, contextPath, ...extra] = process.argv.slice(2);
try {
  if (!draftPath || !contextPath || extra.length) throw new Error("usage: validate-v6-build-cores.ts DRAFT.json CONTEXT.json");
  const read = (path: string): string => {
    const stat = statSync(path);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error("input must be a file <=8MiB");
    return readFileSync(path, "utf8");
  };
  const draft = read(draftPath), context = read(contextPath);
  const parsed = validate(object({ character: characterSchema, experienceIds: array(id), directionIds: array(id), runIds: array(id, 1), reflexIds: array(id) }), JSON.parse(context));
  if (!parsed.ok) throw new Error(parsed.issues.join("; "));
  for (const k of ["experienceIds", "directionIds", "runIds", "reflexIds"] as const) if (new Set(parsed.value[k]).size !== parsed.value[k].length) throw new Error(`duplicate context ${k}`);
  const result = validateBuildCoreDraft(JSON.parse(draft), parsed.value);
  const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
  console.log(JSON.stringify({ ...result, ...(result.ok ? { value: undefined } : {}), draft_sha256: sha(draft), context_sha256: sha(context), publication: false }));
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  console.log(JSON.stringify({ ok: false, issues: [(error as Error).message], publication: false })); process.exitCode = 1;
}
