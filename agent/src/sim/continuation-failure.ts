/** silent-0332: keep a replayable failure separate from the bounded human-readable error. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { serialize } from "node:v8";
import { canonicalText, memoKey } from "./compute-memo.js";
import type { JsonValue } from "../core/util/json.js";

export const CONTINUATION_CAPTURE_BYTES = 1024 * 1024;
export const CONTINUATION_FILE_BYTES = 2 * 1024 * 1024;
export const CONTINUATION_FILES_PER_RUN = 16;

export interface ContinuationFailure {
  schema: "continuation-failure-v1";
  reason: string;
  seed: number | null;
  fingerprint: string | null;
  switches: string | null;
  bytes: number | null;
  sha256: string | null;
  codec: "node-v8-base64";
  payload: string | null;
  capture: "complete" | "oversize" | "unserializable";
  runtime: { node: string; v8: string };
  task?: readonly [deck: number, order: number, sample: number, seed: number];
}

const digest = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

export function captureContinuationFailure(reason: string, seed: number | null, value: unknown): ContinuationFailure {
  const base = { schema: "continuation-failure-v1" as const, reason, seed,
    codec: "node-v8-base64" as const, runtime: { node: process.versions.node, v8: process.versions.v8 },
    switches: memoKey("continuation-switches", null) };
  try {
    // V8 bytes preserve shared references, undefined and nonfinite numbers used by the simulator.
    const bytes = serialize(value);
    return { ...base, fingerprint: digest(canonicalText(value)), bytes: bytes.length,
      sha256: digest(bytes), payload: bytes.length <= CONTINUATION_CAPTURE_BYTES ? bytes.toString("base64") : null,
      capture: bytes.length <= CONTINUATION_CAPTURE_BYTES ? "complete" : "oversize" };
  } catch {
    return { ...base, fingerprint: null, bytes: null, sha256: null, payload: null, capture: "unserializable" };
  }
}

export class ContinuationSampleError extends Error {
  constructor(message: string, readonly continuationFailure: ContinuationFailure) {
    super(message);
  }
}

export function continuationFailureOf(error: unknown): ContinuationFailure | undefined {
  return error instanceof ContinuationSampleError ? error.continuationFailure : undefined;
}

/** One immutable first envelope per failed question, bounded per file and per run. Never changes the sim error. */
export function preserveContinuationFailure(
  failure: ContinuationFailure, context: Record<string, JsonValue>, directory?: string,
): Record<string, JsonValue> {
  const reference: Record<string, JsonValue> = { schema: failure.schema, reason: failure.reason, seed: failure.seed,
    fingerprint: failure.fingerprint, payload_sha256: failure.sha256, payload_bytes: failure.bytes,
    capture: failure.capture, complete: false };
  if (!directory) return { ...reference, status: "unconfigured" };
  if (failure.capture !== "complete" || !failure.payload) return { ...reference, status: failure.capture };
  try {
    const bytes = Buffer.from(failure.payload, "base64");
    if (bytes.length > CONTINUATION_CAPTURE_BYTES || bytes.length !== failure.bytes || digest(bytes) !== failure.sha256) {
      return { ...reference, status: "invalid_payload" };
    }
    const run = digest(String(context["run"]));
    const question = digest(String(context["question_key"]));
    const folder = join(directory, run);
    const path = join(folder, `${question}.json`);
    mkdirSync(folder, { recursive: true });
    try {
      if (statSync(path).size > CONTINUATION_FILE_BYTES) return { ...reference, status: "invalid_existing_file" };
      const raw = readFileSync(path);
      const prior = JSON.parse(raw.toString("utf8")) as { sample: ContinuationFailure };
      if (prior.sample?.schema !== failure.schema || prior.sample.capture !== "complete" || !prior.sample.payload) {
        return { ...reference, status: "invalid_existing_file" };
      }
      const stored = Buffer.from(prior.sample.payload, "base64");
      if (stored.length !== prior.sample.bytes || digest(stored) !== prior.sample.sha256) return { ...reference, status: "invalid_existing_file" };
      return { ...reference, status: "deduplicated", path, sha256: digest(raw), complete: true,
        stored_fingerprint: prior.sample.fingerprint, current_sample_saved: prior.sample.fingerprint === failure.fingerprint };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { ...reference, status: "invalid_existing_file" };
    }
    if (readdirSync(folder).filter((name) => name.endsWith(".json")).length >= CONTINUATION_FILES_PER_RUN) {
      return { ...reference, status: "run_limit" };
    }
    const raw = Buffer.from(JSON.stringify({ schema: failure.schema, question: context, sample: failure }) + "\n");
    if (raw.length > CONTINUATION_FILE_BYTES) return { ...reference, status: "file_limit" };
    // Exclusive creation preserves an earlier failure, including an interrupted write, on every retry.
    writeFileSync(path, raw, { flag: "wx" });
    return { ...reference, status: "saved", path, sha256: digest(raw), complete: true, current_sample_saved: true };
  } catch {
    return { ...reference, status: "storage_failed" };
  }
}
