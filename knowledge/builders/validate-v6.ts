/** Read-only learner self-check. Run using agent/node_modules/.bin/tsx. */
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { validateV6Draft, type DraftContext } from "../../agent/src/v6/draft.js";
import { characterSchema } from "../../agent/src/v6/formats.js";
import { array, id, object, validate } from "../../agent/src/v6/schema.js";
const [kind, draftPath, contextPath, ...extra] = process.argv.slice(2);
try {
  if ((kind !== "reflex" && kind !== "directions") || !draftPath || !contextPath || extra.length) throw new Error("usage: validate-v6.ts reflex|directions DRAFT.json CONTEXT.json");
  const read = (path: string): string => {
    if (!statSync(path).isFile() || statSync(path).size > 8 * 1024 * 1024) throw new Error("input must be a file <=8MiB");
    return readFileSync(path, "utf8");
  };
  const draft = read(draftPath), context = read(contextPath);
  const parsed = validate(object({ character: characterSchema, experienceIds: array(id), directionIds: array(id), runIds: array(id, 1) }), JSON.parse(context));
  if (!parsed.ok) throw new Error(parsed.issues.join("; "));
  for (const key of ["experienceIds", "directionIds", "runIds"] as const) if (new Set(parsed.value[key]).size !== parsed.value[key].length) throw new Error(`duplicate context ${key}`);
  const result = validateV6Draft(kind, JSON.parse(draft), parsed.value as DraftContext);
  const hash = (v: string): string => createHash("sha256").update(v).digest("hex");
  console.log(JSON.stringify({ ...result, ...(result.ok ? { value: undefined } : {}), kind, draft_sha256: hash(draft), context_sha256: hash(context), publication: false }));
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  console.log(JSON.stringify({ ok: false, issues: [(error as Error).message], publication: false }));
  process.exitCode = 1;
}
