"""Offline fixtures: source preservation, original admission, real completion/SQLite/local tool."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
import public_web_jobs as jobs
import learner_jobs
from learner_checks import finish_write_batch

spec = importlib.util.spec_from_file_location("public_web_sources", ROOT / "learner/public_web_sources.py")
sources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sources)
BID = "20261025-220000-strategy-proposal"


def source(**changes):
    return {"url": "https://example.org/sts2/a10", "acquired_at": "2026-10-25T22:00:00+08:00", "game_version": "fixture",
            "character": "silent", "ascension": 10, "sample": {"runs": None, "players": None}, "license": "fixture-only",
            "limitations": "fixed test; no real game conclusions", "summary": "Fixed synthetic source summary", "status": "read", "native_call_id": "fixture-call", **changes}


class Sources(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="public-web-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_duplicate_url_is_read_once_and_conflicts_versions_and_failure_evidence_are_preserved(self):
        one = sources.record(str(self.root), BID, source())
        again = sources.record(str(self.root), BID, source(acquired_at="2026-10-26T01:00:00Z", native_call_id="retry"))
        self.assertEqual(one, again)
        for changed in (source(summary="contradicting fixed summary"), source(game_version="other"), source(license="unknown"),
                        source(status="failed", summary="network failure", native_call_id=None), source(status="empty", url=None, summary="empty search", native_call_id=None)):
            self.assertNotEqual(one, sources.record(str(self.root), BID, changed))
        proof = sources.verify(str(self.root), BID)
        self.assertEqual(proof["sources"], 6)
        self.assertEqual(proof["usable"], 4)
        self.assertEqual(len(list(self.root.glob("public-web-sources-*.json"))), 6)

    def test_missing_samples_are_not_zero_and_unknown_permissions_or_private_sources_are_rejected(self):
        for url in ("http://example.org", "https://127.0.0.1/x", "https://10.0.0.1/x", "https://localhost/x", "https://host.local/x", "https://name:pass@example.org/x", "https://example.org/?token=fixture"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                sources.record(str(self.root), BID, source(url=url))
        for change in ({"status": "read", "native_call_id": None}, {"sample": {"runs": -1, "players": None}}, {"ascension": True}):
            with self.assertRaises(ValueError):
                sources.record(str(self.root), BID, source(**change))
        sources.record(str(self.root), BID, source())
        path = self.root / "public-web-sources.json"
        body = json.loads(path.read_bytes())
        self.assertIsNone(body["sources"][0]["sample"]["runs"])
        body["sources"][0]["summary"] = "tampered"
        path.write_text(json.dumps(body))
        with self.assertRaises(ValueError):
            sources.verify(str(self.root), BID)

    def test_admission_rejects_code_tick_other_roles_and_disabled_runtime_without_starting_a_model(self):
        common = ({"batches": {}}, str(self.root), str(ROOT / "ops"), "strategy-proposal", "silent", [], "public-web:issue69", "ops", lambda pid: False, "20261025-220000")
        with patch.object(learner_jobs.publication_gate, "learners_held", return_value=False), patch.object(learner_jobs.publication_gate, "candidates_only", return_value=False), patch.object(learner_jobs, "start_learner") as start:
            for index, value in ((3, "fix-batch"), (4, "ironclad"), (5, ["SILENT000001"]), (7, "tick")):
                args = list(common); args[index] = value
                self.assertIsNone(learner_jobs.dispatch_write(*args, public_web=True))
            with patch.object(jobs, "contract", return_value={}), patch.object(learner_jobs, "available", return_value=True), patch("knowledge_runtime_env.capture", return_value={"enabled": False}), patch("ordinary_close.baseline", return_value={}):
                self.assertIsNone(learner_jobs.dispatch_write(*common, public_web=True))
            start.assert_not_called()


class Completion(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="public-web-callback-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tree = self.root / ".worktrees/fixed"
        self.tree.mkdir(parents=True)
        for directory in (self.root, self.tree):
            subprocess.run(["git", "init", "-q", str(directory)], check=True)
            (directory / ".gitignore").write_text("agent\nlearner\ndata\n.worktrees\n")
            subprocess.run(["git", "-C", str(directory), "add", ".gitignore"], check=True)
            subprocess.run(["git", "-C", str(directory), "commit", "-qm", "Fixed public research fixture"], check=True)
        self.head = subprocess.check_output(["git", "-C", str(self.tree), "rev-parse", "HEAD"], text=True).strip()
        for name in ("learner/code_proposals.py", "learner/public_web_sources.py", jobs.TEMPLATE, "agent/tools/knowledge-runtime.ts", "agent/package.json"):
            dst = self.root / name; dst.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(ROOT / name, dst)
        dst = self.tree / jobs.TEMPLATE; dst.parent.mkdir(parents=True); shutil.copyfile(ROOT / jobs.TEMPLATE, dst)
        (self.root / "agent/src").symlink_to(ROOT / "agent/src", target_is_directory=True)
        (self.root / "agent/node_modules").symlink_to(ROOT / "agent/node_modules", target_is_directory=True)
        self.scratch = self.tree / "learner/runs/fixed"; self.scratch.mkdir(parents=True)
        self.path = self.scratch / "knowledge-candidate.json"
        self.report_path = self.scratch / "report.md"; self.report_path.write_text("Fixed report; no production conclusions.")
        self.runtime = self.root / "data/runtime"
        self.node = str(Path.home() / ".local/node/bin/node")
        self.events, self.inbox = [], []
        self.batch = {"task": "strategy-proposal", "reason": "ops", "runs": [], "character": "silent", "worktree": str(self.tree), "public_web": jobs.contract(self.tree),
            "knowledge_runtime": {"schema": "knowledge-runtime-selection-v1", "root": str(self.root), "enabled": True,
             "directory": str(self.runtime), "control_sha256": "a" * 64, "source": "explicit"}}
        self.report = {"task": "strategy-proposal", "character": "silent", "batch": BID, "runs": [], "base": self.head,
            "fixes": [], "commit": None, "merged": None, "implementation_domains": [], "code_proposals": [], "limitations": ["fixed fixture"],
            "report": str(self.report_path), "public_web_sources": str(self.scratch / "public-web-sources.json")}

    def cli(self, *args):
        result = subprocess.run([self.node, "--import", "tsx", str(self.root / "agent/tools/knowledge-runtime.ts"), *args],
                                cwd=self.root / "agent", capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def finish(self):
        run = subprocess.run
        def checked(*args, **kwargs):
            try:
                return run(*args, **kwargs)
            except subprocess.CalledProcessError as error:
                raise AssertionError("isolated CLI fixture failed: " + str(error.stderr)) from error
        with patch.dict(os.environ, {"STS2_NODE_BIN": self.node}), patch("knowledge_runtime.subprocess.run", side_effect=checked):
            out = self.root / "ops/codex-ops/learner"; out.mkdir(parents=True, exist_ok=True)
            (out / (BID + ".out")).write_text("```json\n" + json.dumps(self.report) + "\n```\n")
            self.report_path.write_text("Fixed fixture report\n```json\n" + json.dumps(self.report) + "\n```\n")
            finish_write_batch(BID, self.batch, 0, str(self.root), str(out), lambda *e: self.events.append(e), self.inbox.append, run_checks=False)

    def test_prepare_uses_original_lease_runtime_and_template_without_rebinding(self):
        directory = self.root / "ops/codex-ops"; directory.mkdir(parents=True)
        self.batch.update(state="running", pid=os.getpid())
        path = directory / "learn.json"; path.write_text(json.dumps({"batches": {BID: self.batch}}))
        self.assertEqual(jobs.prepare(str(self.root), str(directory), BID, "silent", str(self.tree)), str(self.tree / jobs.TEMPLATE))
        self.batch["public_web"]["template_sha256"] = "b" * 64
        path.write_text(json.dumps({"batches": {BID: self.batch}}))
        with self.assertRaises(ValueError):
            jobs.prepare(str(self.root), str(directory), BID, "silent", str(self.tree))

    def test_network_failure_and_empty_results_preserve_sources_and_publish_nothing(self):
        sources.record(str(self.scratch), BID, source(status="failed", summary="network unavailable", native_call_id=None))
        sources.record(str(self.scratch), BID, source(status="empty", summary="no matches", url=None, native_call_id=None))
        self.finish()
        self.assertEqual(self.batch["state"], "done", self.inbox)
        self.assertEqual(self.batch["public_web_proof"]["usable"], 0)
        self.assertNotIn("knowledge_publication", self.batch)
        self.assertFalse(self.runtime.exists())

    def test_read_without_native_completed_event_is_preserved_for_review(self):
        sources.record(str(self.scratch), BID, source())
        self.finish()
        self.assertEqual(self.batch["state"], "awaiting_review")
        self.assertEqual(self.events, [])
        self.assertTrue(self.report_path.exists())

    def test_search_completion_is_not_page_reading_and_event_tampering_is_rejected(self):
        sources.record(str(self.scratch), BID, source())
        event = {"type": "response_item", "payload": {"type": "web_search_call", "id": "fixture-call", "status": "completed", "action": {"type": "search", "query": "fixture"}}}
        raw = json.dumps(event, separators=(",", ":"))
        path = self.scratch / "public-web-events.jsonl"
        path.write_text(json.dumps({"schema": "public-web-event-v1", "event_json": raw, "sha256": sources.sha(raw.encode()), "event": event}) + "\n")
        self.finish(); self.assertEqual(self.batch["state"], "awaiting_review")
        event["payload"]["action"] = {"type": "open_page", "url": source()["url"]}
        path.write_text(json.dumps({"schema": "public-web-event-v1", "event_json": raw, "sha256": sources.sha(raw.encode()), "event": event}) + "\n")
        self.finish(); self.assertEqual(self.batch["state"], "awaiting_review")
        self.assertEqual(self.events, [])

    def test_original_callback_publishes_once_and_real_local_tool_reads_source_without_network(self):
        sid = sources.record(str(self.scratch), BID, source(sample={"runs": 1, "players": None}))
        row = json.loads((self.scratch / "public-web-sources.json").read_bytes())["sources"][0]
        event = {"type": "response_item", "payload": {"type": "web_search_call", "id": "fixture-call", "status": "completed", "action": {"type": "open_page", "url": row["url"]}}}
        raw = json.dumps(event, ensure_ascii=False, separators=(",", ":")).encode()
        (self.scratch / "public-web-events.jsonl").write_text(json.dumps({"schema": "public-web-event-v1", "sha256": sources.sha(raw), "event_json": raw.decode(), "event": event}) + "\n")
        self.cli("init", "--runtime", str(self.runtime))
        seed = self.root / "data/seed.json"
        seed.write_text(json.dumps({"schema": "knowledge-candidate-v1", "id": "seed", "base": None, "character": "silent", "source": "fixture",
            "files": {"characters/silent/strategy-entries.json": json.dumps({"schema": "brain-strategies-v1", "character": "silent", "entries": []})}}))
        self.cli("submit", "--runtime", str(self.runtime), "--candidate", str(seed)); self.cli("validate", "--runtime", str(self.runtime), "--id", "seed")
        old = self.cli("publish", "--runtime", str(self.runtime), "--id", "seed")["version"]
        self.cli("bind", "--runtime", str(self.runtime), "--run", "OLD", "--code", "fixture")
        library = json.loads((ROOT / "agent/tests/external-strategy-data/external-strategy.json").read_bytes())
        entry = library["entries"][0]
        entry.update(id="fixture-public-web", strategy="仅固定格式测试，不是游戏知识", source="external:public-web", confidence=0.01)
        ev = entry["evidence"][0]
        ev.update(source="external:public-web", url=row["url"], dataset_sha256=row["summary_sha256"], version="fixture", downloaded_at="2026-10-25", license=row["license"],
                  statistic={"name": "fixture", "value": 0, "unit": "fixture"}, denominator={"unit": "runs", "n": 1}, ref=sid,
                  limitations=["Synthetic fixture only; SHA hashes saved summary, not raw webpage"])
        ev.pop("interval", None)
        ev["filters"]["criteria"] = "Fixed synthetic fixture; no real player data"
        self.path.write_text(json.dumps({"schema": "knowledge-candidate-v1", "id": BID, "base": old, "character": "silent", "source": "external:public-web",
            "files": {"characters/silent/strategy-entries.json": json.dumps(library)}}))
        self.report.update(knowledge_candidate=str(self.path), public_web_results=[{"source_id": sid, "state": "cited", "reason": entry["id"]}])
        self.finish(); self.assertEqual(self.batch["state"], "done", self.inbox)
        version = self.batch["knowledge_publication"]["version"]
        self.finish(); self.assertEqual(self.batch["knowledge_publication"]["version"], version)
        self.assertEqual(len(self.events), 1)
        self.assertEqual(self.cli("bind", "--runtime", str(self.runtime), "--run", "OLD", "--code", "fixture")["version"], old)
        script = '''
import { KnowledgeStore } from './src/knowledge/runtime/store.ts';
import { strategyTool } from './src/brain/tools/strategy-tool.ts';
import { setKnowledgeCharacter } from './src/knowledge/files.ts';
const store = new KnowledgeStore(process.env.FIXTURE_RUNTIME);
const binding = store.bind('NEW', 'fixture'); store.close(); setKnowledgeCharacter('silent');
console.log((await strategyTool().run({query:'fixture-public-web'}, {label:'reward/card',ascension:10,act:1,knowledgeDir:binding.snapshot,logsDir:binding.snapshot,payload:{facts:{act:1,floor:4}}})).text);
'''
        result = subprocess.run([self.node, "--import", "tsx", "--input-type=module", "-e", script], cwd=self.root / "agent",
                                env={**os.environ, "FIXTURE_RUNTIME": str(self.runtime)}, capture_output=True, text=True, check=True)
        actual = json.loads(result.stdout)
        self.assertEqual(actual["entries"][0]["id"], entry["id"])
        self.assertEqual(actual["entries"][0]["evidence"][0]["dataset_sha256"], row["summary_sha256"])
        self.assertEqual(actual["entries"][0]["source"], "external:public-web")
        self.assertEqual(subprocess.check_output(["git", "-C", str(self.tree), "rev-parse", "HEAD"], text=True).strip(), self.head)


if __name__ == "__main__":
    unittest.main()
