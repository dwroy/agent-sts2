import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function readReport(text: string, readError = false) {
  // Retain the stream so garbage collection cannot hide a missing close.
  const script = `
import importlib.util, io, json, sys
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("checks", "../ops/learner_checks.py")
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
text, read_error = json.loads(sys.argv[1])
class ReportStream(io.StringIO):
    def read(self, *args):
        if read_error:
            raise OSError("fixed report read failure")
        return super().read(*args)
stream = ReportStream(text)
with patch("builtins.open", return_value=stream) as opened:
    report = checks.read_report("/fixture/completion.out")
    opened.assert_called_once_with("/fixture/completion.out", encoding="utf8")
print(json.dumps({"report": report, "closed": stream.closed}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, JSON.stringify([text, readError])], {
    encoding: "utf8", timeout: 5000,
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("completion report file ownership", () => {
  it.each([
    '{"task":"fix-batch","fixes":[]}',
    '```json\n{"task":"fix-batch","fixes":[]}\n```',
  ])("closes the report after a successful read: %s", (text) => {
    expect(readReport(text)).toEqual({ report: { task: "fix-batch", fixes: [] }, closed: true });
  });

  it("closes the report when its content has no valid completion", () => {
    expect(readReport("{incomplete")).toEqual({ report: {}, closed: true });
  });

  it("closes the report when reading fails and preserves the empty result", () => {
    expect(readReport("unused", true)).toEqual({ report: {}, closed: true });
  });
});
