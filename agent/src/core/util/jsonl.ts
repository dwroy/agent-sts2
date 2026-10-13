import { createHash } from "node:crypto";
import { closeSync, fstatSync, openSync, readSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

function missingSeparator(fd: number, size: number): boolean {
  if (size === 0) return false;
  const byte = Buffer.alloc(1);
  if (readSync(fd, byte, 0, 1, size - 1) !== 1) throw new Error("JSONL tail changed during inspection");
  return byte[0] !== 10;
}

/** Audit rows also preserve their own interrupted tail, without recursively creating sidecars. */
function auditBoundary(path: string, row: object): void {
  const fd = openSync(`${path}.recovery.jsonl`, "a+");
  try {
    const size = fstatSync(fd).size;
    writeFileSync(fd, `${missingSeparator(fd, size) ? "\n" : ""}${JSON.stringify(row)}\n`);
  } finally { closeSync(fd); }
}

/** Append complete records after interrupted writes, preserving every byte of the existing file. */
export function appendJsonLine(path: string, row: unknown): void {
  const text = JSON.stringify(row);
  if (text === undefined) throw new TypeError("JSONL record is not serializable");
  const fd = openSync(path, "a+");
  try {
    const size = fstatSync(fd).size;
    const repair = missingSeparator(fd, size);
    if (repair) {
      const tail = Buffer.alloc(Math.min(size, 4096));
      if (readSync(fd, tail, 0, tail.length, size - tail.length) !== tail.length) throw new Error("JSONL tail changed during recovery");
      // This records an observed boundary, not a claim that a later append succeeded.
      auditBoundary(path, {
        type: "jsonl_unterminated_tail", source: basename(path), boundary_offset: size,
        next_record_offset: size + 1, tail_bytes: tail.length,
        tail_sha256: createHash("sha256").update(tail).digest("hex"),
      });
    }
    writeFileSync(fd, `${repair ? "\n" : ""}${text}\n`);
  } finally { closeSync(fd); }
}
