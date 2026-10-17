"""Fixed fields from the 20261018-011241 strategy completion; no live inputs or commands."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import mock_open, patch


spec = importlib.util.spec_from_file_location("checks", Path(__file__).parents[1] / "learner_checks.py")
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
SOURCE = "9ae48941c8d1495b2d4048aa40feee9713d54784"
MERGED = "dddad5d67b673b6fb157bf1b73c5e32e45c3c676"
# The original output SHA is 80db955e17d8091dba170c45152d49d5129e6f894fd9920260783afea0a2cf5d.
REPORT = {
    "task": "strategy-proposal", "character": "silent", "source_commit": SOURCE,
    "fixes": ["四模板独立支撑映射、四条限定经验及H2 shadow读取适配"], "merged": MERGED,
    "tests": {"tsc": 0, "vitest": 0, "scope": "sandbox", "cases": 4435},
    "learning_result": {"request_id": "roy-20261017-human-pace-support-mapping", "revision": 2,
                        "input_sha256": "929bac6527586d12e5693ffd09e04ef55e467bf2fb78427739003eb60347f5ea"},
}
LEAVES = ["agent/src/construction/support.ts", "agent/src/sim/human-pace-card-shadow.ts",
          "agent/tests/construction-support.test.ts", "agent/tests/human-pace-card-shadow.test.ts",
          "knowledge/characters/silent/construction-support.json", "knowledge/characters/silent/experience.json"]


class ReportFixesShape(unittest.TestCase):
    def exercise(self, report=None, *, absent=None, changed=None, character="silent", code=0, repeat=False):
        report = copy.deepcopy(REPORT if report is None else report)
        original_report = copy.deepcopy(report)
        batch = {"task": "strategy-proposal", "character": character, "state": "failed", "rc": 0,
                 "merged": None, "checks": {"rc": 1, "merged": "a" * 40}}
        original_batch = copy.deepcopy(batch)
        events, inbox, calls = [], [], []
        locked = False

        def lock(*args):
            nonlocal locked
            locked = True

        def run(argv, **kwargs):
            self.assertTrue(locked, "Git identities and checks must stay under the live lock")
            calls.append(argv)
            if "merge-base" in argv:
                missing = argv[-2] == absent or (absent == "publication" and argv[-1] == MERGED)
                return subprocess.CompletedProcess(argv, 1 if missing else 0)
            if "diff-tree" in argv:
                return subprocess.CompletedProcess(argv, 0, "\0".join(LEAVES) + "\0")
            if "diff" in argv:
                refs = argv[5:argv.index("--")]
                boundary = "publication" if refs == [SOURCE, MERGED] else "current" if len(refs) == 2 else "dirty"
                self.assertEqual(argv[argv.index("--") + 1:], LEAVES)
                return subprocess.CompletedProcess(argv, 1 if boundary == changed else 0)
            if "rev-parse" in argv:
                return subprocess.CompletedProcess(argv, 0, "b" * 40 + "\n" + "c" * 40 + "\n")
            self.assertEqual(argv, ["bash", "-c", checks.FULL_CHECK_COMMAND])
            return subprocess.CompletedProcess(argv, code)

        # Exercise the real report reader and recheck entry without altering the raw completion.
        raw = json.dumps(report, ensure_ascii=False) + "\n== learner summary ==\n"
        with patch("builtins.open", mock_open(read_data=raw)), patch.object(checks.fcntl, "flock", side_effect=lock), \
                patch.object(checks.subprocess, "run", side_effect=run):
            self.assertEqual(checks.read_report("/reports/original.out"), report)
            result = checks.recheck_write_batch("20261018-011241-strategy-proposal", batch, "/fixture", "/reports",
                                                lambda kind, text: events.append([kind, text]), inbox.append)
            if repeat:
                self.assertEqual(checks.recheck_write_batch("20261018-011241-strategy-proposal", batch, "/fixture",
                                                           "/reports", lambda k, t: events.append([k, t]), inbox.append), result)
        self.assertEqual(report, original_report)
        self.assertEqual({key: batch[key] for key in original_batch}, original_batch)
        return result, batch, calls, events, inbox

    def test_rechecks_descriptive_fixes_with_explicit_source_and_preserves_original_failure(self):
        result, batch, calls, events, inbox = self.exercise(code=1, repeat=True)
        self.assertEqual(result, 1)
        self.assertEqual(len(batch["fallback_checks"]), 1)
        self.assertEqual(batch["fallback_checks"][0]["commits"], [SOURCE, MERGED])
        self.assertEqual(batch["fallback_checks"][0]["rc"], 1)
        self.assertEqual(sum(argv[0] == "bash" for argv in calls), 1)
        self.assertEqual([event[0] for event in events], ["learner-checks"])
        self.assertEqual(len(inbox), 1)
        self.assertEqual(self.exercise()[0], 0)

    def test_rejects_missing_sources_role_mismatch_and_ambiguous_fix_shapes(self):
        bad_reports = []
        for key in ["source_commit", "merged", "character"]:
            bad = copy.deepcopy(REPORT)
            del bad[key]
            bad_reports.append(bad)
        for fields in [{"source_commit": SOURCE[:7]}, {"source_commit": None}, {"merged": "HEAD"},
                       {"fixes": ["description", {"commit": SOURCE}]}, {"fixes": [""]},
                       {"task": "fix-batch"}, {"fixes": "description"}]:
            bad_reports.append({**REPORT, **fields})
        for report in bad_reports:
            with self.subTest(report=report):
                result, batch, calls, events, inbox = self.exercise(report)
                self.assertEqual(result, 2)
                self.assertNotIn("fallback_checks", batch)
                self.assertFalse(calls or events or inbox)
        result, batch, calls, events, inbox = self.exercise(character="ironclad")
        self.assertEqual(result, 2)
        self.assertFalse(calls or events or inbox)

    def test_requires_all_source_ancestors_and_unchanged_published_and_current_leaves(self):
        for absent, changed in [(SOURCE, None), (MERGED, None), ("publication", None),
                                (None, "publication"), (None, "current"), (None, "dirty")]:
            with self.subTest(absent=absent, changed=changed):
                result, batch, calls, events, inbox = self.exercise(absent=absent, changed=changed)
                self.assertEqual(result, 2)
                self.assertNotIn("fallback_checks", batch)
                self.assertFalse(events or inbox or any(argv[0] == "bash" for argv in calls))
        # Structured completions still require every source, including an explicit source_commit.
        structured = {**REPORT, "fixes": [{"commit": "d" * 40}]}
        for absent in [SOURCE, "d" * 40]:
            self.assertEqual(self.exercise(structured, absent=absent)[0], 2)
        result, batch, calls, events, inbox = self.exercise(structured)
        self.assertEqual(result, 0)
        self.assertEqual(batch["fallback_checks"][0]["commits"], ["d" * 40, SOURCE, MERGED])


if __name__ == "__main__":
    unittest.main()
