"""Frozen import diagnostics and fake processes only; no models, network or credentials."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("learner_entry", REPO / "ops/learner_entry.py")
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)


def diagnostic(root):
    return ("node:internal/modules/run_main:123\n    triggerUncaughtException(\n    ^\n\n"
        "Error: Transform failed with 1 error:\n"
        f'{root}/agent/src/core/config.ts:21:0: ERROR: Unexpected "<<"\n'
        f"    at failureErrorWithLog ({root}/agent/node_modules/esbuild/lib/main.js:1752:15) {{\n"
        "  name: 'TransformError'\n}\n\nNode.js v22.23.3\n").encode()


class Entry(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.state = self.root / "ops/state/learn.json"
        self.state.parent.mkdir(parents=True)
        self.batch = "20260101-000001-strategy-proposal"
        self.registration = {"state": "running", "pid": os.getpid(), "worktree": str(self.root),
                             "task": "strategy-proposal", "proposal_ids": ["original-proposal"]}
        self.save()
        self.out = self.root / "batch.out"
        self.err = self.root / "batch.err"
        self.command = ["/fixture/tsx", "/fixture/learner/run.ts", "--cwd", str(self.root),
                        "--set", "batch=" + self.batch, "--model", "gpt-6.1-sol", "--effort", "xhigh"]

    def save(self, **changes):
        self.state.write_text(json.dumps({"batches": {self.batch: {**self.registration, **changes}}}))

    def run_attempts(self, plans, pause=lambda _: None):
        calls = []

        class Child:
            def __init__(child, command, stdout, stderr):
                self.assertEqual(command, self.command)
                calls.append(command.copy())
                plan = plans[len(calls) - 1]
                stdout.write(plan.get("out", b""))
                stdout.flush()
                stderr.write(plan.get("err", b""))
                child.plan = plan

            def wait(child):
                child.plan.get("after", lambda: None)()
                return child.plan.get("rc", 1)

            def poll(child):
                return None

            def send_signal(child, sig):
                child.plan["signal"] = sig

        with patch.object(entry.subprocess, "Popen", Child):
            rc = entry.launch(str(self.root), str(self.root), self.batch, str(self.state),
                              self.out, self.err, self.command, pause=pause)
        return rc, calls

    def test_exact_pre_output_import_failure_replays_same_command_and_retains_failure(self):
        original = diagnostic(self.root)
        rc, calls = self.run_attempts([{"err": original}, {"rc": 0, "out": b"original-session\n"}])
        self.assertEqual((rc, len(calls)), (0, 2))
        self.assertEqual(self.err.read_bytes(), original)
        self.assertEqual(self.out.read_bytes(), b"original-session\n")
        rows = [json.loads(line) for line in Path(str(self.err) + ".entry.jsonl").read_text().splitlines()]
        self.assertEqual([row["retry"] for row in rows], [True, False])
        for field in ("batch", "lease", "command_sha256"):
            self.assertEqual(rows[0][field], rows[1][field])
        self.assertEqual(json.loads(self.state.read_text())["batches"][self.batch], self.registration)

    def test_persistent_conflict_stops_after_three_attempts(self):
        original = diagnostic(self.root)
        rc, calls = self.run_attempts([{"err": original}] * 3)
        self.assertEqual((rc, len(calls)), (1, 3))
        self.assertEqual(self.err.read_bytes(), original * 3)

    def test_unknown_or_post_output_failures_are_never_retried(self):
        original = diagnostic(self.root)
        for change in ({"out": b'{"type":"thread.started"}\n'}, {"out": b"unknown\n"},
                       {"rc": 2}, {"rc": -15}, {"err": b"login unavailable\n"},
                       {"err": original + b"unknown activity\n"},
                       {"err": original.replace(b'Unexpected "<<"', b'Unexpected "="')},
                       {"err": original.replace(b"core/config.ts", b"core/other.ts")},
                       {"err": original + b" " * entry.LIMIT}):
            with self.subTest(change=list(change)):
                rc, calls = self.run_attempts([{"err": original, **change}])
                self.assertEqual(len(calls), 1)
                self.assertNotEqual(rc, 0)

    def test_missing_changed_or_dead_registration_forbids_replay(self):
        for changes in ({"state": "lost"}, {"pid": 999999999}, {"finished": "fixed"},
                        {"cancelled": True}, {"rc": 0}, {"worktree": "/different"}):
            with self.subTest(changes=changes):
                self.save(**changes)
                _, calls = self.run_attempts([{"err": diagnostic(self.root)}])
                self.assertEqual(len(calls), 1)
        self.state.unlink()
        _, calls = self.run_attempts([{"err": diagnostic(self.root)}])
        self.assertEqual(len(calls), 1)

    def test_registration_change_during_failure_or_backoff_forbids_replay(self):
        for during_wait in (True, False):
            self.save()
            change = lambda: self.save(proposal_ids=["replacement-proposal"])
            _, calls = self.run_attempts([{"err": diagnostic(self.root),
                "after": change if during_wait else lambda: None}], pause=lambda _: change())
            self.assertEqual(len(calls), 1)

    def test_cancelled_child_is_signalled_by_pid_and_never_replayed(self):
        plan = {"err": diagnostic(self.root), "after": lambda: signal.raise_signal(signal.SIGTERM)}
        rc, calls = self.run_attempts([plan])
        self.assertEqual((rc, len(calls), plan["signal"]), (143, 1, signal.SIGTERM))

    def test_untrusted_registration_path_and_pid_reuse_fail_closed(self):
        self.assertIsNone(entry.lease_identity(self.root, self.root, self.batch, self.root / "learn.json"))
        identity = entry.lease_identity(self.root, self.root, self.batch, self.state)
        self.assertIsNotNone(identity)
        real_read = Path.read_text

        def changed_birth(path, *args, **kwargs):
            value = real_read(path, *args, **kwargs)
            if str(path) == f"/proc/{os.getpid()}/stat":
                head, tail = value.rsplit(")", 1)
                fields = tail.split()
                fields[19] = str(int(fields[19]) + 1)
                return head + ") " + " ".join(fields)
            return value

        with patch.object(Path, "read_text", changed_birth):
            self.assertNotEqual(entry.lease_identity(self.root, self.root, self.batch, self.state), identity)

    def test_cancellation_during_backoff_remains_terminal_when_registration_also_changes(self):
        def cancel(_):
            signal.raise_signal(signal.SIGTERM)
            self.save(state="lost")

        rc, calls = self.run_attempts([{"err": diagnostic(self.root)}], pause=cancel)
        self.assertEqual((rc, len(calls)), (143, 1))

    def test_shell_entry_uses_recovery_before_loading_the_shared_typescript_graph(self):
        # Exercise the actual wrapper with a fake tsx; no engine or credential preflight is bypassed in production.
        import test_learner_launch_failures as fixtures
        f = fixtures.LearnerLauncher()
        f.setUp()
        self.addCleanup(f.doCleanups)
        self.root = f.root
        batch = "20260101-000001-experience-update"
        state = f.root / "ops/codex-ops/learn.json"
        state.parent.mkdir(parents=True)
        registration = {"state": "running", "pid": os.getpid(), "worktree": str(f.root)}
        state.write_text(json.dumps({"batches": {batch: registration}}))
        fake = ("#!/usr/bin/python3\nimport json, pathlib, sys\n"
            f"root=pathlib.Path({str(f.root)!r})\n"
            "counter=root/'attempts'\nn=int(counter.read_text())+1 if counter.exists() else 1\n"
            "counter.write_text(str(n))\n"
            f"failure={diagnostic(f.root)!r}\n"
            "if n==1:\n sys.stderr.buffer.write(failure)\n sys.exit(1)\n"
            "print(json.dumps(sys.argv[1:]))\n")
        f.write_executable(f.root / "agent/node_modules/.bin/tsx", fake)
        result = subprocess.run(["bash", str(f.root / "ops/codex-ops-learner.sh"), batch,
            "FIXTURE000001", "silent", "experience-update", str(f.root)],
            env={**f.env, "LEARNER_CODEX_BIN": str(f.native)}, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((f.root / "attempts").read_text(), "2")
        args = json.loads((state.parent / "learner" / (batch + ".out")).read_text())
        self.assertEqual(args[0], str(f.root / "learner/run.ts"))
        self.assertEqual(args[args.index("--cwd") + 1], str(f.root))
        self.assertEqual(args[args.index("--model") + 1], "gpt-6.1-sol")
        self.assertEqual(args[args.index("--effort") + 1], "xhigh")
        self.assertEqual((state.parent / "learner" / (batch + ".err")).read_bytes(), diagnostic(f.root))
        self.assertEqual(json.loads(state.read_text())["batches"][batch], registration)


if __name__ == "__main__":
    unittest.main()
