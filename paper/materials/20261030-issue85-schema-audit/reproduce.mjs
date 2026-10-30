/** Reproduce the reader mismatch and forward publication only in a new .artifacts directory. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const [rootSource, liveSource, backup, candidateFile, output] = process.argv.slice(2);
if (!output) throw Error("expected ROOT-source LIVE-source preserved-backup candidate unused-artifacts-output");
const ownRoot = fileURLToPath(new URL("../../../", import.meta.url));
const destination = resolve(output);
if (!destination.startsWith(resolve(ownRoot, ".artifacts") + "/")) throw Error("output must be in this checkout's .artifacts");
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const backupHash = hash(backup), candidateHash = hash(candidateFile);
const { KnowledgeStore } = await import(pathToFileURL(resolve(rootSource, "agent/src/knowledge/runtime/store.ts")));
const { KnowledgeReader: NewReader } = await import(pathToFileURL(resolve(rootSource, "agent/src/knowledge/runtime/reader.ts")));
const { KnowledgeReader: OldReader } = await import(pathToFileURL(resolve(liveSource, "agent/src/knowledge/runtime/reader.ts")));
const store = KnowledgeStore.restore(backup, destination);
try {
 const oldVersion = store.current(), bindingRows = () => store.db.prepare("SELECT * FROM run_bindings ORDER BY run_id").all();
 const bindingsBefore = JSON.stringify(bindingRows());
 let oldReaderError = null;
 try { const old = new OldReader(destination, oldVersion); old.close(); }
 catch (error) { oldReaderError = error.message; }
 if (oldReaderError !== "typed knowledge schema requires owner migration") throw Error("old reader mismatch not reproduced");
 const compatible = new NewReader(destination, oldVersion); compatible.close();
 const candidate = JSON.parse(readFileSync(candidateFile, "utf8"));
 store.submit(candidate); store.validate(candidate.id); const published = store.publish(candidate.id);
 const key = "launch:20261030-133250-f6ccd3fcc+dirty";
 const oldBinding = store.bind(key, "audit-only-new-code-no-game");
 if (oldBinding.version !== oldVersion || oldBinding.code !== "f6ccd3fcc79c2527acfa1ed7da183e311ec84764") throw Error("saved run rebound");
 if (JSON.stringify(bindingRows()) !== bindingsBefore) throw Error("original bindings changed");
 const reader = new NewReader(destination, published);
 let entries, nullConfidence;
 try { const rows = reader.all({ type: "strategy", character: "silent" }); entries = rows.length; nullConfidence = rows.filter(r => r.value.confidence === null).length; }
 finally { reader.close(); }
 if (entries !== 173 || nullConfidence !== 68) throw Error("candidate typed readback mismatch");
 if (hash(backup) !== backupHash || hash(candidateFile) !== candidateHash) throw Error("frozen input changed");
 writeFileSync(resolve(destination, "proof.json"), JSON.stringify({ schema: "issue85-isolated-forward-proof-v1",
  isolated_directory: destination, source_backup: backup, source_backup_sha256: backupHash, candidate_sha256: candidateHash,
  source_inputs_unchanged: true, old_reader_error: oldReaderError, new_reader_compatible: true, before: oldVersion, published,
  original_bindings_retained: bindingRows().length, saved_run_binding: oldBinding, typed_strategies: entries, null_confidence: nullConfidence,
  production_write: false, played_or_started_game: false }, null, 2) + "\n", { flag: "wx" });
 console.log(JSON.stringify({ old_reader_error: oldReaderError, bindings_retained: bindingRows().length, typed_strategies: entries, null_confidence: nullConfidence, production_write: false }));
} finally { store.close(); }
