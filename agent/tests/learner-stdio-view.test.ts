import { spawn } from "node:child_process";
import { once } from "node:events";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

// Exercise the real shell wrapper with fixed output and finish/TUI stubs, without a model or Herdr server.
it.each(["learner-20260101-000001", "learner-20260101-000001-postmortem"])(
  "streams both log files before the registered command exits: %s", async (label) => {
    await exercise(label, false, true);
  }, 10_000,
);

it.each([
  { label: "ops", tui: false },
  { label: "learner-20260101-000001-postmortem", tui: true },
])("leaves other hosts and native TUI displays alone: %j", async ({ label, tui }) => {
  await exercise(label, tui, false);
}, 10_000);

async function exercise(label: string, tui: boolean, live: boolean) {
  const root = mkdtempSync(join(tmpdir(), "learner-stdio-view-"));
  const ops = join(root, "ops");
  const directory = join(ops, "state");
  mkdirSync(directory, { recursive: true });
  for (const name of ["paths.sh", "codex-ops-learner.sh"]) {
    copyFileSync(resolve("../ops", name), join(ops, name));
  }
  writeFileSync(join(ops, "codex-ops-learn.py"), "# Fixed completion receipt; no scheduler or model.\n");
  writeFileSync(join(ops, "learner_tui.py"), "# Fixed verified code and finish receipt; no native session.\nimport sys\nif sys.argv[1] == 'verified-code': print(7)\n");
  writeFileSync(join(ops, "learner_tabs.py"), "# Fixed successful seal; no pane or registry commands.\n");
  const batch = "20260101-000001";
  const child = spawn("nice", ["-n", "19", "bash", join(ops, "codex-ops-learner.sh"), batch, "FIXTURE00001", "silent"], {
    env: {
      ...process.env,
      CODEX_OPS_ROOT: root, CODEX_OPS_DIR: directory, CODEX_OPS_NO_DRAIN: "1",
      HERDR_HOST_LABEL: label, LEARNER_HERDR_PANE: tui ? "fixture:p1" : "",
      LEARNER_TUI_RECEIPT: join(directory, "fixture.tui.json"),
      LEARNER_CMD: "printf 'live-out\\n'; printf 'live-err\\n' >&2; read -r fixture_release; exit 7",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const closed = once(child, "close");
  let output = "";
  let errors = "";
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  try {
    if (live) {
      await new Promise<void>((done, fail) => {
        const timeout = setTimeout(() => fail(new Error(`no live output: ${output} ${errors}`)), 5000);
        child.stdout.on("data", (chunk) => {
          output += chunk.toString();
          if (output.includes("live-out\n") && output.includes("live-err\n")) {
            clearTimeout(timeout);
            done();
          }
        });
      });
      expect(child.exitCode).toBeNull();
    } else {
      child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    }
    child.stdin.end("release\n");
    const [code] = await closed;
    expect(code, errors).toBe(7);
    expect(readFileSync(join(directory, "learner", `${batch}.out`), "utf8")).toBe("live-out\n");
    expect(readFileSync(join(directory, "learner", `${batch}.err`), "utf8")).toBe("live-err\n");
    if (!live) expect(output).toBe("");
  } finally {
    if (child.exitCode === null) {
      child.stdin.end("release\n");
      await closed;
    }
    rmSync(root, { recursive: true, force: true });
  }
}
