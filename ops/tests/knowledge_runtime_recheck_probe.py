"""Cross-process fixed SQLite recovery probe; compile the CLI first, never use a production runtime."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import knowledge_runtime as completion
import knowledge_runtime_env as control
from learner_checks import finish_write_batch, recheck_write_batch


def probe(node, cli, recover=None):
    real_run = subprocess.run
    project = Path(__file__).parents[2]
    fixture = Path(tempfile.mkdtemp(prefix="knowledge-recheck-", dir=project / ".cache")) if recover is None else Path(recover).resolve()
    keep = False
    persisted = None
    if recover is not None:
        if fixture.parent != (project / ".cache").resolve() or not fixture.name.startswith("knowledge-recheck-"):
            raise ValueError("recovery accepts only this probe's isolated fixture")
        persisted = json.loads((fixture / "probe-state.json").read_text())
        if persisted.get("probe_schema") != "knowledge-recheck-probe-v1" or persisted.get("fixture") != str(fixture) or persisted.get("cli") != str(cli):
            raise ValueError("probe fixture identity mismatch")
        if persisted.get("prepare_pid") == os.getpid() or any(os.environ.get(key) for key in (control.RUNTIME, control.ROOT, control.SHA, control.SOURCE)):
            raise ValueError("recovery must run in a distinct Python process without inherited runtime selection")
    def call(*args):
        result = real_run([node, str(cli), *map(str, args)], check=True, capture_output=True, text=True)
        return json.loads(result.stdout)
    try:
        if recover is None:
            directory = fixture / "ops/codex-ops"
            out = directory / "learner"
            out.mkdir(parents=True)
            source = fixture / "learner"
            source.mkdir()
            (fixture / "agent").mkdir()
            shutil.copyfile(project / "learner/code_proposals.py", source / "code_proposals.py")
            a, b = fixture / "data/runtime-a", fixture / "data/runtime-b"
            entry = {"id": "fixture-existing", "scope": "general:route", "asc": [10, 10], "lesson": "格式夹具甲",
                     "evidence": ["FIXTURE00001"], "n_support": 1, "n_contradict": 0, "confidence": "low", "last_seen": "fixture", "status": "active"}
            versions = []
            for label, runtime in (("a", a), ("b", b)):
                knowledge = fixture / ("knowledge-" + label)
                document = knowledge / "characters/silent/experience.json"
                document.parent.mkdir(parents=True)
                document.write_text(json.dumps({"version": "fixture-" + label, "entries": [{**entry, "lesson": "格式夹具" + label}]}))
                versions.append(call("import", "--runtime", runtime, "--knowledge", knowledge, "--id", "migration-" + label, "--source", "fixture")["version"])
            configuration = directory / "knowledge-runtime.json"
            def configure(enabled, runtime):
                configuration.write_text(json.dumps({"schema": "knowledge-runtime-control-v1", "root": str(fixture), "enabled": enabled, "runtime_dir": str(runtime)}))
            configure(True, a)
            selection = control.capture(fixture, directory)
            tree = fixture / ".worktrees/fixed"
            scratch = tree / "learner/runs/fixed"
            scratch.mkdir(parents=True)
            original = call("query", "--runtime", a, "--version", versions[0], "--character", "silent")[0]
            old = json.loads(original["payload"])
            candidate = scratch / "knowledge-candidate.json"
            candidate.write_text(json.dumps({"schema": "knowledge-candidate-v1", "id": "fixed", "base": versions[0], "character": "silent", "source": "fixture:recheck",
                "files": {"characters/silent/experience.json": json.dumps({"version": "fixture-next", "entries": [old, {**old, "id": "fixture-new", "lesson": "格式夹具新增"}]})}}))
            report = {"task": "experience-update", "base": "a" * 40, "knowledge_candidate": str(candidate), "commit": None, "merged": None, "implementation_domains": [], "code_proposals": []}
            (out / "fixed.out").write_text(json.dumps(report))
            batch = {"task": "experience-update", "worktree": str(tree), "character": "silent", "knowledge_runtime": selection, "rc": 0}
            # The bridge uses compiled repository code, keeping Python + Node within two processes (no esbuild child).
            bridge = fixture / "node-bridge"
            bridge.write_text("#!/bin/sh\nshift 3\nexec " + shlex.quote(node) + " " + shlex.quote(str(cli)) + ' "$@"\n')
            bridge.chmod(0o700)
            committed = []
            calls = []
            failures = []
            lost = [True]
            def run(argv, **kwargs):
                if argv[0] == "git":
                    return subprocess.CompletedProcess(argv, 0, stdout="" if "status" in argv else "a" * 40, stderr="")
                try:
                    result = real_run(argv, **kwargs)
                except subprocess.CalledProcessError as error:
                    failures.append(error.stderr)
                    raise
                if "complete" in argv:
                    calls.append(argv[argv.index("--runtime") + 1])
                    if lost[0]:
                        committed.append(json.loads(result.stdout)["version"])
                        lost[0] = False
                        raise subprocess.TimeoutExpired(argv, 120)
                return result
            with patch.dict(os.environ, {"STS2_NODE_BIN": str(bridge)}), patch.object(completion.subprocess, "run", side_effect=run):
                completion.complete("fixed", batch, report, 0, str(fixture), lambda *a: None, lambda *a: None)
            assert batch["state"] == "awaiting_review" and batch["knowledge_pending"] and committed, (batch.get("knowledge_attempts"), failures)
            saved = json.dumps(batch)
            (fixture / "probe-state.json").write_text(json.dumps({"probe_schema": "knowledge-recheck-probe-v1", "fixture": str(fixture), "cli": str(cli), "saved": saved, "versions": versions, "committed": committed, "prepare_pid": os.getpid()}))
            keep = True
            return {"prepared_fixture": str(fixture), "lost_result_was_committed": True}
        else:
            assert persisted is not None
            directory = fixture / "ops/codex-ops"
            out = directory / "learner"
            a, b = fixture / "data/runtime-a", fixture / "data/runtime-b"
            saved, versions, committed = persisted["saved"], persisted["versions"], persisted["committed"]
            selection = json.loads(saved)["knowledge_runtime"]
            bridge = fixture / "node-bridge"
            calls, failures, lost = [], [], [False]
            def configure(enabled, runtime):
                (directory / "knowledge-runtime.json").write_text(json.dumps({"schema": "knowledge-runtime-control-v1", "root": str(fixture), "enabled": enabled, "runtime_dir": str(runtime)}))
            def run(argv, **kwargs):
                if argv[0] == "git":
                    return subprocess.CompletedProcess(argv, 0, stdout="" if "status" in argv else "a" * 40, stderr="")
                try:
                    result = real_run(argv, **kwargs)
                except subprocess.CalledProcessError as error:
                    failures.append(error.stderr)
                    raise
                if "complete" in argv:
                    calls.append(argv[argv.index("--runtime") + 1])
                    if lost[0]:
                        committed.append(json.loads(result.stdout)["version"])
                        lost[0] = False
                        raise subprocess.TimeoutExpired(argv, 120)
                return result
        cases = []
        for enabled in (True, False):
            configure(enabled, b)
            restored = json.loads(saved)
            events = []
            # Clear every inherited setting: recovery must come from the persisted original batch.
            with patch.dict(os.environ, {"STS2_NODE_BIN": str(bridge)}, clear=True), patch.object(completion.subprocess, "run", side_effect=run):
                operations = ("recheck", "finish") if enabled else ("finish", "recheck")
                for operation in operations:
                    if operation == "recheck":
                        assert recheck_write_batch("fixed", restored, str(fixture), str(out), lambda *a: events.append(a), lambda *a: None) == 0
                    else:
                        finish_write_batch("fixed", restored, 0, str(fixture), str(out), lambda *a: events.append(a), lambda *a: None)
                        assert restored["state"] == "done"
                assert control.RUNTIME not in os.environ
            assert restored["knowledge_runtime"] == selection
            assert restored["knowledge_publication"]["version"] == committed[0]
            assert restored["knowledge_publication"]["runtime_control_sha256"] == selection["control_sha256"]
            assert len(events) == 1
            assert call("current", "--runtime", b)["version"] == versions[1]
            assert call("status", "--runtime", a, "--id", "fixed")["version"] == committed[0]
            cases.append({"current_control": "B" if enabled else "disabled", "same_original_version": True,
                          "callbacks": operations, "notification_count_after_two_callbacks": len(events)})
        assert calls and all(path == str(a) for path in calls)
        expression = "import {DatabaseSync} from 'node:sqlite'; const rows=process.argv.slice(1).map(p=>{const d=new DatabaseSync(p,{readOnly:true}); const n=d.prepare('SELECT count(*) n FROM releases').get().n;d.close();return n}); console.log(JSON.stringify(rows));"
        counts = json.loads(real_run([node, "--input-type=module", "-e", expression, str(a / "knowledge.sqlite"), str(b / "knowledge.sqlite")], capture_output=True, text=True, check=True).stdout)
        assert counts == [2, 1]
        return {"compiled_cli_sha256": hashlib.sha256(cli.read_bytes()).hexdigest(), "cases": cases, "all_complete_calls_use_A": True,
                "release_counts": {"A": counts[0], "B": counts[1]}, "lost_result_was_committed": True, "production_database_opened": False,
                "git_identity": "fixed fixture; Git calls stubbed", "publisher_and_sqlite": "actual compiled CLI in separate Node processes", "fresh_python_recovery_invocation": True,
                "distinct_python_process": persisted["prepare_pid"] != os.getpid()}
    finally:
        if not keep:
            shutil.rmtree(fixture)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", required=True)
    parser.add_argument("--cli", type=Path, required=True)
    parser.add_argument("--recover", type=Path)
    args = parser.parse_args()
    print(json.dumps(probe(args.node, args.cli.resolve(), args.recover), ensure_ascii=False, indent=2))
