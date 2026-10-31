"""Fixed crash and queue-move boundaries; no production scheduler or state."""
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).parents[1]))
import knowledge_completion_events as events


class EventTests(unittest.TestCase):
    def test_crash_after_link_and_move_race_do_not_requeue(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            sync = events.sync_dir
            def crash(path):
                sync(path)
                if path == root / "queue":
                    raise OSError("crash after durable queue link")
            with patch.object(events, "sync_dir", side_effect=crash):
                with self.assertRaises(OSError):
                    events.enqueue_once(root, "knowledge-done", "fixture", "complete:fixed")
            queued = list((root / "queue").glob("*.md"))
            self.assertEqual(len(queued), 1)
            # Simulate the atomic consumer move between the two exists() probes.
            (root / "delivered").mkdir()
            original = Path.exists
            def exists(path):
                if path == root / "delivered" / queued[0].name:
                    os.rename(queued[0], path)
                    return False
                return original(path)
            with patch.object(Path, "exists", exists):
                events.enqueue_once(root, "knowledge-done", "fixture", "complete:fixed")
            self.assertEqual(list((root / "queue").glob("*.md")), [])
            self.assertEqual(len(list((root / "delivered").glob("*.md"))), 1)
            with self.assertRaises(ValueError):
                events.enqueue_once(root, "knowledge-done", "different", "complete:fixed")

    def test_partial_body_before_rename_is_rebuilt_on_retry(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            link = os.link
            with patch.object(events.os, "link", side_effect=OSError("crash before link")):
                with self.assertRaises(OSError):
                    events.enqueue_once(root, "knowledge-done", "fixture", "complete:fixed")
            body = next((root / "knowledge-completion-events").glob("*.md"))
            body.unlink()
            (body.parent / (body.stem + ".body-prepare")).write_text("partial")
            with patch.object(events.os, "link", wraps=link):
                name = events.enqueue_once(root, "knowledge-done", "fixture", "complete:fixed")
            self.assertEqual((root / "queue" / name).read_text(), "fixture\n")


if __name__ == "__main__":
    unittest.main()
