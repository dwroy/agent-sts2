"""Exercise the external action with fixed fake evaluator data; no game, log database, or network."""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[2] / "ops" / "codex-ops-actions.sh"


class EvalMetricsActionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ops-eval-metrics-")
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        (self.root / "data/logdb-venv/bin").mkdir(parents=True)
        (self.root / "data/logdb-venv/bin/python").symlink_to(sys.executable)
        (self.root / "eval").mkdir()
        (self.root / "eval/metrics.py").write_text(
            "import json,pathlib,sys\n"
            "root=pathlib.Path.cwd()\n"
            "(root/'called.json').write_text(json.dumps(sys.argv[1:]))\n"
            "if (root/'fail').exists():\n"
            "    print('partial output')\n"
            "    print('fixture error',file=sys.stderr)\n"
            "    sys.exit(7)\n"
            "if not (root/'empty').exists():print('# fixture metrics')\n"
        )

    def action(self, *args):
        return subprocess.run(["bash", str(SCRIPT), "eval-metrics", *args],
                              env={**os.environ, "CODEX_OPS_ROOT": str(self.root)},
                              capture_output=True, text=True, timeout=10)

    def test_fixed_arguments_and_separate_snapshots(self):
        first = self.action("silent", "3")
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(json.loads((self.root / "called.json").read_text()),
                         ["--character", "silent", "--ascension", "3", "--group-by", "ascension", "--md"])
        output = pathlib.Path(first.stdout.strip().removeprefix("eval-metrics saved: "))
        self.assertEqual(output.parent, self.root / "paper/materials/silent")
        self.assertEqual(output.read_text(), "# fixture metrics\n")
        second = self.action("silent", "3")
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertNotEqual(first.stdout, second.stdout)
        self.assertEqual(len(list(output.parent.glob("*.md"))), 2)
        ironclad = self.action("ironclad", "0")
        self.assertEqual(ironclad.returncode, 0, ironclad.stderr)
        self.assertIn("/paper/materials/ironclad/a0-metrics-", ironclad.stdout)

    def test_invalid_requests_never_call_evaluator(self):
        for args in [(), ("silent",), ("silent", "3", "extra"), ("all", "3"),
                     ("../silent", "3"), ("silent", "-1"), ("silent", "03"),
                     ("silent", "3e0"), ("silent", "1000"), ("silent", "3;touch"),
                     ("silent\n", "3"), ("silent", "3\n")]:
            with self.subTest(args=args):
                result = self.action(*args)
                self.assertEqual(result.returncode, 2)
                self.assertFalse((self.root / "called.json").exists())
                self.assertFalse((self.root / "paper").exists())

    def test_failed_or_empty_output_does_not_publish_or_replace_a_report(self):
        folder = self.root / "paper/materials/silent"
        folder.mkdir(parents=True)
        prior = folder / "a3-metrics.md"
        prior.write_text("previous result\n")
        (self.root / "fail").touch()
        failed = self.action("silent", "3")
        self.assertEqual(failed.returncode, 7)
        self.assertIn("fixture error", failed.stderr)
        self.assertNotIn("saved:", failed.stdout)
        self.assertEqual(list(folder.iterdir()), [prior])
        self.assertEqual(prior.read_text(), "previous result\n")
        (self.root / "fail").unlink()
        (self.root / "empty").touch()
        self.assertEqual(self.action("silent", "3").returncode, 1)
        self.assertEqual(list(folder.iterdir()), [prior])

    def test_missing_database_python_fails_before_evaluation(self):
        (self.root / "data/logdb-venv/bin/python").unlink()
        result = self.action("silent", "3")
        self.assertEqual(result.returncode, 127)
        self.assertFalse((self.root / "called.json").exists())
        self.assertFalse((self.root / "paper").exists())


if __name__ == "__main__":
    unittest.main()
