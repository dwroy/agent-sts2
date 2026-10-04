"""The learning ledger (learner/ledger.py; paper/materials/learning/README.md) and the per-ascension learning curve
(eval/learning-curve.py). Run by agent/tests/learning-ledger.test.ts; fixed data in a temp dir only."""
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])
LEDGER_PY = os.path.join(ROOT, "learner", "ledger.py")
CURVE_PY = os.path.join(ROOT, "eval", "learning-curve.py")


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


RUNS = [
    {"run_id": "SILENT000001", "character": "SILENT", "ascension": 0, "victory": False, "floor": 10, "ended": "2026-10-05T01:00:00Z"},
    {"run_id": "SILENT000002", "character": "SILENT", "ascension": 0, "victory": True, "floor": 48, "ended": "2026-10-05T03:00:00Z"},
    {"run_id": "SILENT000003", "character": "SILENT", "ascension": 1, "victory": True, "floor": 48, "ended": "2026-10-05T05:00:00Z"},
    {"run_id": "SILENT000004", "character": "SILENT", "ascension": 2, "victory": False, "floor": 20, "ended": "2026-10-05T07:00:00Z"},
    {"run_id": "IRON00000001", "ascension": 9, "victory": False, "floor": 30, "ended": "2026-10-04T01:00:00Z"},
]
CONFIG = [
    {"ts": "2026-10-05T00:00:00Z", "run_id": "SILENT000001", "ascension": 0},
    {"ts": "2026-10-05T02:00:00Z", "run_id": "SILENT000002", "ascension": 0},
    {"ts": "2026-10-05T02:30:00Z", "run_id": "SILENT000002", "ascension": 0},  # a restart: the first row is the start
    {"ts": "2026-10-05T04:00:00Z", "run_id": "SILENT000003", "ascension": 1},
    {"ts": "2026-10-05T06:00:00Z", "run_id": "SILENT000004", "ascension": 2},
]
# SILENT000003 won after an SL reload (a predicted death on floor 16); SILENT000002 won on its first try.
SL = [{"run_id": "SILENT000003", "floor": 16, "attempt": 1, "result": "predicted_death", "reload_ok": True},
      {"run_id": "SILENT000003", "floor": 16, "attempt": 2, "result": "won"}]
ITEM = {"character": "silent", "kind": "fight", "claim": "测试结论", "evidence": [{"run": "SILENT000001", "floor": 3, "turn": 2}],
        "first_run": "SILENT000001", "prior": "no", "status": "observed", "by": "learner:postmortem", "where": {"lessons": ["SILENT000001"]}}


class LedgerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.tmp.name
        self.ledger = os.path.join(d, "learning", "ledger.jsonl")
        self.runs = os.path.join(d, "runs.jsonl")
        self.versions = os.path.join(d, "versions.json")
        write_jsonl(self.runs, RUNS)
        with open(self.versions, "w") as handle:
            json.dump({"versions": [{"name": "S1.climb"}, {"name": "S1.x"}]}, handle)
        self.env = {**os.environ, "LEDGER_FILE": self.ledger, "LEDGER_RUNS": self.runs, "LEDGER_VERSIONS": self.versions}

    def tearDown(self):
        self.tmp.cleanup()

    def cli(self, *args, stdin=None):
        return subprocess.run([sys.executable, LEDGER_PY, *args], input=stdin, env=self.env, capture_output=True, text=True)

    def lines(self):
        with open(self.ledger, encoding="utf8") as handle:
            return [json.loads(line) for line in handle]

    def test_add_fills_id_ts_asc_and_validates(self):
        out = self.cli("add", stdin=json.dumps(ITEM, ensure_ascii=False))
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(out.stdout.strip(), "silent-0001")
        row = self.lines()[0]
        self.assertEqual((row["op"], row["id"], row["asc"]), ("add", "silent-0001", 0))
        self.assertTrue(row["ts"])
        # Two at once (one per line): numbered on.
        two = json.dumps(ITEM, ensure_ascii=False) + "\n" + json.dumps({**ITEM, "first_run": "SILENT000003", "evidence": [{"run": "SILENT000003"}]}, ensure_ascii=False)
        self.assertEqual(self.cli("add", stdin=two).stdout.split(), ["silent-0002", "silent-0003"])
        self.assertEqual(self.lines()[2]["asc"], 1)  # from first_run's ascension

    def test_bad_rows_write_nothing(self):
        bad = [
            {**ITEM, "kind": "strategy"},
            {**ITEM, "prior": "maybe"},
            {**ITEM, "evidence": []},
            {**ITEM, "evidence": [{"run": "IRON00000001"}]},  # another character's run
            {**ITEM, "evidence": [{"run": "NOTARUN00001"}]},  # not in runs.jsonl
            {**ITEM, "status": "shipped"},  # shipped without a version
            {**ITEM, "id": "silent-0009"},  # ids are the ledger's
            {**ITEM, "surprise": 1},
            {k: v for k, v in ITEM.items() if k != "claim"},
        ]
        for row in bad:
            out = self.cli("add", stdin=json.dumps(row, ensure_ascii=False))
            self.assertEqual(out.returncode, 2, row)
            self.assertIn("nothing written", out.stderr)
        self.assertFalse(os.path.exists(self.ledger) and os.path.getsize(self.ledger))
        # One bad row in a batch: nothing at all.
        batch = json.dumps(ITEM, ensure_ascii=False) + "\n" + json.dumps({**ITEM, "kind": "x"})
        self.assertEqual(self.cli("add", stdin=batch).returncode, 2)
        self.assertFalse(os.path.exists(self.ledger) and os.path.getsize(self.ledger))

    def test_updates_fold_and_check(self):
        self.cli("add", stdin=json.dumps(ITEM, ensure_ascii=False))
        upd = lambda row: self.cli("update", stdin=json.dumps({"id": "silent-0001", "by": "dev", **row}, ensure_ascii=False))  # noqa: E731
        self.assertEqual(upd({"status": "proposed", "where": {"experience": ["E1"], "lessons": ["SILENT000001"]}}).returncode, 0)
        self.assertEqual(upd({"status": "shipped"}).returncode, 2)  # no version yet
        self.assertEqual(upd({"status": "shipped", "version": "S9.none"}).returncode, 2)  # not in versions.json
        self.assertEqual(upd({"status": "rejected"}).returncode, 2)  # rejected needs a note
        self.assertEqual(upd({"status": "shipped", "version": "S1.x", "where": {"commits": ["abc1234"]}}).returncode, 0)
        # Freeze the fixture's shipping time; post-release classification must not depend on today's date.
        rows = self.lines()
        rows[-1]["ts"] = "2026-10-05T04:30:00Z"
        write_jsonl(self.ledger, rows)
        self.assertEqual(upd({"evidence": [{"run": "SILENT000004", "role": "repeat", "floor": 5}]}).returncode, 0)
        self.assertEqual(self.cli("update", stdin=json.dumps({"id": "silent-0099", "by": "dev", "note": "x"})).returncode, 2)
        shown = json.loads(self.cli("show", "silent-0001").stdout)
        self.assertEqual(shown["status"], "shipped")
        self.assertEqual(shown["version"], "S1.x")
        self.assertEqual(shown["where"], {"lessons": ["SILENT000001"], "experience": ["E1"], "commits": ["abc1234"]})
        self.assertEqual([e["run"] for e in shown["evidence"]], ["SILENT000001", "SILENT000004"])
        self.assertEqual([h.get("status") for h in shown["history"]], ["observed", "proposed", "shipped", None])
        found = self.cli("find", "--run", "SILENT000004").stdout
        self.assertIn("silent-0001 [shipped S1.x] A0 fight prior=no runs=2 repeats=1 (after shipping 1)", found)
        self.assertIn("(0 item(s))", self.cli("find", "--kind", "mechanic").stdout)
        check = self.cli("check")
        self.assertEqual(check.returncode, 0, check.stdout)
        # A hand-edited bad line is caught by check.
        with open(self.ledger, "a", encoding="utf8") as handle:
            handle.write("not json\n")
            handle.write(json.dumps({"op": "update", "id": "silent-0001", "ts": "2026-10-05T00:00:00+08:00", "by": "x", "status": "done"}) + "\n")
        check = self.cli("check")
        self.assertEqual(check.returncode, 1)
        self.assertIn("not a JSON object", check.stdout)
        self.assertIn("status: one of", check.stdout)


class LearningCurveTest(unittest.TestCase):
    def test_rows_per_ascension(self):
        with tempfile.TemporaryDirectory() as d:
            logs = os.path.join(d, "logs")
            os.makedirs(logs)
            write_jsonl(os.path.join(logs, "runs.jsonl"), RUNS)
            write_jsonl(os.path.join(logs, "run-config.jsonl"), CONFIG)
            write_jsonl(os.path.join(logs, "sl-attempts.jsonl"), SL)
            ledger = os.path.join(d, "ledger.jsonl")
            item = {"op": "add", "ts": "2026-10-05T08:30:00+08:00", "where": {}, **ITEM}  # found at A0 (first_run)
            write_jsonl(ledger, [
                {**item, "id": "silent-0001", "asc": 0, "prior": "yes"},
                {**item, "id": "silent-0002", "asc": 0},
                # shipped 12:30 local = 04:30Z: the first run starting after it is SILENT000004 (A2)
                {"op": "update", "id": "silent-0002", "ts": "2026-10-05T12:30:00+08:00", "by": "dev", "status": "shipped", "version": "S1.x"},
                {"op": "update", "id": "silent-0002", "ts": "2026-10-05T15:00:00+08:00", "by": "learner", "evidence": [{"run": "SILENT000004", "role": "repeat"}]},
                {**item, "id": "silent-0003", "asc": 2},
                {"op": "update", "id": "silent-0003", "ts": "2026-10-05T20:00:00+08:00", "by": "dev", "status": "shipped", "version": "S1.x"},  # after the last run
                {**item, "id": "ironclad-0001", "character": "ironclad", "asc": 9},
            ])
            out = os.path.join(d, "out")
            curve = load("learning_curve", CURVE_PY)
            with io.StringIO() as buf:
                stdout, sys.stdout = sys.stdout, buf
                try:
                    self.assertEqual(curve.main(["--character", "silent", "--logs", logs, "--ledger", ledger, "--out-dir", out]), 0)
                finally:
                    sys.stdout = stdout
            import csv
            with open(os.path.join(out, "learning-curve-silent.csv"), encoding="utf8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual([r["ascension"] for r in rows], ["0", "1", "2", ""])
            a0, a1, a2, pending = rows
            self.assertEqual((a0["runs"], a0["wins"], a0["first_try_wins"], a0["sl_wins"], a0["mean_floor"]), ("2", "1", "1", "0", "29"))
            self.assertEqual((a0["items_found"], a0["items_found_prior_yes"], a0["started"]), ("2", "1", "2026-10-05T00:00:00+00:00"))
            self.assertEqual((a1["wins"], a1["first_try_wins"], a1["sl_wins"], a1["mean_first_try_floor"]), ("1", "0", "1", "16"))
            self.assertEqual((a2["items_shipped"], a2["items_shipped_ids"], a2["repeats"], a2["repeats_after_ship"], a2["items_found"]), ("1", "silent-0002", "1", "1", "1"))
            self.assertEqual((pending["runs"], pending["items_shipped_ids"]), ("0", "silent-0003"))


if __name__ == "__main__":
    unittest.main(verbosity=1)
