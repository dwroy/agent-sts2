/** Offline P0.1 audit of frozen B2/B3 samples. Production exports must come through logdb. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { auditSigns, type SignAuditSample } from "../src/sim/s-sign.js";

export interface SignCase {
  id: string; boss: string; ascension: number; lane: "b2" | "b3"; source: string;
  samples: SignAuditSample[];
}

export function signAudit(cases: readonly SignCase[]) {
  const keys = cases.map((row) => row.id);
  if (new Set(keys).size !== keys.length) throw new Error("duplicate case identity");
  const groups = new Map<string, SignCase[]>();
  for (const row of cases) {
    if (!row.id || !row.boss || !row.source || !Number.isSafeInteger(row.ascension) || !["b2", "b3"].includes(row.lane)) throw new Error("invalid audit identity");
    const key = JSON.stringify([row.boss, row.ascension, row.lane]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return { schema: "s-sign-baseline-v1", cases: cases.map(({ samples, ...identity }) => ({ ...identity, audit: auditSigns(samples) })),
    groups: [...groups.values()].map((rows) => ({ boss: rows[0]!.boss, ascension: rows[0]!.ascension, lane: rows[0]!.lane,
      case_ids: rows.map((row) => row.id), audit: auditSigns(rows.flatMap((row) => row.samples)) })),
    limits: "Frozen conditional-model samples only; absent boss/ascension groups remain unaudited. No historical samples reconstructed from aggregate statistics." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("usage: s-sign-audit.ts frozen-cases.json output.json");
  const bytes = readFileSync(input);
  const report = signAudit(JSON.parse(bytes.toString()) as SignCase[]);
  writeFileSync(output, JSON.stringify({ ...report, input_sha256: createHash("sha256").update(bytes).digest("hex") }, null, 2) + "\n");
}
