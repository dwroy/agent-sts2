"""Scanner-boundary regression for the bounded ordinary completion fixtures."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_ordinary_close import OrdinaryClose


class FixedScanner(OrdinaryClose):
    def test_fixed_scanner_failure_keeps_real_manifest_and_blocks_commit(self):
        self.scanner.return_value = 7
        self.assertTrue(self.offer())
        self.process()
        row = self.receipt()
        self.assertEqual(row["state"], "attention")
        self.assertIn("precise leaf scan failed", row["reason"])
        self.scanner.assert_called()
        manifest = json.loads(next((self.directory / "record-scans/runs").glob("*/manifest.json")).read_text())
        self.assertEqual(manifest["state"], "failed")
        self.assertEqual(manifest["files"][0]["rc"], 7)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.head)
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "")
        self.assertFalse((self.root / ".git/index.lock").exists())
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(len(self.events), 1)


if __name__ == "__main__":
    import unittest
    unittest.main()
