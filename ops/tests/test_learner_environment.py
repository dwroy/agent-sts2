"""Shared strict midnight cases, independently checked by the production Python verifier."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("learner_tui_environment", ROOT / "ops/learner_tui.py")
tui = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tui)
FIXTURE = json.loads((ROOT / "agent/tests/fixtures/learner-midnight.json").read_text())


def changed(changes):
    rows = copy.deepcopy(FIXTURE["rows"])
    for change in changes:
        if "move" in change:
            source, target = change["move"]
            rows.insert(target, rows.pop(source))
        elif "insert" in change:
            rows.insert(change["insert"], copy.deepcopy(change["value"]))
        elif "whole" in change:
            rows[change["row"]] = copy.deepcopy(change["whole"])
        elif "replace" in change:
            for part in rows[change["row"]]["payload"]["content"]:
                part["text"] = part["text"].replace(*change["replace"])
        else:
            target = rows[change["row"]]
            for key in change["path"][:-1]:
                target = target[key]
            target[change["path"][-1]] = copy.deepcopy(change["value"])
    return rows


class EnvironmentProof(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "native.jsonl"
        self.receipt = copy.deepcopy(FIXTURE["receipt"])
        self.receipt["result"]["rollout"] = str(self.path)

    def write(self, rows):
        self.path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))

    def test_original_bound_midnight_proof(self):
        self.write(FIXTURE["rows"])
        self.assertEqual(tui.reconstruct_native(self.receipt), [FIXTURE["proof"]])
        tui.verify_native(self.receipt)

    def test_shared_negative_matrix(self):
        for case in FIXTURE["cases"]:
            with self.subTest(case=case["name"]):
                self.write(changed(case["changes"]))
                with self.assertRaises(ValueError):
                    tui.verify_native(self.receipt)

    def test_observed_proof_cannot_be_silently_added_to_old_receipt(self):
        self.write(FIXTURE["rows"])
        for change in ({"native_environment_version": 2}, {"native_environment_updates": []},
                       {"native_environment_updates": [{**FIXTURE["proof"], "sha256": "0" * 64}]}):
            receipt = dict(self.receipt, **change)
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, "environment proof"):
                tui.verify_native(receipt)

    def test_audit_reconstructs_without_modifying_old_failure(self):
        self.write(FIXTURE["rows"])
        self.receipt["result"]["code"] = 75
        self.receipt.pop("native_environment_updates")
        self.receipt.pop("native_environment_version")
        before = copy.deepcopy(self.receipt)
        self.assertEqual(tui.reconstruct_native(self.receipt), [FIXTURE["proof"]])
        self.assertEqual(self.receipt, before)
        with self.assertRaisesRegex(ValueError, "environment proof"):
            tui.verify_native(self.receipt)

    def test_metadata_message_id_cannot_be_replayed(self):
        rows = copy.deepcopy(FIXTURE["rows"])
        rows.insert(7, copy.deepcopy(rows[6]))
        self.write(rows)
        with self.assertRaises(ValueError):
            tui.verify_native(self.receipt)

    def test_explicit_continuation_retains_the_first_turn_metadata_proof(self):
        rows = copy.deepcopy(FIXTURE["rows"])
        prompt = "[learner-batch:retry]\nContinue the same task"
        proof = dict(marker="[learner-batch:retry]", prompt_sha256=tui.prompt_hash(prompt))
        self.receipt["submissions"].append(proof)
        self.receipt["bindings"].append(dict(proof, turn_id="two"))
        self.receipt["result"].update(turn="two", message="continued report")
        rows.extend([dict(type="event_msg", payload=dict(type="task_started", turn_id="two")),
                     dict(type="turn_context", payload=dict(rows[3]["payload"], turn_id="two")),
                     dict(type="response_item", payload=dict(type="message", role="user", content=[dict(type="input_text", text=prompt)])),
                     dict(type="event_msg", payload=dict(type="task_complete", turn_id="two", last_agent_message="continued report"))])
        self.write(rows)
        self.assertEqual(tui.reconstruct_native(self.receipt), [FIXTURE["proof"]])
        tui.verify_native(self.receipt)


if __name__ == "__main__":
    unittest.main()
