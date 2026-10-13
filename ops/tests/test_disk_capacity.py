"""Fixed local metadata and launcher fixtures; no live files or models."""
import errno
import importlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))


class Capacity(unittest.TestCase):
    def test_wrapper_refuses_new_checkout_before_git_or_learner_start(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ops = root / "ops"
            ops.mkdir()
            for name in ("paths.sh", "codex-ops-learner.sh"):
                shutil.copy2(REPO / "ops" / name, ops / name)
            (ops / "disk_capacity.py").write_text("import sys\nprint('fixed insufficient disk capacity', file=sys.stderr)\nsys.exit(1)\n")
            (ops / "codex-ops-learn.py").write_text("# Fixed finish stub.\n")
            bindir = root / "home/.local/node/bin"
            bindir.mkdir(parents=True)
            fake_git = bindir / "git"
            fake_git.write_text("#!/bin/bash\nprintf '%s\\n' \"$*\" >> \"$CODEX_OPS_ROOT/git-calls\"\n"
                                "if [ \"$1 $2\" = 'worktree add' ]; then mkdir -p \"$5/agent\"; touch \"$5/.git\"; fi\n")
            fake_git.chmod(0o755)
            batch = "20260101-000001-fix-batch"
            worktree = root / ".worktrees/codex-fix-silent-20260101-000001"
            result = subprocess.run(["bash", str(ops / "codex-ops-learner.sh"), batch, "", "silent", "fix-batch", str(worktree)],
                env={"HOME": str(root / "home"), "PATH": "/usr/bin:/bin", "CODEX_OPS_ROOT": str(root),
                     "CODEX_OPS_NO_DRAIN": "1", "LEARNER_CMD": 'touch "$CODEX_OPS_ROOT/model-started"'},
                capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertFalse(worktree.exists())
            self.assertFalse((root / "git-calls").exists())
            self.assertFalse((root / "model-started").exists())
            self.assertIn("fixed insufficient disk capacity", (ops / "codex-ops/learner" / (batch + ".err")).read_text())

    def test_bytes_and_inode_reserve_reject_before_allocating(self):
        capacity = importlib.import_module("disk_capacity")
        with tempfile.TemporaryDirectory() as directory:
            for free, inodes, refused in [(capacity.RESERVE_BYTES + 9, 5000, True),
                                           (capacity.RESERVE_BYTES + 10, 0, True),
                                           (capacity.RESERVE_BYTES + 10, 1024, True),
                                           (capacity.RESERVE_BYTES + 10, 1025, False)]:
                with self.subTest(free=free, inodes=inodes), patch.object(capacity.shutil, "disk_usage", return_value=SimpleNamespace(free=free)), \
                        patch.object(capacity.os, "statvfs", return_value=SimpleNamespace(f_favail=inodes)):
                    if refused:
                        with self.assertRaises(OSError) as error:
                            capacity.require_capacity(directory, 10, 1)
                        self.assertEqual(error.exception.errno, errno.ENOSPC)
                    else:
                        capacity.require_capacity(directory, 10, 1)
                self.assertEqual(list(Path(directory).iterdir()), [])

    def test_checkout_estimate_uses_selected_ref_and_allocation_rounding(self):
        capacity = importlib.import_module("disk_capacity")
        tree = b"100644 blob abc 1\ta\0" + b"100644 blob def 4097\tb\0" + b"160000 commit ghi -\tsubmodule\0"
        with patch.object(capacity.subprocess, "run", return_value=SimpleNamespace(stdout=tree)) as run, \
                patch.object(capacity, "require_capacity") as guard:
            capacity.require_worktree_capacity("/fixture", "fixed-ref")
        self.assertEqual(run.call_args.args[0][-1], "fixed-ref")
        guard.assert_called_once_with("/fixture", 5 * capacity.BLOCK_BYTES, 4)


if __name__ == "__main__":
    unittest.main()
