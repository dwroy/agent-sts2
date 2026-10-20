"""Fixed publication/concurrency fixtures; never read production logs or credentials."""
import base64
import contextlib
import fcntl
import gzip
import io
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import paper_dataset as dataset


class Publication(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "data"
        self.raw = self.root / "raw"
        self.data.mkdir()
        self.raw.mkdir()
        self.stack = self.enterContext(contextlib.ExitStack())
        self.lock_directory = self.root / "ops"
        self.lock_path = self.lock_directory / "paper-dataset.lock"
        self.stack.enter_context(patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.lock_directory)}))
        for name, value in {"DATA": str(self.data), "RAW": str(self.raw)}.items():
            self.stack.enter_context(patch.object(dataset, name, value))

    def stub_pipeline(self, include_raw):
        args = ["paper_dataset.py"] + ([] if include_raw else ["--no-raw"])
        self.stack.enter_context(patch.object(sys, "argv", args))
        methods = {}
        for name, result in {"build": ({}, {"source_checks_passed": True}, {}),
                             "raw_snapshot": None, "write_readme": None, "learning_curve": True,
                             "component_costs": True, "scan_for_keys": []}.items():
            methods[name] = self.stack.enter_context(patch.object(dataset, name, return_value=result))
        return methods

    def test_full_and_no_raw_hold_the_same_lock_from_cut_through_scan(self):
        for include_raw in (False, True):
            with self.subTest(include_raw=include_raw):
                methods = self.stub_pipeline(include_raw)
                observed = []

                def check_locked(name, result):
                    def call(*args):
                        observed.append(name)
                        with self.lock_path.open("a") as contender:
                            with self.assertRaises(BlockingIOError):
                                fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        return result
                    return call

                for name, method in methods.items():
                    method.side_effect = check_locked(name, method.return_value)
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(dataset.main(), 0)
                self.assertEqual(observed, ["build"] + (["raw_snapshot"] if include_raw else []) +
                                 ["write_readme", "learning_curve", "component_costs", "scan_for_keys"])
                with self.lock_path.open("a") as contender:
                    fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_contending_invocation_cannot_take_its_cut_until_previous_writer_releases(self):
        methods = self.stub_pipeline(False)
        history = self.lock_directory
        history.mkdir()
        reached_lock = threading.Event()
        took_cut = threading.Event()
        methods["build"].side_effect = lambda: (took_cut.set() or methods["build"].return_value)
        original_flock = fcntl.flock
        errors = []

        def observed_flock(fd, operation):
            reached_lock.set()
            return original_flock(fd, operation)

        def invoke():
            try:
                dataset.main()
            except BaseException as error:
                errors.append(error)

        with self.lock_path.open("a") as writer:
            original_flock(writer, fcntl.LOCK_EX)
            with patch.object(fcntl, "flock", side_effect=observed_flock), contextlib.redirect_stdout(io.StringIO()):
                worker = threading.Thread(target=invoke, daemon=True)
                worker.start()
                try:
                    self.assertTrue(reached_lock.wait(2), "invocation did not acquire the output lock")
                    self.assertFalse(took_cut.is_set())
                finally:
                    original_flock(writer, fcntl.LOCK_UN)
                    worker.join(2)
                self.assertFalse(worker.is_alive())
        self.assertEqual(errors, [])
        self.assertTrue(took_cut.is_set())

    def test_exception_releases_lock_and_keeps_nonzero_source_checks(self):
        methods = self.stub_pipeline(False)
        methods["build"].side_effect = ValueError("fixed build failure")
        with self.assertRaisesRegex(ValueError, "fixed build failure"):
            dataset.main()
        with self.lock_path.open("a") as contender:
            fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
        methods["build"].side_effect = None
        methods["build"].return_value = ({}, {"source_checks_passed": False}, {})
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(dataset.main(), 1)

    def test_gzip_keeps_closed_previous_bytes_until_replacement_and_respects_cut(self):
        source = self.root / "source.jsonl"
        source.write_bytes(b"fixed snapshot\nnewer append\n")
        target = self.raw / "states.jsonl.gz"
        previous = gzip.compress(b"previous complete snapshot\n")
        target.write_bytes(previous)
        original_write = gzip.GzipFile.write
        writes = []

        def checked_write(writer, data):
            self.assertEqual(target.read_bytes(), previous)
            self.assertEqual(gzip.decompress(target.read_bytes()), b"previous complete snapshot\n")
            writes.append(len(data))
            return original_write(writer, data)

        with patch.object(gzip.GzipFile, "write", checked_write):
            dataset.gzip_copy(source, target, len(b"fixed snapshot\n"))
        self.assertTrue(writes)
        self.assertEqual(gzip.decompress(target.read_bytes()), b"fixed snapshot\n")
        self.assertEqual(list(self.raw.iterdir()), [target])

    def test_failed_gzip_does_not_destroy_previous_archive_or_leave_partial_stage(self):
        source = self.root / "source.jsonl"
        source.write_bytes(b"fixed snapshot\n")
        target = self.raw / "states.jsonl.gz"
        previous = gzip.compress(b"previous complete snapshot\n")
        target.write_bytes(previous)
        with patch.object(gzip.GzipFile, "write", side_effect=OSError("fixed disk error")):
            with self.assertRaises(OSError):
                dataset.gzip_copy(source, target)
        self.assertEqual(target.read_bytes(), previous)
        self.assertEqual(list(self.raw.iterdir()), [target])

    def test_failed_tar_does_not_destroy_previous_archive(self):
        logs = self.root / "logs"
        (logs / "console").mkdir(parents=True)
        target = self.raw / "console.tar.gz"
        with tarfile.open(target, "w:gz") as archive:
            archive.add(logs / "console", arcname="console")
        previous = target.read_bytes()
        with patch.object(dataset, "LOGS", str(logs)), patch.object(dataset, "JSONL_SOURCES", []), \
                patch.object(tarfile.TarFile, "add", side_effect=OSError("fixed tar error")):
            with self.assertRaises(OSError):
                dataset.raw_snapshot({})
        self.assertEqual(target.read_bytes(), previous)
        self.assertEqual(list(self.raw.iterdir()), [target])

    def test_unclosed_gzip_is_named_and_cannot_report_clean(self):
        # The frozen non-game fixture from the original ops investigation lacks its trailer.
        target = self.raw / "inflight-keyscan-fixture.jsonl.gz"
        methods = self.stub_pipeline(False)
        methods["scan_for_keys"].side_effect = ORIGINAL_SCAN
        fixtures = [(base64.b64decode(
            "H4sIAL3W02oC/0rLrEhNUcjMSytKLC4pKk0uKS1KVSjOSywozsgvUUjLrAAJcAEAAAD//w=="), "EOFError"),
            (bytes.fromhex("1f8b08000000000000ff") + b"\xff" * 20, "error")]
        for content, kind in fixtures:
            with self.subTest(kind=kind):
                target.write_bytes(content)
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    with self.assertRaisesRegex(RuntimeError, str(target) + ": " + kind):
                        dataset.main()
                self.assertNotIn("CLEAN", output.getvalue())
                self.assertTrue(target.is_file())

    def test_corrupt_tar_is_named_without_decoder_contents_and_valid_hits_remain(self):
        target = self.raw / "console.tar.gz"
        target.write_bytes(b"invalid fixed archive")
        with self.assertRaisesRegex(RuntimeError, str(target) + ": ReadError") as error:
            dataset.scan_for_keys()
        self.assertNotIn("invalid fixed archive", str(error.exception))
        target.unlink()
        token = "sk-" + "x" * 16
        with gzip.open(self.raw / "fixture.jsonl.gz", "wt") as handle:
            handle.write(token + "\n")
        with tarfile.open(target, "w:gz") as archive:
            data = token.encode()
            member = tarfile.TarInfo("fixed.txt")
            member.size = len(data)
            archive.addfile(member, io.BytesIO(data))
        (self.data / "summary.json").write_text(token)
        self.assertEqual(dataset.scan_for_keys(), ["summary.json", "console.tar.gz:fixed.txt", "fixture.jsonl.gz"])


ORIGINAL_SCAN = dataset.scan_for_keys

if __name__ == "__main__":
    unittest.main()
