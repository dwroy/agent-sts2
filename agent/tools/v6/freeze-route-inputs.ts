/** Freeze bounded existing question references; no game simulation or online request. */
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import type { FrozenRouteIndex } from "./frozen-route.js";
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--manifest" || args[2] !== "--out") throw new Error("usage: freeze-route-inputs.ts --manifest FILE --out NEW_FILE");
const bytes = readFileSync(resolve(args[1]!)), manifest = JSON.parse(bytes.toString("utf8")), out = resolve(args[3]!);
if (existsSync(out)) throw new Error("output already exists");
const cap = manifest.log_byte_limits?.["jev-prompts.jsonl"];
if (!Number.isSafeInteger(cap) || cap < 1 || typeof manifest.logs !== "string") throw new Error("missing frozen prompt byte limit");
const path = join(resolve(manifest.logs), "jev-prompts.jsonl");
const index: FrozenRouteIndex = { schema: "v6-frozen-route-index-v1", source_manifest_sha256: createHash("sha256").update(bytes).digest("hex"),
  byte_limit: cap, rows: [], malformed_rows: 0 };
let pending = Buffer.alloc(0), offset = 0;
for await (const chunk of createReadStream(path, { start: 0, end: cap - 1 })) {
  pending = Buffer.concat([pending, chunk as Buffer]);
  let end: number;
  while ((end = pending.indexOf(10)) >= 0) {
    const line = pending.subarray(0, end + 1); pending = pending.subarray(end + 1);
    if (line.length > 8 * 1024 * 1024) throw new Error("prompt row exceeds bounded frozen range");
    if (line.includes(Buffer.from('"route_review"')) && line.includes(Buffer.from('"plan_facts"'))) {
      try {
        const row = JSON.parse(line.toString("utf8"));
        if (typeof row.run_id === "string" && Number.isSafeInteger(row.floor) && typeof row.observed_ts === "string"
          && row.request?.state?.route_review?.plan_facts?.boss) index.rows.push({ run_id: row.run_id, floor: row.floor, observed_ts: row.observed_ts,
          source: { path, offset, bytes: line.length, sha256: createHash("sha256").update(line).digest("hex") } });
      } catch { index.malformed_rows++; }
    }
    offset += line.length;
  }
  if (pending.length > 8 * 1024 * 1024) throw new Error("unterminated oversized prompt row");
}
if (pending.length || offset !== cap) throw new Error("frozen byte limit is truncated or not a row boundary");
writeFileSync(out, JSON.stringify(index) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify({ out, rows: index.rows.length, bytes: offset, malformed_rows: index.malformed_rows }) + "\n");
