"""Explicit question fixtures only; no public network, real model, game or production state."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ops.tests import test_public_web as fixtures
BID, ROOT, jobs, learner_jobs, source, sources = fixtures.BID, fixtures.ROOT, fixtures.jobs, fixtures.learner_jobs, fixtures.source, fixtures.sources


class QuestionInput(fixtures.Completion):
    def bind_question(self):
        body = {"schema": "public-web-question-v1", "id": "fixture-question", "task": "strategy-proposal", "character": "silent",
                "question": "固定公开问题，仅格式验证", "source_intent": "search-and-open-public-sts2", "target_game_version": "fixture-v1",
                "parent": "fixture-cache-parent"}
        path = self.root / "learner/requests/public-web/fixed.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = json.dumps(body, ensure_ascii=False, indent=2).encode()
        path.write_bytes(raw)
        binding = jobs.load_question(self.root, path, hashlib.sha256(raw).hexdigest())
        self.batch["public_web"] = jobs.contract(self.tree, binding)
        self.batch["key"] = jobs.question_key(binding)
        self.report["public_web_question"] = {"id": body["id"], "input_sha256": binding["sha256"], "status": "waiting",
                                             "version_match": "unknown", "conclusion": "固定夹具尚未检索，不冒网络失败或知识结论"}
        return path, binding

    def test_input_hash_scope_and_schema_are_explicit_and_old_contract_bytes_are_unchanged(self):
        old = jobs.contract(self.tree)
        self.assertEqual(set(old), {"schema", "template_sha256"})
        path, binding = self.bind_question()
        self.assertEqual(jobs.load_question(self.root, path, binding["sha256"]), binding)
        with self.assertRaises(ValueError): jobs.load_question(self.root, path, "a" * 64)
        with self.assertRaises(OSError): jobs.load_question(self.root, path.with_name("missing.json"), binding["sha256"])
        with self.assertRaises(ValueError): jobs.load_question(self.root, self.root / "learner/code_proposals.py", binding["sha256"])
        alias = path.with_name("alias.json"); alias.symlink_to(path)
        with self.assertRaises(ValueError): jobs.load_question(self.root, alias, binding["sha256"])
        for key, value in (("task", "fix-batch"), ("character", "ironclad"), ("source_intent", "cached-only"), ("question", "")):
            bad = json.loads(binding["content"]); bad[key] = value
            raw = json.dumps(bad); candidate = {**binding, "content": raw, "sha256": hashlib.sha256(raw.encode()).hexdigest()}
            with self.assertRaises(ValueError): jobs.question_binding(candidate)
        self.assertEqual(jobs.contract(self.tree), old)

    def test_prepare_uses_registered_snapshot_when_file_changes_and_rejects_missing_or_bad_original(self):
        path, binding = self.bind_question()
        self.batch.update(state="running", pid=os.getpid())
        directory = self.root / "ops/codex-ops"; directory.mkdir(parents=True)
        def save(): (directory / "learn.json").write_text(json.dumps({"batches": {BID: self.batch}}))
        save(); path.write_text('{"later":"changed input"}')
        self.assertEqual(jobs.prepare(self.root, directory, BID, "silent", self.tree), str(self.tree / jobs.TEMPLATE))
        self.assertEqual(self.batch["public_web"]["question"], binding)
        for value in (None, {**binding, "sha256": "b" * 64}):
            self.batch["public_web"]["question"] = value; save()
            with self.assertRaises(ValueError): jobs.prepare(self.root, directory, BID, "silent", self.tree)
        del self.batch["public_web"]["question"]; save()
        with self.assertRaises(ValueError): jobs.prepare(self.root, directory, BID, "silent", self.tree)

    def test_dispatch_registers_one_frozen_question_and_rejects_other_tasks_or_duplicate_completion(self):
        _, binding = self.bind_question()
        state = {"batches": {}}
        args = (state, str(self.root), str(ROOT / "ops"), "strategy-proposal", "silent", [], jobs.question_key(binding), "ops", lambda pid: True, "20261026-100000")
        with patch.object(learner_jobs.publication_gate, "learners_held", return_value=False), patch.object(learner_jobs.publication_gate, "candidates_only", return_value=False), \
             patch.object(learner_jobs.external_learning_policy, "four_lane_mode", return_value=False), patch("ordinary_close.baseline", return_value={}), \
             patch("knowledge_runtime_env.capture", return_value=self.batch["knowledge_runtime"]), patch("learning_runtime.capture", return_value={"enabled": False}), \
             patch.object(learner_jobs, "start_learner", return_value=(12345, None)) as start:
            self.assertIsNone(learner_jobs.dispatch_write(*args, public_web_question=binding))
            bad = list(args); bad[3] = "fix-batch"
            self.assertIsNone(learner_jobs.dispatch_write(*bad, public_web=True, public_web_question=binding))
            result = learner_jobs.dispatch_write(*args, public_web=True, public_web_question=binding)
            self.assertIsNotNone(result)
            registered = state["batches"][result[0]]
            self.assertEqual(registered["public_web"]["question"], binding)
            self.assertIsNone(learner_jobs.dispatch_write(*args, public_web=True, public_web_question=binding))
            registered["state"] = "done"
            self.assertIsNone(learner_jobs.dispatch_write(*args, public_web=True, public_web_question=binding))
            start.assert_called_once()

    def test_cli_rejects_unpaired_input_or_wrong_task_before_original_dispatch(self):
        for extra in (["--public-web-question", "learner/requests/public-web/fixed.json"], ["--public-web-question-sha256", "a" * 64],
                      ["--public-web-question", "learner/requests/public-web/fixed.json", "--public-web-question-sha256", "a" * 64]):
            result = subprocess.run(["python3", str(ROOT / "ops/codex-ops-learn.py"), "write", "--task", "fix-batch", *extra],
                                    env={**os.environ, "CODEX_OPS_ROOT": str(self.root), "CODEX_OPS_DIR": str(self.root / "ops/fixture-state")}, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2, result.stderr)
        self.assertFalse((self.root / "ops/fixture-state").exists())

    def test_write_command_passes_exact_frozen_input_to_original_dispatch_and_bad_sha_starts_nothing(self):
        path, binding = self.bind_question()
        spec = importlib.util.spec_from_file_location("question_ops_cli_fixture", ROOT / "ops/codex-ops-learn.py")
        cli = importlib.util.module_from_spec(spec); spec.loader.exec_module(cli)
        args = SimpleNamespace(public_web=True, task="strategy-proposal", character="silent", runs="", request="",
                               public_web_question=str(path), public_web_question_sha256=binding["sha256"])
        with patch.object(cli, "ROOT", str(self.root)), patch.object(cli, "load_state", return_value={"batches": {}}), \
             patch.object(cli, "save_state"), patch.object(cli, "dispatch_write", return_value=(BID, 12345)) as dispatch:
            self.assertEqual(cli.cmd_write(args), 0)
            self.assertEqual(dispatch.call_args.kwargs["public_web_question"], binding)
            self.assertEqual(dispatch.call_args.args[6], jobs.question_key(binding))
            dispatch.reset_mock(); args.public_web_question_sha256 = "a" * 64
            self.assertEqual(cli.cmd_write(args), 2); dispatch.assert_not_called()

    def test_cached_content_cannot_claim_answered_and_waiting_or_mismatched_answer_stays_explicit(self):
        _, binding = self.bind_question()
        sources.record(str(self.scratch), BID, source(status="cached", native_call_id=None))
        self.report["public_web_question"]["status"] = "answered"
        self.finish(); self.assertEqual(self.batch["state"], "awaiting_review")
        self.report["public_web_question"].update(status="waiting", input_sha256="b" * 64)
        self.finish(); self.assertEqual(self.batch["state"], "awaiting_review")
        self.report["public_web_question"]["input_sha256"] = binding["sha256"]
        self.finish(); self.assertEqual(self.batch["state"], "done", self.inbox)
        proof = self.batch["public_web_proof"]["question"]
        self.assertEqual(proof["status"], "waiting"); self.assertEqual(proof["native_search_ids"], [])
        self.assertEqual(proof["native_read_ids"], []); self.assertNotIn("knowledge_publication", self.batch)

    def test_question_callback_with_search_and_read_keeps_input_and_version_unknown_through_k1(self):
        _, binding = self.bind_question()
        self.report["public_web_question"].update(status="answered", conclusion="仅格式验证，版本对应性unknown")
        self.question_readback = True
        super().test_original_callback_publishes_once_and_real_local_tool_reads_source_without_network()
        proof = self.batch["public_web_proof"]["question"]
        self.assertEqual(proof["input_sha256"], binding["sha256"])
        self.assertEqual(proof["native_search_ids"], ["fixture-search"])
        self.assertEqual(proof["native_read_ids"], ["fixture-call"])
        self.assertEqual(proof["version_match"], "unknown")


if __name__ == "__main__":
    unittest.main()
