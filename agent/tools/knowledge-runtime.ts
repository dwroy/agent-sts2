/** CLI shared by runtime completion callbacks and ops. No production paths are implicit. */
import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { KnowledgeStore, importFiles, auditApprovedChanges, type Candidate } from "../src/knowledge/runtime/store.js";

export async function main(argv = process.argv.slice(2)): Promise<void> {
 const [command, ...rest] = argv;
 const flags: Record<string, string> = {};
 let child: string[] = [];
 for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--") { child = rest.slice(i + 1); break; }
  if (!rest[i]?.startsWith("--") || !rest[i + 1] || rest[i + 1]!.startsWith("--")) throw new Error("expected --name value");
  flags[rest[i]!.slice(2)] = rest[++i]!;
 }
 const required = (key: string) => { if (!flags[key]) throw new Error(`--${key} required`); return flags[key]!; };
 if (command === "restore") {
  const store = KnowledgeStore.restore(required("backup"), required("runtime"));
  try { console.log(JSON.stringify({ current: store.current(), restored: true })); } finally { store.close(); } return;
 }
 const readonly = ["current", "query", "status", "backup", "verify", "export"].includes(command ?? "");
 if (command === "complete") {
  const database = join(required("runtime"), "knowledge.sqlite");
  if (!existsSync(database) || !lstatSync(database).isFile() || lstatSync(database).isSymbolicLink()) throw new Error("original runtime database is unavailable; do not initialize or rebind completion");
 }
 const store = new KnowledgeStore(required("runtime"), { readOnly: readonly });
 let result: unknown;
 try {
  switch (command) {
   case "init": result = { schema: 1, current: store.current() }; break;
   case "current": result = { version: store.current() }; break;
   case "export": {
    const all = store.files(required("version"));
    const selected = flags["character"] ? Object.fromEntries(Object.entries(all).filter(([path]) =>
      path.startsWith(`characters/${flags["character"]}/`) || path.startsWith("common/") || path.startsWith("external/"))) : all;
    writeFileSync(required("destination"), JSON.stringify(selected), { mode: 0o600, flag: "wx" });
    result = { version: flags["version"], exported: true }; break;
   }
   case "import": {
    const candidate: Candidate = { schema: "knowledge-candidate-v1", id: required("id"), base: null, character: "migration", source: required("source"), files: importFiles(required("knowledge")) };
    store.submit(candidate); store.validate(candidate.id); result = { version: store.publish(candidate.id) }; break;
   }
   case "submit": result = store.submit(JSON.parse(readFileSync(required("candidate"), "utf8")) as Candidate); break;
   case "validate": result = store.validate(required("id")); break;
   case "publish": result = { version: store.publish(required("id")) }; break;
   case "complete": {
    const candidate = JSON.parse(readFileSync(required("candidate"), "utf8")) as Candidate;
    if (candidate.character === "migration") throw new Error("completion callbacks cannot import migrations");
    if (flags["id"] && candidate.id !== flags["id"]) throw new Error("candidate/batch identity mismatch");
    if (flags["approval"]) auditApprovedChanges(store.files(candidate.base), candidate.files,
      JSON.parse(readFileSync(flags["approval"], "utf8")) as Array<{ id: string; path: string }>);
    store.submit(candidate); store.validate(candidate.id);
    result = { schema: "knowledge-completion-v1", candidate: candidate.id, version: store.publish(candidate.id), code: required("code") }; break;
   }
   case "status": result = store.status(required("id")); break;
   case "rollback": result = { version: store.rollback(required("version"), required("request")) }; break;
   case "query": result = store.query({ version: required("version"), character: required("character"),
    ...(flags["kind"] ? { kind: flags["kind"] } : {}), ...(flags["text"] ? { text: flags["text"] } : {}),
    ...(flags["entity"] ? { entity: flags["entity"] } : {}), ...(flags["category"] ? { category: flags["category"] } : {}),
    ...(flags["source"] ? { source: flags["source"] } : {}), ...(flags["game-version"] ? { gameVersion: flags["game-version"] } : {}),
    ...(flags["evidence-status"] ? { evidenceStatus: flags["evidence-status"] } : {}),
    ...(flags["ascension"] ? { ascension: Number(flags["ascension"]) } : {}),
    ...(flags["limit"] ? { limit: Number(flags["limit"]) } : {}), ...(flags["offset"] ? { offset: Number(flags["offset"]) } : {}) }); break;
   case "verify": {
    const files = store.files(required("version"));
    if (flags["knowledge"]) {
     const original = importFiles(flags["knowledge"]);
     if (JSON.stringify(Object.keys(files).sort()) !== JSON.stringify(Object.keys(original).sort())
       || Object.entries(original).some(([path, text]) => files[path] !== text)) throw new Error("migration readback differs from frozen source");
    }
    result = { version: flags["version"], documents: Object.keys(files).length, bytes: Object.values(files).reduce((n, s) => n + Buffer.byteLength(s), 0), exact_readback: true }; break;
   }
   case "bind": case "launch": {
    result = store.bind(required("run"), required("code"));
    if (command === "launch") {
     if (!child.length) throw new Error("launch requires -- <program> [args]");
     const binding = result as { version: string; snapshot: string };
     // Close the publisher handle before the child starts. Gameplay gets files only.
     store.close();
     const proc = spawn(child[0]!, child.slice(1), { stdio: "inherit", env: { ...process.env,
      STS2_KNOWLEDGE_SNAPSHOT: binding.snapshot, STS2_KNOWLEDGE_VERSION: binding.version, STS2_KNOWLEDGE_RUN_KEY: required("run") } });
     const code = await new Promise<number>((ok, reject) => { proc.once("error", reject); proc.once("exit", (code, signal) => ok(code ?? (signal ? 128 : 1))); });
     process.exitCode = code; return;
    }
    break;
   }
   case "backup": await store.backup(required("destination")); result = { backup: resolve(flags["destination"]!) }; break;
   default: throw new Error("commands: init/import/submit/validate/publish/complete/status/current/query/verify/bind/launch/rollback/backup/restore");
  }
  const text = JSON.stringify(result);
  if (flags["receipt"]) writeFileSync(flags["receipt"], text + "\n", { mode: 0o600 });
  console.log(text);
 } finally { if (store.db.isOpen) store.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
 main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
