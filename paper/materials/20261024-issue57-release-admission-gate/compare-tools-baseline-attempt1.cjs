// Read-only compiler comparison: restore changed TypeScript inputs virtually, not on disk.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../..");
const ts = require(path.join(root, "agent/node_modules/typescript/lib/typescript.js"));
const base = "8a6e5016d83d5dc29ec630eda6881f14e889cf8e";
const changed = execFileSync("git", ["-C", root, "diff", "--name-only", "--diff-filter=M", base, "--", "*.ts"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const baseline = new Map(changed.map((file) => [path.join(root, file), execFileSync("git", ["-C", root, "show", `${base}:${file}`], { encoding: "utf8" })]));
const configPath = path.join(root, "agent/tsconfig.tools.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), undefined, configPath);
function diagnostics(old) {
  const host = ts.createCompilerHost(parsed.options);
  const original = host.readFile.bind(host);
  host.readFile = (file) => old && baseline.has(path.resolve(file)) ? baseline.get(path.resolve(file)) : original(file);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true }, host);
  return ts.getPreEmitDiagnostics(program).map((row) => ({
    file: row.file ? path.relative(root, row.file.fileName) : null,
    line: row.file && row.start !== undefined ? row.file.getLineAndCharacterOfPosition(row.start).line + 1 : null,
    code: row.code, message: ts.flattenDiagnosticMessageText(row.messageText, "\n"),
  }));
}
const old = diagnostics(true), current = diagnostics(false);
const result = { base, virtual_baseline_files: changed, baseline_count: old.length, current_count: current.length,
  identical: JSON.stringify(old) === JSON.stringify(current), baseline: old, current };
fs.writeFileSync(path.join(__dirname, "tools-tsc-comparison.json"), JSON.stringify(result, null, 2) + "\n");
process.stdout.write(JSON.stringify({ baseline_count: old.length, current_count: current.length, identical: result.identical }) + "\n");
process.exitCode = result.identical ? 0 : 1;
