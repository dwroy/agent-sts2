"""Offline source-gate fixtures. The accepted branch exits before any Node/Codex invocation."""
import hashlib
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]


class ProbeBrokerGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.worktree = self.root / ".worktrees/codex-brain-cache"
        (self.worktree / "ops").mkdir(parents=True)
        self.runner = REPO / "ops/codex-brain-cache-probe.ts"
        self.copy = self.worktree / "ops/codex-brain-cache-probe.ts"
        self.copy.write_bytes(self.runner.read_bytes())
        source = (REPO / "ops/codex-ops-actions.sh").read_text()
        case = source.split("  codex-brain-cache-probe)\n", 1)[1].split("  procs)", 1)[0]
        dispatch = 'exec nice -n 19 node --import "$CACHE_WORKTREE/agent/node_modules/tsx/dist/loader.mjs" "$CACHE_RUNNER" ;;'
        # Only replace the final dispatch. Every actual shell guard remains unchanged.
        self.assertEqual(case.count(dispatch), 1)
        case = case.replace(dispatch, 'echo validated-offline; exit 0 ;;')
        self.script = self.root / "gate.sh"
        self.script.write_text('set -u\nROOT="$FIXTURE_ROOT"\ncase "$1" in\n  codex-brain-cache-probe)\n' + case + '\nesac\n')
        self.bin = self.root / "bin"
        self.bin.mkdir()
        fake_git = self.bin / "git"
        fake_git.write_text('''#!/bin/bash
if [[ "$*" == *HEAD:agent* ]]; then
  [[ "${GATE_REJECT:-}" != tree ]]; exit $?
elif [[ "$*" == *--cached* ]]; then
  [[ "${GATE_REJECT:-}" != index ]]; exit $?
else
  [[ "${GATE_REJECT:-}" != dirty ]]; exit $?
fi
''')
        fake_git.chmod(0o755)

    def run_gate(self, *args, reject=""):
        env = {"PATH": str(self.bin) + ":/usr/bin:/bin", "FIXTURE_ROOT": str(self.root), "GATE_REJECT": reject}
        return subprocess.run(["bash", str(self.script), "codex-brain-cache-probe", *args], env=env,
                              text=True, capture_output=True, timeout=10)

    def test_pins_exact_tested_runner_and_only_fixed_repair_directory(self):
        source = (REPO / "ops/codex-ops-actions.sh").read_text()
        expected = re.search(r'CACHE_RUNNER_SHA="([0-9a-f]{64})"', source).group(1)
        self.assertEqual(expected, hashlib.sha256(self.runner.read_bytes()).hexdigest())
        self.assertIn('CACHE_RUN="$CACHE_WORKTREE/learner/runs/20261008-153529-codex-brain-cache"', source)
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(result.stdout.strip(), "validated-offline")

    def test_modified_runner_never_reaches_dispatch(self):
        self.copy.write_bytes(self.copy.read_bytes() + b"\n")
        result = self.run_gate()
        self.assertEqual(result.returncode, 2)
        self.assertIn("runner differs", result.stdout)

    def test_changed_agent_tree_dirty_source_and_dirty_index_never_dispatch(self):
        for reject, message in (("tree", "tree differs"), ("dirty", "source is dirty"), ("index", "index is dirty")):
            with self.subTest(reject=reject):
                result = self.run_gate(reject=reject)
                self.assertEqual(result.returncode, 2)
                self.assertIn(message, result.stdout)

    def test_no_arguments_paths_urls_models_or_effort_are_accepted(self):
        for arg in ("/tmp/question.json", "https://example.com", "--model=other", "xhigh", "repair"):
            with self.subTest(arg=arg):
                result = self.run_gate(arg)
                self.assertEqual(result.returncode, 2)
                self.assertIn("takes no arguments", result.stdout)


if __name__ == "__main__":
    unittest.main()
