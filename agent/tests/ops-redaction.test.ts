import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { redactSecrets } from "../../learner/lib/launcher.js";
import { readQueue } from "../../ops/codex/lib.js";

const dir = mkdtempSync(join(tmpdir(), "ops-redaction-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("streaming transcript redaction", () => {
  it("redacts secrets spanning byte boundaries and preserves UTF-8 bytes", () => {
    const secret = "fixture-private-value-仅测试";
    const file = join(dir, "cross-chunk.jsonl");
    const before = "a".repeat(65530) + secret + "🙂记录".repeat(17000) + secret;
    writeFileSync(file, before, { mode: 0o600 });
    expect(redactSecrets(file, [secret, "", secret])).toBe(2);
    expect(readFileSync(file, "utf8")).toBe(before.split(secret).join("[REDACTED]"));
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const unchanged = statSync(file);
    expect(redactSecrets(file, [secret])).toBe(0);
    expect(statSync(file).ino).toBe(unchanged.ino);
    expect(statSync(file).mtimeMs).toBe(unchanged.mtimeMs);
  });

  it("matches longer values first, handles adjacent values and removes temporary files", () => {
    const file = join(dir, "overlap.jsonl");
    writeFileSync(file, "fixture-long-valuefixture-longfixture-long-value");
    expect(redactSecrets(file, ["fixture-long", "fixture-long-value"])).toBe(3);
    expect(readFileSync(file, "utf8")).toBe("[REDACTED]".repeat(3));
    expect(readdirSync(dir).some((name) => name.includes(".redact-"))).toBe(false);
    expect(redactSecrets(join(dir, "missing"), ["fixture-long"])).toBe(0);
  });

  it("reports archive and scanner failures even when the dataset succeeds, retaining every retry log", () => {
    const root = join(dir, "snapshot");
    const runtime = join(root, "ops", "codex-ops");
    mkdirSync(join(root, "paper", "materials", "session", "codex"), { recursive: true });
    mkdirSync(join(root, "ops"), { recursive: true });
    writeFileSync(join(root, "ops", "paper_dataset.py"), "print('fixture dataset complete')\n");
    const engine = join(root, "fake-engine");
    const scanner = join(root, "fake-scanner");
    writeFileSync(engine, '#!/bin/sh\nexit "${FIXTURE_ARCHIVE_RC:-0}"\n');
    writeFileSync(scanner, '#!/bin/sh\n[ "${FIXTURE_SCAN_RC:-0}" = 0 ] || exit "$FIXTURE_SCAN_RC"\nwhile [ "$#" -gt 0 ]; do if [ "$1" = --report-path ]; then shift; printf "[]\\n" > "$1"; fi; shift; done\n');
    chmodSync(engine, 0o755); chmodSync(scanner, 0o755);
    const tick = (archive: string, scan: string) => spawnSync("bash", ["../ops/codex-ops.sh", "tick", "snapshot"], {
      encoding: "utf8", env: { ...process.env, CODEX_OPS_ROOT: root, CODEX_OPS_DIR: runtime,
        CODEX_OPS_TSX: engine, CODEX_OPS_GITLEAKS: scanner, CODEX_OPS_NO_DRAIN: "1",
        FIXTURE_ARCHIVE_RC: archive, FIXTURE_SCAN_RC: scan },
    });
    expect(tick("7", "0").status).toBe(0);
    expect(readQueue(join(runtime, "queue"))[0]!.text).toContain("会话归档 exit 7");
    const first = readdirSync(join(runtime, "snapshots"))[0]!;
    const original = readFileSync(join(runtime, "snapshots", first));
    expect(tick("0", "8").status).toBe(0);
    expect(readQueue(join(runtime, "queue"))).toHaveLength(2);
    expect(readQueue(join(runtime, "queue"))[1]!.text).toContain("gitleaks exit 8");
    expect(tick("0", "0").status).toBe(0);
    expect(readQueue(join(runtime, "queue"))).toHaveLength(2);
    expect(readdirSync(join(runtime, "snapshots"))).toHaveLength(3);
    expect(readFileSync(join(runtime, "snapshots", first))).toEqual(original);
    expect(readFileSync(join(root, "paper", "materials", "decision-log.md"), "utf8")).toContain("会话脱敏归档 exit 7");
  });
});
