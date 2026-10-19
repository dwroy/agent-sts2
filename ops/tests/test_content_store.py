"""Fixed bytes, interrupted captures and local Git paths; no live input or model."""
import importlib.util
import errno
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
import content_store as objects


class ContentStore(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.store = objects.Store(self.root / "objects")
        self.raw = b'{"run":"SILENT000001","fixed":true}\n' * 100
        self.a, self.b = self.root / "a.jsonl", self.root / "b.jsonl"
        self.a.write_bytes(self.raw)
        self.b.write_bytes(self.raw)

    def test_equal_frozen_inputs_share_one_readonly_inode_and_manifest(self):
        a = self.store.seal(self.a)
        b = self.store.seal(self.b)
        self.assertEqual(a, b)
        self.assertTrue(os.path.samefile(self.a, self.b))
        self.assertEqual(self.a.read_bytes(), self.raw)
        self.assertEqual(self.a.stat().st_mode & 0o222, 0)
        self.assertEqual(len(list((self.root / "objects/sha256").glob("*/*"))), 1)
        self.assertEqual(list((self.root / "objects/.incoming").iterdir()), [])

    def test_regeneration_replaces_only_its_view(self):
        a = self.store.seal(self.a)
        self.store.seal(self.b)
        replacement = self.root / "replacement.jsonl"
        replacement.write_bytes(b"new fixed output\n")
        new = self.store.put(replacement)
        self.store.materialize(new, self.a)
        self.assertEqual(self.b.read_bytes(), self.raw)
        self.assertEqual(self.store.verify(a["sha256"]).read_bytes(), self.raw)
        self.assertEqual(self.a.read_bytes(), b"new fixed output\n")

    def test_corrupt_or_writable_object_does_not_replace_a_consumer(self):
        reference = self.store.put(self.a)
        path = self.store.path(reference["sha256"])
        path.chmod(0o644)
        path.write_bytes(b"corrupt")
        with self.assertRaisesRegex(ValueError, "immutable object changed"):
            self.store.materialize(reference, self.b)
        self.assertEqual(self.b.read_bytes(), self.raw)

    def test_changed_source_capture_retains_original_view(self):
        original = objects.digest
        def mutate(path):
            value = original(path)
            Path(path).write_bytes(b"changed concurrently")
            return value
        with patch.object(objects, "digest", side_effect=mutate):
            with self.assertRaisesRegex(ValueError, "changed during hashing"):
                self.store.seal(self.a)
        self.assertEqual(self.b.read_bytes(), self.raw)
        self.assertFalse((self.root / "objects/sha256").exists())

    def test_external_links_credentials_and_invalid_ids_are_rejected(self):
        link = self.root / "linked.jsonl"
        link.symlink_to(self.a)
        with self.assertRaises(ValueError):
            self.store.seal(link)
        secret = self.root / "auth.json"
        secret.write_bytes(b"opaque fixed sentinel")
        with patch.object(objects, "digest", side_effect=AssertionError("must not read credential")):
            with self.assertRaises(ValueError):
                self.store.put(secret)
        with self.assertRaises(ValueError):
            self.store.verify("../outside")

    def test_partial_materialization_cleans_only_its_temporary_link(self):
        reference = self.store.put(self.a)
        with patch.object(objects.os, "replace", side_effect=OSError("fixed failure")):
            with self.assertRaises(OSError):
                self.store.materialize(reference, self.b)
        self.assertEqual(self.b.read_bytes(), self.raw)
        self.assertEqual(list(self.root.glob(".b.jsonl.object-*")), [])

    def test_project_worktrees_share_store_without_copying_mutable_state(self):
        (self.root / ".git").mkdir()
        with patch.object(objects.subprocess, "check_output", side_effect=AssertionError("invalid marker is not a repository")):
            self.assertEqual(objects.default_directory(self.root), self.root / ".objects/v1")
        (self.root / ".git").rmdir()
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.assertEqual(objects.default_directory(self.root / "learner/runs/fixed"), self.root / "ops/codex-ops/objects/v1")

    def test_extraction_keeps_all_original_bytes_offsets_and_shared_output(self):
        spec = importlib.util.spec_from_file_location("fixed_evidence", ROOT / "learner/extract_evidence.py")
        evidence = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(evidence)
        source = self.root / "states.jsonl"
        source.write_bytes(b'{"run":"FOREIGN00001"}\n' + self.raw)
        first = evidence.extract(source, self.a, ["SILENT000001"], store=self.store)
        second = evidence.extract(source, self.b, ["SILENT000001"], store=self.store)
        self.assertEqual(first, second)
        self.assertTrue(os.path.samefile(self.a, self.b))
        row = json.loads(self.a.read_text().splitlines()[0])
        self.assertEqual(row["offset"], len(b'{"run":"FOREIGN00001"}\n'))
        self.assertEqual(source.read_bytes()[row["offset"]:row["offset"] + row["bytes"]], self.raw.splitlines(keepends=True)[0])
        before = self.b.read_bytes()
        source.write_bytes(source.read_bytes() + self.raw)
        evidence.extract(source, self.a, ["SILENT000001"], store=self.store)
        self.assertEqual(self.b.read_bytes(), before)

    def test_completed_sim_cache_shares_payload_without_altering_identity(self):
        sys.path.insert(0, str(ROOT / "agent/tools/boss-sim"))
        spec = importlib.util.spec_from_file_location("fixed_refresh", ROOT / "agent/tools/boss-sim/refresh-silent.py")
        refresh = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(refresh)
        caches = [self.root / "cache1/identity", self.root / "cache2/identity"]
        for path in caches:
            path.mkdir(parents=True)
            (path / "results.jsonl").write_bytes(self.raw)
            (path / "provenance.json").write_text('{"samples":200,"seed":1,"model":"fixed"}\n')
            refresh.seal_archive(path, self.store.directory)
        self.assertTrue(os.path.samefile(caches[0] / "results.jsonl", caches[1] / "results.jsonl"))
        self.assertEqual((caches[0] / "results.jsonl").read_bytes(), self.raw)
        manifest = json.loads(caches[0].with_suffix(".content.json").read_text())
        self.assertEqual(manifest["artifact"], "identity")
        self.assertEqual(manifest["files"]["results.jsonl"]["sha256"], objects.digest(self.a))

    def test_new_frozen_model_restores_the_exact_storage_helper_dependency(self):
        sys.path.insert(0, str(ROOT / "agent/tools/boss-sim"))
        import pinned_silent
        (self.root / "ops").mkdir()
        (self.root / "agent").mkdir()
        helper = self.root / "ops/content_store.py"
        helper.write_bytes((ROOT / "ops/content_store.py").read_bytes())
        for name in ["package.json", "tsconfig.json", "package-lock.json"]:
            (self.root / "agent" / name).write_text('{}\n')
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        subprocess.run(["git", "-C", str(self.root), "add", "ops", "agent"], check=True)
        subprocess.run(["git", "-C", str(self.root), "commit", "-qm", "Fixed helper input"], check=True)
        commit = subprocess.check_output(["git", "-C", str(self.root), "rev-parse", "HEAD"], text=True).strip()
        target = self.root / "frozen-model"
        source = {"simulator_base": commit, "input_files": {"ops/content_store.py": objects.digest(helper)}}
        verified = pinned_silent.restore_model(self.root, target, source, self.root / "unused-game-data")
        self.assertEqual(verified["ops/content_store.py"], source["input_files"]["ops/content_store.py"])
        self.assertEqual(verified["agent/package-lock.json"], objects.digest(self.root / "agent/package-lock.json"))
        self.assertEqual((target / "ops/content_store.py").read_bytes(), helper.read_bytes())
        (self.root / "agent/package-lock.json").write_text('{"changed":"fixed"}\n')
        with self.assertRaisesRegex(ValueError, "pinned dependency lock differs"):
            pinned_silent.restore_model(self.root, self.root / "wrong-lock-model", source, self.root / "unused-game-data")

    def test_sandbox_mount_boundary_defers_without_copying_or_expanding_permissions(self):
        destination = self.root / "task/view.jsonl"
        destination.parent.mkdir()
        with patch.object(self.store, "materialize", side_effect=OSError(errno.EXDEV, "fixed bind mount")):
            reference = self.store.publish_view(self.a, destination)
        self.assertTrue(reference["pending_host_seal"])
        self.assertEqual(reference["deferred_errno"], errno.EXDEV)
        self.assertEqual(destination.read_bytes(), self.raw)
        self.assertEqual(destination.stat().st_mode & 0o222, 0)
        self.assertFalse(self.a.exists())

    def test_readonly_pool_declaration_is_finalized_only_by_the_original_host(self):
        scratch = self.root / "task"
        scratch.mkdir()
        view = scratch / "states.evidence.jsonl"
        with patch.object(self.store, "put", side_effect=OSError(errno.EROFS, "fixed readonly pool")):
            reference = self.store.publish_view(self.a, view)
        manifest = scratch / "evidence-manifest.json"
        declaration = [{"stream": "states", "source_size": 123, "output_sha256": reference["sha256"], "content": reference}]
        manifest.write_text(json.dumps(declaration))
        original = manifest.read_bytes()
        result = objects.finalize(scratch, self.store.directory)
        self.assertEqual(result["status"], "sealed")
        self.assertEqual(len(result["files"]), 1)
        self.assertTrue(os.path.samefile(view, self.store.path(reference["sha256"])))
        self.assertEqual(manifest.read_bytes(), original)
        self.assertEqual(view.read_bytes(), self.raw)
        self.assertEqual(result["models_started"], 0)
        self.assertFalse(result["permissions_changed"])
        self.assertEqual(len(objects.finalize(scratch, self.store.directory)["files"]), 1)

    def test_host_rejects_changed_or_escaping_declarations_without_rewriting_model_result(self):
        scratch = self.root / "task"
        scratch.mkdir()
        view = scratch / "states.evidence.jsonl"
        reference = self.store.put(self.a)
        view.write_bytes(b"changed frozen bytes")
        manifest = scratch / "evidence-manifest.json"
        manifest.write_text(json.dumps([{"stream": "states", "output_sha256": reference["sha256"], "content": reference}]))
        before = manifest.read_bytes()
        with self.assertRaisesRegex(ValueError, "declared frozen bytes changed"):
            objects.finalize(scratch, self.store.directory)
        self.assertEqual(manifest.read_bytes(), before)
        self.assertEqual(view.read_bytes(), b"changed frozen bytes")


if __name__ == "__main__":
    unittest.main()
