"""Fixed precise Git leaves and scanner stubs; no production records or credentials."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
import record_manifest as records


class PreciseScans(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.directory = self.root / "state"
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        (self.root / "a.md").write_bytes(b"fixed original A\n")
        (self.root / "b.md").write_bytes(b"fixed original B\n")
        self.git("add", "a.md", "b.md")
        self.git("commit", "-qm", "Fixed leaves")
        self.head = self.git("rev-parse", "HEAD")
        self.scans = []
        self.identity = patch.object(records, "scanner_identity", return_value=("a" * 64, True))
        self.identity.start()
        self.addCleanup(self.identity.stop)

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def scan(self, raw):
        self.scans.append(raw)
        return 0

    def run_scan(self, values):
        return records.scan_snapshots(self.root, self.directory, values, self.head, self.scan)

    def test_only_explicit_leaves_manifest_no_full_copy_and_exact_hashes(self):
        (self.root / "unrelated-big-copy").write_bytes(b"unrelated" * 1000)
        base, values = records.capture(self.root, ["b.md", "a.md"])
        result = self.run_scan(values)
        manifest = json.loads(Path(result["manifest"]).read_text())
        self.assertEqual(manifest["base_commit"], base)
        self.assertEqual([f["path"] for f in manifest["files"]], ["a.md", "b.md"])
        self.assertEqual(result["full_copy_bytes"], 0)
        self.assertEqual(len(self.scans), 2)
        for p in self.directory.rglob("*"):
            if p.is_file():
                self.assertNotIn(b"fixed original A", p.read_bytes())
        self.assertEqual((self.root / "unrelated-big-copy").stat().st_size, 9000)

    def test_unchanged_bytes_reuse_clean_receipt_changed_leaf_scans(self):
        self.run_scan({"a.md": b"first", "b.md": b"second"})
        result = self.run_scan({"a.md": b"first", "b.md": b"changed"})
        self.assertEqual(self.scans, [b"first", b"second", b"changed"])
        self.assertEqual(result["reused_clean_leaves"], 1)
        self.assertEqual(result["scanned_leaves"], 1)

    def test_new_scanner_identity_cannot_borrow_previous_green(self):
        self.run_scan({"a.md": b"same"})
        with patch.object(records, "scanner_identity", return_value=("b" * 64, True)):
            self.run_scan({"a.md": b"same"})
        self.assertEqual(self.scans, [b"same", b"same"])

    def test_failed_scan_keeps_original_manifest_without_clean_receipt(self):
        with self.assertRaisesRegex(ValueError, "precise leaf scan failed"):
            records.scan_snapshots(self.root, self.directory, {"a.md": b"fixed rejected input"}, self.head, lambda raw: 1)
        manifest = json.loads(next((self.directory / "record-scans/runs").glob("*/manifest.json")).read_text())
        self.assertEqual(manifest["state"], "failed")
        self.assertFalse(list((self.directory / "record-scans/clean").glob("*/*.json")))
        self.assertEqual((self.root / "a.md").read_bytes(), b"fixed original A\n")
        self.assertEqual(self.git("rev-parse", "HEAD"), self.head)

    def test_git_snapshot_remains_pinned_while_working_file_advances(self):
        (self.root / "a.md").write_bytes(b"new parallel bytes")
        base, values = records.capture(self.root, ["a.md"], self.head)
        self.assertEqual(base, self.head)
        self.assertEqual(values["a.md"], b"fixed original A\n")
        self.run_scan(values)
        self.assertEqual((self.root / "a.md").read_bytes(), b"new parallel bytes")

    def test_directories_links_and_credential_names_are_never_read(self):
        for name in (".", "../elsewhere", ".git/HEAD", "auth.json", ".env", "/absolute"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                records.capture(self.root, [name])
        (self.root / "link.md").symlink_to(self.root / "a.md")
        with self.assertRaises(ValueError):
            records.capture(self.root, ["link.md"])


if __name__ == "__main__":
    unittest.main()
