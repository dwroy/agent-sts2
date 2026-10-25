"""Real compiled K1 + operational SQLite product split, over isolated fixed data only."""
import argparse
import copy
import json
import os
from pathlib import Path
import shlex
import subprocess
from unittest.mock import patch

from test_learning_runtime import LearningRuntimeTest
from learning_runtime import complete_products
from learning_runtime_store import Store
from learner_checks import finish_write_batch
from learning_runtime_data import knowledge_binding, formal_document


def probe(node, cli):
    fixture = LearningRuntimeTest()
    fixture.setUp()
    try:
        root = fixture.root
        runtime = root / "data/knowledge-runtime"
        source = root / "frozen-knowledge/characters/silent/experience.json"
        source.parent.mkdir(parents=True)
        entry = {"id": "fixture-original", "scope": "general:route", "asc": [10, 10], "lesson": "仅固定格式夹具",
                 "evidence": [fixture.run], "n_support": 1, "n_contradict": 0, "confidence": "low", "last_seen": "fixture", "status": "active"}
        source.write_text(json.dumps({"version": "fixture-original", "entries": [entry]}))
        def command(*args):
            result = subprocess.run([node, str(cli), *map(str, args)], check=True, capture_output=True, text=True)
            return json.loads(result.stdout)
        baseline = command("import", "--runtime", runtime, "--knowledge", source.parents[2], "--id", "fixture-migration", "--source", "fixture")["version"]
        # The callback uses the deployed CLI argument contract; this bridge only
        # selects the compiled copy, keeping Python + Node within two processes.
        bridge = root / "node-bridge"
        bridge.write_text("#!/bin/sh\nshift 3\nexec " + shlex.quote(str(node)) + " " + shlex.quote(str(cli)) + ' "$@"\n')
        bridge.chmod(0o700)
        code = root / "agent/src/code-fixture.ts"
        code.write_text("export const fixture = true;\n")
        fixture.git("add", "agent/src/code-fixture.ts")
        fixture.git("commit", "-qm", "Fixed source delivery fixture")
        source_commit = fixture.git("rev-parse", "HEAD")
        fixture.batch.update(task="strategy-proposal", knowledge_runtime={"schema": "knowledge-runtime-selection-v1", "root": str(root), "enabled": True,
                               "directory": str(runtime), "control_sha256": "a"*64, "source": "explicit"})
        fixture.batch["operational_runtime"]["entries"].append("strategy-proposal")
        fixture.body["task"] = "strategy-proposal"
        candidate = fixture.scratch / "knowledge-candidate.json"
        body = {"schema": "knowledge-candidate-v1", "id": fixture.ident, "base": baseline, "character": "silent", "source": "fixture:independent",
                "files": {"characters/silent/experience.json": json.dumps({"version": "fixture-next", "entries": [entry, {**entry, "id": "fixture-independent"}]})}}
        candidate.write_text(json.dumps(body))
        fixture.report.update(task="strategy-proposal", commit=source_commit, knowledge_candidate=str(candidate), knowledge_independent=True)
        fixture.write()
        with patch.dict(os.environ, {"STS2_NODE_BIN": str(bridge)}):
            handled = complete_products(fixture.ident, fixture.batch, fixture.report, 0, root, lambda *a: fixture.events.append(a), fixture.notices.append)
            assert handled is False and fixture.batch["state"] != "done", fixture.batch
            assert fixture.batch["knowledge_publication"]["version"] != baseline
            assert fixture.report["commit"] == source_commit and fixture.report["implementation_domains"] == []
            assert fixture.batch["operational_publication"]["engineering_required"] is True
            published = fixture.batch["knowledge_publication"]["version"]
            # This source was never merged: its original engineering completion
            # remains failed, even though its independent data products succeeded.
            finish_write_batch(fixture.ident, fixture.batch, 0, str(root), str(fixture.out), lambda *a: fixture.events.append(a), fixture.notices.append, run_checks=False)
            assert fixture.batch["state"] == "failed" and fixture.batch["report"]["commit"] == source_commit
            assert fixture.batch["knowledge_publication"]["version"] == published
            fixture.batch.pop("operational_publication")
            assert complete_products(fixture.ident, fixture.batch, fixture.report, 0, root, lambda *a: None, fixture.notices.append) is False
            assert command("current", "--runtime", runtime)["version"] == published
            # An unsupported consumer/operator cannot become active by placing
            # script-like JSON in an independent product.
            bad_id = fixture.ident + "-unsupported"
            bad_report = copy.deepcopy(fixture.report)
            bad = fixture.scratch / "unsupported.json"
            bad.write_text(json.dumps({**body, "id": bad_id, "base": published, "files": {"characters/silent/new-executable-rule.json": '{"script":"fixture only"}'}}))
            bad_report.update(operational_candidate=None, knowledge_candidate=str(bad))
            bad_batch = copy.deepcopy(fixture.batch)
            bad_batch.pop("knowledge_publication", None)
            assert complete_products(bad_id, bad_batch, bad_report, 0, root, lambda *a: None, fixture.notices.append) is True
            assert bad_batch["state"] == "awaiting_review"
            assert command("current", "--runtime", runtime)["version"] == published
        with patch.dict(os.environ, {"STS2_NODE_BIN": str(node), "STS2_KNOWLEDGE_RUNTIME": str(runtime)}):
            assert knowledge_binding(root)["version"] == published
            assert [e["id"] for e in formal_document(root, "characters/silent/experience.json")["entries"]] == ["fixture-original", "fixture-independent"]
        store = Store(fixture.directory, readonly=True)
        try:
            assert store.report(fixture.ident) == fixture.report_file.read_bytes()
            assert store.db.execute("SELECT count(*) FROM completions").fetchone()[0] == 1
        finally:
            store.close()
        return {"passed": True, "operational_completions": 1, "knowledge_versions": 2, "source_merged": False,
                "unknown_capability_rejected": True, "replayed_source_or_model": False}
    finally:
        fixture.doCleanups()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--node", required=True)
    p.add_argument("--cli", type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(probe(args.node, args.cli.resolve())))
