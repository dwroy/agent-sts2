/** Bounded byte-range verification for immutable replay references. */
import { closeSync, openSync, readSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
export interface FrozenRange { path: string; offset: number; bytes: number; sha256: string }
export function frozenRecord(logs: string, source: FrozenRange): unknown {
  const base = realpathSync(logs), path = realpathSync(isAbsolute(source.path) ? source.path : resolve(base, source.path));
  const rel = relative(base, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)
    || !Number.isSafeInteger(source.offset) || source.offset < 0 || !Number.isSafeInteger(source.bytes)
    || source.bytes < 1 || source.bytes > 8 * 1024 * 1024 || !/^[0-9a-f]{64}$/.test(source.sha256)) throw new Error("invalid frozen log range");
  const fd = openSync(path, "r"), buffer = Buffer.alloc(source.bytes);
  try { let n = 0; while (n < buffer.length) { const got = readSync(fd, buffer, n, buffer.length - n, source.offset + n); if (!got) break; n += got; }
    if (n !== buffer.length || createHash("sha256").update(buffer).digest("hex") !== source.sha256) throw new Error("frozen log range SHA mismatch");
    return JSON.parse(buffer.toString("utf8"));
  } finally { closeSync(fd); }
}
