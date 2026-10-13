"""Fixed generated-table fixtures; no production data or history is changed."""
import errno
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
import paper_dataset as dataset

# The original entry point had no snapshot helper; negative controls still exercise its copy path.
snapshots = sys.modules.get("paper_snapshots", dataset)


class Snapshots(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.data = Path(self.temp.name) / "data"
        self.data.mkdir()
        self.source = self.data / "runs.csv"
        self.source.write_bytes(b"run,result\nFIXTURE,loss\n")
        self.guard = patch.object(snapshots, "require_capacity", create=True)
        self.capacity = self.guard.start()
        self.addCleanup(self.guard.stop)
        self.config = patch.object(dataset, "DATA", str(self.data))
        self.config.start()
        self.addCleanup(self.config.stop)

    def snapshot(self):
        return Path(dataset.preserve_previous())

    def test_shares_unchanged_archived_bytes_without_linking_mutable_tables(self):
        original = self.source.read_bytes()
        first, second = self.snapshot(), self.snapshot()
        self.assertNotEqual(first, second)
        one, two = first / self.source.name, second / self.source.name
        self.assertEqual(one.stat().st_ino, two.stat().st_ino)
        self.assertNotEqual(one.stat().st_ino, self.source.stat().st_ino)
        self.source.write_bytes(b"run,result\nFIXTURE,win!\n")
        self.assertEqual(one.read_bytes(), original)
        self.assertEqual(two.read_bytes(), original)
        third = self.snapshot()
        self.assertNotEqual((third / self.source.name).stat().st_ino, two.stat().st_ino)
        meta = json.loads((third / ".snapshot.json").read_text())[self.source.name]
        self.assertEqual(meta["sha256"], hashlib.sha256(self.source.read_bytes()).hexdigest())
        self.assertEqual(meta["mtime_ns"], self.source.stat().st_mtime_ns)
        self.assertEqual(list((self.data / "history").glob(".snapshot-*")), [])

    def test_capacity_refusal_keeps_original_and_published_history(self):
        first = self.snapshot()
        original = self.source.read_bytes()
        self.capacity.side_effect = OSError(errno.ENOSPC, "fixed low capacity")
        with self.assertRaises(OSError):
            self.snapshot()
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual((first / self.source.name).read_bytes(), original)
        self.assertEqual([p for p in (self.data / "history").iterdir() if p.is_dir()], [first])

    def test_copy_failure_removes_only_this_unpublished_reconstructible_stage(self):
        first = self.snapshot()
        self.source.write_bytes(b"changed fixture\n")
        with patch.object(snapshots.shutil, "copy2", side_effect=OSError(errno.ENOSPC, "fixed copy failure")):
            with self.assertRaises(OSError):
                self.snapshot()
        self.assertEqual(self.source.read_bytes(), b"changed fixture\n")
        self.assertEqual((first / self.source.name).read_bytes(), b"run,result\nFIXTURE,loss\n")
        self.assertEqual([p for p in (self.data / "history").iterdir() if p.is_dir()], [first])

    def test_unsupported_links_recheck_capacity_and_copy_without_changing_history(self):
        first = self.snapshot()
        before = self.capacity.call_count
        with patch.object(snapshots.os, "link", side_effect=OSError(errno.EXDEV, "fixed unsupported link")):
            second = self.snapshot()
        one, two = first / self.source.name, second / self.source.name
        self.assertEqual(one.read_bytes(), two.read_bytes())
        self.assertNotEqual(one.stat().st_ino, two.stat().st_ino)
        self.assertEqual(self.capacity.call_count - before, 3)


if __name__ == "__main__":
    unittest.main()
