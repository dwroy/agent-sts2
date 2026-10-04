// Stands in for tools/logdb/query.py in tests/logdb.test.ts (run with node as the "python"): the SQL text picks
// what it answers with.
const args = process.argv.slice(2);
const sql = args[args.indexOf("--") + 1] ?? "";
if (sql.includes("boom")) {
  console.log(JSON.stringify({ error: "BinderException: column boom not found" }));
  process.exit(1);
} else if (sql.includes("args")) {
  console.log(JSON.stringify({ error: JSON.stringify(args) }));
  process.exit(1);
} else if (sql.includes("env")) {
  console.log(JSON.stringify({ error: Object.keys(process.env).sort().join(",") }));
  process.exit(1);
} else if (sql.includes("sleep")) {
  setTimeout(() => {}, 20000);
} else if (sql.includes("garbage")) {
  console.log("not json");
} else if (sql.includes("crash")) {
  console.error("Traceback (most recent call last): boom");
  process.exit(1);
} else {
  const rows = [
    [1, "a|b\nc", null, ["X", "Y"], { k: 1 }],
    [2, "x".repeat(500), true, [], null],
  ];
  console.log(JSON.stringify({ columns: ["n", "text", "flag", "list", "obj"], types: [], rows, row_count: 2, truncated: sql.includes("many"), ms: 7 }));
}
