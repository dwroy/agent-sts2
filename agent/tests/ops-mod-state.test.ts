import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const ops = resolve("../ops");
const scratch = mkdtempSync(join(tmpdir(), "ops-mod-state-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const ready = { ok: true, data: { screen: "CARD_SELECTION", turn: 6 } };

// Exercise the production polling block without desktop commands, sleeps or network access.
function launch(body: string, http = 200, curlExit = 0, nextBody?: string) {
  const source = readFileSync(join(ops, "codex-ops-actions.sh"), "utf8");
  const branch = source.split("  launch-game)\n")[1]!.split("  win-procs)\n")[0]!;
  const polling = branch.slice(branch.indexOf("    for _ in $(seq 1 36); do")).replace(/;;\s*$/, "");
  return runBlock(polling, body, http, curlExit, nextBody);
}

function modState(body: string, http = 200, curlExit = 0) {
  const source = readFileSync(join(ops, "codex-ops-actions.sh"), "utf8");
  const branch = source.split("  mod-state)\n")[1]!.split("  autoplay-start)\n")[0]!;
  return runBlock(branch.replace(/;;\s*$/, ""), body, http, curlExit);
}

function runBlock(block: string, body: string, http: number, curlExit: number, nextBody?: string) {
  const response = join(scratch, "response.json");
  const next = join(scratch, "next.json");
  const calls = join(scratch, "calls.jsonl");
  writeFileSync(response, body);
  writeFileSync(next, nextBody ?? body);
  writeFileSync(calls, "");
  const result = spawnSync("bash", ["-c", `
OPS="$1"; MOD=http://unused.invalid; fixture_response="$2"; fixture_calls="$3"; fixture_http="$4"; fixture_curl_exit="$5"; fixture_next="$6"
curl() {
  printf '%s\\n' "$*" >> "$fixture_calls"
  for arg in "$@"; do
    if [[ "$arg" == -*f* || "$arg" == --fail ]]; then [ "$fixture_http" -lt 400 ] || return 22; fi
  done
  [ "$fixture_curl_exit" -eq 0 ] || return "$fixture_curl_exit"
  local output=1 write_status=0
  for arg in "$@"; do
    [ "$arg" != /dev/null ] || output=0
    [ "$arg" != -w ] || write_status=1
  done
  [ "$output" -eq 0 ] || cat "$fixture_response"
  [ "$write_status" -eq 0 ] || printf '\\n%s' "$fixture_http"
  cp "$fixture_next" "$fixture_response"
  return 0
}
seq() { printf '1\\n2\\n'; }
sleep() { :; }
tasklist() { :; }
${block}
`, "mod-test", ops, response, calls, String(http), String(curlExit), next], { cwd: scratch, encoding: "utf8", timeout: 5000 });
  return { ...result, calls: readFileSync(calls, "utf8").trim().split("\n") };
}

describe("launch-game mod readiness", () => {
  it.each([
    ["empty", ""], ["invalid JSON", "Traceback"], ["truncated JSON", '{"ok":true,"data":'],
    ["non-object", "[]"], ["unsuccessful", JSON.stringify({ ...ready, ok: false })],
    ["missing ok", JSON.stringify({ data: ready.data })], ["missing data", '{"ok":true}'],
    ["null data", '{"ok":true,"data":null}'], ["missing screen", '{"ok":true,"data":{}}'],
    ["null screen", '{"ok":true,"data":{"screen":null}}'],
    ["non-string screen", '{"ok":true,"data":{"screen":7}}'],
    ["blank screen", '{"ok":true,"data":{"screen":" "}}'],
  ])("does not report ready for %s", (_name, body) => {
    const result = launch(body);
    expect(result.status, result.stderr).toBe(1);
    expect(result.stdout).not.toContain("mod answers:");
    expect(result.stdout + result.stderr).not.toContain("Traceback");
  });

  it.each([204, 302, 404, 503])("rejects HTTP %i even with a valid-looking state body", (status) => {
    expect(launch(JSON.stringify(ready), status).status).toBe(1);
  });

  it("rejects curl transport failures even with a complete body", () => {
    expect(launch(JSON.stringify(ready), 200, 28).status).toBe(1);
  });

  it("reports the validated screen from one response without a second read", () => {
    const result = launch(JSON.stringify(ready), 200, 0, "broken second response");
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("mod answers: CARD_SELECTION\n");
    expect(result.calls).toHaveLength(1);
  });

  it("keeps polling until an unsuccessful envelope becomes a valid state", () => {
    const result = launch('{"ok":false}', 200, 0, JSON.stringify(ready));
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).toHaveLength(2);
    expect(result.stdout).toBe("mod answers: CARD_SELECTION\n");
  });
});

describe("mod-state complete response", () => {
  it.each(["COMBAT", "CARD_SELECTION", "MAP"])("preserves a small %s state envelope", (screen) => {
    const envelope = { ok: true, data: { screen, turn: 6, available_actions: [] } };
    const result = modState(JSON.stringify(envelope));
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(envelope);
  });

  it.each([
    ["ASCII", { text: "x".repeat(20_001) }],
    ["Chinese", { text: "状态".repeat(20_001) }],
    ["nested arrays", { entries: Array.from({ length: 5000 }, (_, index) => ({ index, text: "fixed state" })) }],
  ])("preserves the complete %s state beyond 20000 characters", (_name, extra) => {
    const envelope = { ...ready, data: { ...ready.data, ...extra } };
    expect(JSON.stringify(envelope).length).toBeGreaterThan(20_000);
    const result = modState(JSON.stringify(envelope));
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(envelope);
    expect(result.calls).toHaveLength(1);
  });

  it.each([
    "", "{broken", "[]", '{"ok":false}', JSON.stringify({ data: ready.data }),
    '{"ok":true}', '{"ok":true,"data":{}}',
    '{"ok":true,"data":{"screen":"COMBAT","value":NaN}}',
  ])("returns an explicit error for an invalid response %j", (body) => {
    const result = modState(body);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("invalid mod state response");
    expect(result.stderr).not.toContain("Traceback");
  });

  it.each([302, 503])("does not report success for HTTP %i", (status) => {
    expect(modState(JSON.stringify(ready), status).status).toBe(1);
  });

  it("reports a transport failure without printing a partial state", () => {
    const result = modState(JSON.stringify(ready), 200, 28);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("mod unreachable (curl exit 28)\n");
  });
});
