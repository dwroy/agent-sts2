"""Fixed shell failures: no broker, model, network or waiting clock."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]


class RequestWrite(unittest.TestCase):
    def check_failure(self, function, message):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "ops").mkdir()
            for name in ("paths.sh", "codex-ops-do.sh"):
                shutil.copy2(REPO / "ops" / name, root / "ops" / name)
            hook = root / "fixed-shell.sh"
            hook.write_text(function + '\nsleep() { touch "$CODEX_OPS_ROOT/waited"; exit 87; }\n')
            state = root / "ops/codex-ops"
            result = subprocess.run(["bash", str(root / "ops/codex-ops-do.sh"), "stall-check"],
                env={"HOME": str(root / "home"), "PATH": "/usr/bin:/bin", "BASH_ENV": str(hook),
                     "CODEX_OPS_ROOT": str(root), "CODEX_OPS_DIR": str(state)},
                text=True, capture_output=True, timeout=5)
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIn(message, result.stderr)
            self.assertFalse((root / "waited").exists())
            self.assertEqual(list((state / "broker").glob("*.req")), [])
            # A failed temporary write/publication remains available for operator diagnosis.
            self.assertEqual(len(list((state / "broker").glob("*.tmp"))), 1)

    def test_write_failure_returns_without_waiting(self):
        self.check_failure("printf() { return 1; }", "request write failed")

    def test_publication_failure_returns_without_waiting(self):
        self.check_failure("mv() { return 1; }", "request publication failed")


if __name__ == "__main__":
    unittest.main()
