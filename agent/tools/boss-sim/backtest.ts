/** Select the CLI's character before any simulator import can initialize role-specific tables. */
const at = process.argv.indexOf("--character");
if (at >= 0 && process.argv[at + 1] !== undefined) process.env["CHARACTER"] = process.argv[at + 1]!;
await import("./backtest-runner.js");
export {};
