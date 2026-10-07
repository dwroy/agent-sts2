"""Fixed process metadata and fake process operations; no game, network or real signals."""
import importlib.util
from pathlib import Path
import signal
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("reload", Path(__file__).resolve().parents[2] / "ops/autoplay-reload.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
ROOT = "/fixture"
LIVE = ROOT + "/.worktrees/live"


def row(pid, kind, uid=1000):
    argv = {"autoplay": ("/bin/bash", ROOT + "/ops/autoplay.sh"),
            "play": ("/bin/node", "--import", "/fixture/tsx.mjs", "src/index.ts", "play"),
            "report": ("python3", ROOT + "/ops/report.py", "FIXEDRUN0001"),
            "stop-after": ("bash", ROOT + "/ops/stop-after-a10.sh")}[kind]
    return {"pid": pid, "uid": uid, "start": str(pid * 10), "state": "S", "argv": argv,
            "cwd": LIVE + "/agent" if kind == "play" else ROOT}


class FakeRuntime(MODULE.Runtime):
    def __init__(self, failure=None):
        self.root, self.live, self.script = Path(ROOT), Path(LIVE), Path(ROOT + "/ops/autoplay.sh")
        self.uid = 1000
        self.processes = {10: row(10, "autoplay"), 20: row(20, "play")}
        self.calls = []
        self.failure = failure
        self.recorded = 10
        self.pending_term = False
        self.versions = 0
        self.starts = 0

    def rows(self):
        return list(self.processes.values())

    def preflight(self, old_pid):
        if self.recorded != old_pid or self.failure == "preflight":
            raise MODULE.ReloadError("preflight refused")

    def version(self):
        self.versions += 1
        return {"ops_commit": "a" * 40, "live_commit": "b" * 40,
                "autoplay_sha256": "changed" if self.failure == "version" and self.versions > 1 else "c" * 64}

    def send(self, target, sig):
        assert target["pid"] == 10, "only the verified old autoplay may receive signals"
        if not self.same(target):
            raise MODULE.ReloadError("identity changed")
        self.calls.append(["signal", target["pid"], sig.name])
        if sig == signal.SIGSTOP:
            self.processes[10]["state"] = "T"
        elif sig == signal.SIGTERM:
            if self.failure in ("terminate", "restore-fail"):
                raise OSError("term refused")
            self.pending_term = True
        elif sig == signal.SIGCONT:
            if self.pending_term and self.failure != "late-exit":
                del self.processes[10]
            else:
                self.processes[10]["state"] = "S"

    def wait(self, predicate):
        if not predicate():
            raise MODULE.ReloadError("confirmation timeout")

    def start(self, play_pid, old):
        assert play_pid == 20 and (10 not in self.processes or self.processes[10]["state"] == "T")
        assert old["pid"] == 10
        self.calls.append(["start", play_pid])
        self.starts += 1
        new_pid = 20 + self.starts * 10
        self.processes[new_pid] = row(new_pid, "autoplay")
        if self.failure == "startup":
            raise MODULE.ReloadError("startup failed")
        if self.failure == "interrupt":
            raise MODULE.ReloadError("broker interrupted")
        if self.failure == "play-reused":
            self.processes[20] = {**row(20, "play"), "start": "reused"}
        if self.failure == "old-reused":
            self.processes[10] = {**row(10, "autoplay"), "start": "reused"}
        if self.failure == "report-race":
            self.processes[40] = row(40, "report")
        return self.processes[new_pid].copy()

    def permit(self):
        self.calls.append(["permit"])

    def wait_active(self):
        self.calls.append(["active"])
        if self.failure == "active-exit" and self.starts == 1:
            self.processes.pop(30, None)
            raise MODULE.ReloadError("new exited before active")

    def publish(self, pid):
        self.calls.append(["publish", pid])
        if self.failure == "publish" or (self.failure == "restore-fail" and pid == 10):
            raise OSError("publish failed")
        self.recorded = pid

    def abort(self):
        self.calls.append(["abort-new"])
        self.processes.pop(30, None)

    def forget(self, pid):
        if self.recorded == pid:
            self.recorded = None

    def cleanup(self):
        self.calls.append(["cleanup"])


class ReloadTests(unittest.TestCase):
    def execute(self, runtime, old=10, play=20):
        with patch.object(MODULE, "process", side_effect=lambda pid: runtime.processes.get(pid)):
            return MODULE.reload_autoplay(runtime, old, play)

    def test_same_play_is_transferred_after_new_shell_acknowledges_and_receipt_pins_versions(self):
        runtime = FakeRuntime()
        original_play = runtime.processes[20].copy()
        receipt = self.execute(runtime)
        self.assertEqual(receipt, {"old_pid": 10, "play_pid": 20, "new_pid": 30,
                                  "ops_commit": "a" * 40, "live_commit": "b" * 40, "autoplay_sha256": "c" * 64})
        self.assertEqual(runtime.recorded, 30)
        self.assertNotIn(10, runtime.processes)
        self.assertEqual(runtime.processes[20], original_play)
        self.assertEqual(runtime.calls, [["signal", 10, "SIGSTOP"], ["start", 20], ["publish", 30],
                                        ["permit"], ["signal", 10, "SIGTERM"], ["signal", 10, "SIGCONT"], ["active"], ["cleanup"]])

    def test_rejects_foreign_owners_wrong_paths_and_missing_exact_processes(self):
        for pid, update in [(10, {"uid": 2000}), (20, {"uid": 2000}),
                            (10, {"argv": ("bash", "/other/ops/autoplay.sh")}),
                            (20, {"cwd": "/other/agent"}), (10, {"state": "Z"})]:
            with self.subTest(pid=pid, update=update):
                runtime = FakeRuntime()
                runtime.processes[pid].update(update)
                with self.assertRaises(MODULE.ReloadError):
                    self.execute(runtime)
                self.assertEqual(runtime.calls, [])
        for old, play in [(1, 20), (10, 0), (10, 10), (99, 20)]:
            with self.assertRaises(MODULE.ReloadError):
                self.execute(FakeRuntime(), old, play)

    def test_refuses_report_stop_after_and_duplicate_loops_or_play(self):
        for kind in ("report", "stop-after", "autoplay", "play"):
            with self.subTest(kind=kind):
                runtime = FakeRuntime()
                runtime.processes[40] = row(40, kind)
                with self.assertRaises(MODULE.ReloadError):
                    self.execute(runtime)
                self.assertEqual(runtime.calls, [])

    def test_node_launchers_are_not_independent_play_owners(self):
        runtime = FakeRuntime()
        runtime.processes[40] = {**row(40, "play"), "argv": (
            "node", "/fixture/npm/bin/npx-cli.js", "tsx", "src/index.ts", "play")}
        runtime.processes[50] = {**row(50, "play"), "argv": (
            "node", "/fixture/tsx/dist/cli.mjs", "src/index.ts", "play")}
        receipt = self.execute(runtime)
        self.assertEqual(receipt["play_pid"], 20)
        self.assertIsNone(runtime.kind(runtime.processes[40]))
        self.assertIsNone(runtime.kind(runtime.processes[50]))

    def test_pidfile_mismatch_and_preflight_failure_leave_old_loop_running(self):
        for failure in ("preflight", "pidfile"):
            runtime = FakeRuntime(failure)
            if failure == "pidfile":
                runtime.recorded = 99
            with self.assertRaises(MODULE.ReloadError):
                self.execute(runtime)
            self.assertEqual(runtime.calls, [])
            self.assertEqual(runtime.processes[10]["state"], "S")

    def test_precommit_failures_restore_old_loop_and_preserve_play(self):
        for failure in ("startup", "interrupt", "version", "publish", "terminate", "report-race", "play-reused"):
            with self.subTest(failure=failure):
                runtime = FakeRuntime(failure)
                with self.assertRaisesRegex(MODULE.ReloadError, "已恢复旧循环"):
                    self.execute(runtime)
                self.assertEqual(runtime.recorded, 10)
                self.assertEqual(runtime.processes[10]["state"], "S")
                self.assertIn(20, runtime.processes)
                self.assertNotIn(30, runtime.processes)
                self.assertIn(["abort-new"], runtime.calls)
                self.assertIn(["signal", 10, "SIGCONT"], runtime.calls)

    def test_a_late_old_exit_keeps_old_owner_and_stages_takeover_with_an_explicit_failure(self):
        runtime = FakeRuntime("late-exit")
        with self.assertRaisesRegex(MODULE.ReloadError, "交接待确认.*旧循环 PID 10.*新循环 PID 30"):
            self.execute(runtime)
        self.assertEqual(runtime.recorded, 30)
        self.assertEqual(runtime.processes[10]["state"], "S")
        self.assertIn(30, runtime.processes)
        self.assertNotIn(["abort-new"], runtime.calls)
        self.assertNotIn(["active"], runtime.calls)
        self.assertNotIn(["cleanup"], runtime.calls)

    def test_identity_checks_reject_pid_reuse_before_signalling(self):
        runtime = FakeRuntime()
        old = runtime.processes[10].copy()
        runtime.processes[10] = {**old, "start": "reused"}
        with patch.object(MODULE, "process", side_effect=lambda pid: runtime.processes.get(pid)):
            self.assertFalse(runtime.same(old))
            with self.assertRaises(MODULE.ReloadError):
                runtime.check(10, 20, old)
        runtime = FakeRuntime("old-reused")
        with self.assertRaisesRegex(MODULE.ReloadError, "未给替代 PID 发信号"):
            self.execute(runtime)
        self.assertNotIn(["signal", 10, "SIGCONT"], runtime.calls)
        self.assertNotIn(["signal", 10, "SIGTERM"], runtime.calls)

    def test_a_new_exit_after_retiring_old_explicitly_recovers_the_same_play(self):
        runtime = FakeRuntime("active-exit")
        with self.assertRaisesRegex(MODULE.ReloadError, "已恢复循环 PID 40，WAIT_PID=20"):
            self.execute(runtime)
        self.assertEqual(runtime.recorded, 40)
        self.assertIn(20, runtime.processes)
        self.assertNotIn(10, runtime.processes)
        self.assertEqual(runtime.calls.count(["start", 20]), 2)
        self.assertIn(["publish", 40], runtime.calls)

    def test_old_loop_resumes_even_if_restoring_the_pidfile_fails(self):
        runtime = FakeRuntime("restore-fail")
        with self.assertRaisesRegex(MODULE.ReloadError, "已恢复旧循环.*收尾需核实"):
            self.execute(runtime)
        self.assertEqual(runtime.processes[10]["state"], "S")
        self.assertNotIn(30, runtime.processes)
        self.assertIn(20, runtime.processes)


if __name__ == "__main__":
    unittest.main()
