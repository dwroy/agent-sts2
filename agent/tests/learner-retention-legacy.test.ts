import { spawn } from "node:child_process";
import { expect, it } from "vitest";

it("binds legacy root experience artifacts to the original launch, thread and checked publication", async () => {
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_legacy_learner_retention.py",
      "LegacyRetention.test_legacy_root_scratch_archives_and_restores_without_retiring_shared_tree",
      "LegacyRetention.test_legacy_rejects_foreign_launch_thread_and_report_sources",
      "LegacyRetention.test_legacy_requires_checks_ingestion_and_inactive_original_owner",
      "LegacyRetention.test_legacy_rejects_symlinked_launch_and_detects_changed_proof_before_deletion",
      "LegacyRetention.test_legacy_rechecks_tree_activity_after_archival"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 30_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
  });
  expect(result.code, result.output).toBe(0);
  expect(result.output).toContain("Ran 5 tests");
}, 35_000);
