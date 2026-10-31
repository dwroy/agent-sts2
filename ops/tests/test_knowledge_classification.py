"""Real completion callback -> CLI -> isolated SQLite, without production writes or mocked publication."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
from knowledge_runtime import complete


class ClassificationCompletion(unittest.TestCase):
    def test_registered_callback_publishes_classification_once_and_preserves_binding(self):
        with tempfile.TemporaryDirectory(prefix="classification-callback-") as temp:
            root = Path(temp)
            tree = root / ".worktrees/fixed"
            tree.mkdir(parents=True)
            for directory in (root, tree):
                subprocess.run(["git", "init", "-q", str(directory)], check=True)
                (directory / ".gitignore").write_text("agent\nlearner\ndata\n.worktrees\n")
                subprocess.run(["git", "-C", str(directory), "add", ".gitignore"], check=True)
                subprocess.run(["git", "-C", str(directory), "commit", "-qm", "Fixed callback fixture"], check=True)
            head = subprocess.check_output(["git", "-C", str(tree), "rev-parse", "HEAD"], text=True).strip()
            (root / "agent/tools").mkdir(parents=True)
            shutil.copyfile(ROOT / "agent/tools/knowledge-runtime.ts", root / "agent/tools/knowledge-runtime.ts")
            shutil.copyfile(ROOT / "agent/package.json", root / "agent/package.json")
            (root / "agent/src").symlink_to(ROOT / "agent/src", target_is_directory=True)
            (root / "agent/node_modules").symlink_to(ROOT / "agent/node_modules", target_is_directory=True)
            (root / "learner").mkdir()
            shutil.copyfile(ROOT / "learner/code_proposals.py", root / "learner/code_proposals.py")
            runtime = root / "data/runtime"
            node = Path.home() / ".local/node/bin/node"
            command = [str(node), "--import", "tsx", str(ROOT / "agent/tools/knowledge-runtime.ts")]

            def cli(*args):
                result = subprocess.run(command + list(args), cwd=ROOT / "agent", capture_output=True, text=True, check=True)
                return json.loads(result.stdout)

            cli("init", "--runtime", str(runtime))
            entry = {"id": "test-entry", "scope": "general:fixture", "asc": [0, 10], "lesson": "仅格式夹具",
                     "evidence": ["SILENT000001"], "n_support": 1, "n_contradict": 0, "confidence": "low", "status": "active"}
            path = "characters/silent/experience.json"
            seed = root / "data/seed.json"
            seed.write_text(json.dumps({"schema": "knowledge-candidate-v1", "id": "seed", "base": None,
                                        "character": "silent", "source": "fixture", "files": {path: json.dumps({"version": "fixture", "entries": [entry]})}}))
            cli("submit", "--runtime", str(runtime), "--candidate", str(seed))
            cli("validate", "--runtime", str(runtime), "--id", "seed")
            old = cli("publish", "--runtime", str(runtime), "--id", "seed")["version"]
            cli("bind", "--runtime", str(runtime), "--run", "OLD", "--code", "fixture")
            meta = {"schema": "knowledge-classification-v1", "character": "silent", "entries": [{
                "id": "test-class", "target": {"path": path, "type": "experience", "id": entry["id"],
                "sha256": hashlib.sha256(json.dumps(entry, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()},
                "topics": ["startup"], "entities": [], "aliases": [], "evidence": ["SILENT000001"], "rationale": "仅格式证据"}]}
            candidate = tree / "learner/runs/fixed/knowledge-candidate.json"
            candidate.parent.mkdir(parents=True)
            candidate.write_text(json.dumps({"schema": "knowledge-candidate-v1", "id": "fixed", "base": old,
                "character": "silent", "source": "fixture", "files": {"characters/silent/classification.json": json.dumps(meta)}}))
            batch = {"worktree": str(tree), "character": "silent", "candidate_mode": {"dispatch_base": head},
                     "knowledge_runtime": {"schema": "knowledge-runtime-selection-v1", "root": str(root), "enabled": True,
                                           "directory": str(runtime), "control_sha256": hashlib.sha256(("explicit:" + str(runtime)).encode()).hexdigest(), "source": "explicit"}}
            report = {"task": "experience-update", "knowledge_candidate": str(candidate), "base": head,
                      "commit": None, "merged": None, "code_proposals": [], "implementation_domains": []}
            events, inbox = [], []
            with patch.dict(os.environ, {"STS2_NODE_BIN": str(node)}):
                for _ in range(2):
                    self.assertTrue(complete("fixed", batch, report, 0, str(root), lambda *e: events.append(e), inbox.append))
                    self.assertEqual(batch["state"], "done", inbox)
            new = batch["knowledge_publication"]["version"]
            self.assertNotEqual(old, new)
            self.assertEqual(len(events), 1)
            self.assertEqual(inbox, [])
            self.assertEqual(cli("bind", "--runtime", str(runtime), "--run", "OLD", "--code", "fixture")["version"], old)
            self.assertEqual(cli("typed-query", "--runtime", str(runtime), "--version", old, "--character", "silent", "--type", "experience", "--topic", "startup"), [])
            self.assertEqual(cli("typed-query", "--runtime", str(runtime), "--version", new, "--character", "silent", "--type", "experience", "--topic", "startup")[0]["value"], entry)
            self.assertEqual(subprocess.check_output(["git", "-C", str(tree), "rev-parse", "HEAD"], text=True).strip(), head)


if __name__ == "__main__":
    unittest.main()
